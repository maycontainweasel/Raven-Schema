import { Surreal } from 'surrealdb'
import { eventHandler } from 'h3'

declare global {
  // eslint-disable-next-line no-var
  var surrealDb: Surreal | undefined
}

type Cfg = {
  url: string
  namespace: string
  database: string
  user: string
  pass: string
}

type FeatureCfg = {
  reconnectOnAuthLoss: boolean
  retryFailedRequestsAfterReconnect: boolean
}

function readRuntimeCfg(): any {
  return typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}
}

function readConfig(): Cfg {
  const rc = readRuntimeCfg()
  const s = rc?.surrealdb || {}
  return {
    url: s.url || process.env.NUXT_SURREALDB_URL || '',
    namespace: s.namespace || process.env.NUXT_SURREALDB_NAMESPACE || '',
    database: s.database || process.env.NUXT_SURREALDB_DATABASE || '',
    user: s.user || process.env.NUXT_SURREALDB_USER || '',
    pass: s.pass || process.env.NUXT_SURREALDB_PASS || '',
  }
}

function readFeatureConfig(): FeatureCfg {
  const rc = readRuntimeCfg()
  const raw = rc?.schemaKit?.features?.surrealdb
  if (raw === false) {
    return {
      reconnectOnAuthLoss: false,
      retryFailedRequestsAfterReconnect: false,
    }
  }
  if (!raw || raw === true) {
    return {
      reconnectOnAuthLoss: true,
      retryFailedRequestsAfterReconnect: true,
    }
  }
  return {
    reconnectOnAuthLoss: raw.reconnectOnAuthLoss !== false,
    retryFailedRequestsAfterReconnect: raw.retryFailedRequestsAfterReconnect !== false,
  }
}

function getErrorMessage(error: any): string {
  return String(error?.message || error || '')
}

function isRecoverableAuthLoss(error: any): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('token has expired') ||
    message.includes('jwt expired') ||
    message.includes('expired token') ||
    message.includes('anonymous access not allowed') ||
    (message.includes('not enough permissions to perform this action') &&
      message.includes('anonymous'))
  )
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string) {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`[surrealdb] ${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

function createSurrealDBServerPlugin(appName: string) {
  return defineNitroPlugin(async (nitroApp) => {
    // attach a getter on every request (for API/tRPC)
    nitroApp.h3App.use(
      eventHandler((event) => {
        // @ts-expect-error augment context at runtime
        event.context.surreal = getSurrealClientSafe()
      })
    )

    if (globalThis.surrealDb) return

    const cfg = readConfig()
    const featureCfg = readFeatureConfig()
    if (!cfg.url) {
      throw new Error('surrealdb: NUXT_SURREALDB_URL is not set')
    }
    if (!cfg.namespace || !cfg.database || !cfg.user || !cfg.pass) {
      throw new Error('[surrealdb] Missing connection config; plugin did not initialise.')
    }

    // Early proxy sanity
    try {
      // @ts-ignore
      if (typeof $fetch === 'function') {
        // @ts-ignore
        await withTimeout($fetch(`${cfg.url}/version`), 5000, 'GET /version')
      }
    } catch (e: any) {
      console.error(
        '[surrealdb] Failed to reach /version:',
        e?.message || e,
        '\nEnsure your proxy forwards /version and /rpc to SurrealDB (not Nuxt).'
      )
    }

    const client = new Surreal()

    const signin = async () => {
      await withTimeout(client.connect(`${cfg.url}/rpc`), 7000, 'connect')
      await withTimeout(client.signin({ username: cfg.user, password: cfg.pass }), 7000, 'signin')
      await withTimeout(client.use({ namespace: cfg.namespace, database: cfg.database }), 5000, 'use(ns,db)')
    }

    // single-flight reauth
    let reauthPromise: Promise<void> | null = null
    const ensureSignedInOnce = () => {
      if (!reauthPromise) {
        reauthPromise = (async () => {
          try { await signin() } finally { reauthPromise = null }
        })()
      }
      return reauthPromise
    }

    try {
      await signin()
      console.info('[surrealdb] Connected successfully')
    } catch (e: any) {
      const msg = getErrorMessage(e)
      console.error('[surrealdb] Initial connection failed:', msg)
      try { globalThis.$SE?.(new Error(`Surreal initial connect failed: ${msg}`), { app: appName }) } catch {}
      throw e
    }

    const reportFailure = (message: string) => {
      try { globalThis.$SE?.(new Error(message), { app: appName }) } catch {}
    }

    const OPERATION_TIMEOUT_MS = 30000
    const wrapClientMethod = (methodName: string) => {
      const original = (client as any)[methodName]
      if (typeof original !== 'function') return
      const bound = original.bind(client)
      ;(client as any)[methodName] = async (...args: any[]) => {
        try {
          return await withTimeout(bound(...args), OPERATION_TIMEOUT_MS, methodName)
        } catch (error: any) {
          if (!featureCfg.reconnectOnAuthLoss || !isRecoverableAuthLoss(error)) {
            reportFailure(`Surreal ${methodName} failed: ${getErrorMessage(error)}`)
            throw error
          }

          console.warn(
            `[surrealdb] Auth session lost during ${methodName}; reconnecting and retrying once...`
          )

          try {
            await ensureSignedInOnce()
          } catch (reauthError: any) {
            console.error('[surrealdb] Re-signin failed:', getErrorMessage(reauthError))
            reportFailure(
              `Surreal reauth failed after ${methodName}: ${getErrorMessage(reauthError)}`
            )
            throw reauthError
          }

          if (featureCfg.retryFailedRequestsAfterReconnect === false) {
            throw error
          }

          try {
            return await withTimeout(bound(...args), OPERATION_TIMEOUT_MS, `${methodName}(retry)`)
          } catch (retryError: any) {
            console.error(
              `[surrealdb] Retry after re-signin failed for ${methodName}:`,
              getErrorMessage(retryError)
            )
            reportFailure(
              `Surreal ${methodName} retry failed after reauth: ${getErrorMessage(retryError)}`
            )
            throw retryError
          }
        }
      }
    }

    for (const methodName of [
      'query',
      'select',
      'create',
      'update',
      'merge',
      'patch',
      'delete',
      'insert',
      'upsert',
    ]) {
      wrapClientMethod(methodName)
    }

    const KEEPALIVE_MS = 45 * 60 * 1000
    const timer = setInterval(async () => {
      try { await client.query('RETURN 1') } catch (err: any) {
        console.warn('[surrealdb] Keepalive error:', getErrorMessage(err))
      }
    }, KEEPALIVE_MS)
    // @ts-ignore
    if (typeof timer.unref === 'function') timer.unref()

    globalThis.surrealDb = client
  })
}

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createSurrealDBServerPlugin(appName)(nitroApp)
})

export function getSurrealClient(): Surreal {
  const c = globalThis.surrealDb
  if (!c) throw new Error('SurrealDB not initialised')
  return c
}

export function getSurrealClientSafe(): Surreal | undefined {
  return globalThis.surrealDb
}
