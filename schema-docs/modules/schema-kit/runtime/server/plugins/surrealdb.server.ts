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

function readConfig(): Cfg {
  const rc: any =
    typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}
  const s = rc?.surrealdb || {}
  return {
    url: s.url || process.env.NUXT_SURREALDB_URL || '',
    namespace: s.namespace || process.env.NUXT_SURREALDB_NAMESPACE || '',
    database: s.database || process.env.NUXT_SURREALDB_DATABASE || '',
    user: s.user || process.env.NUXT_SURREALDB_USER || '',
    pass: s.pass || process.env.NUXT_SURREALDB_PASS || '',
  }
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
      const msg = e?.message || String(e)
      console.error('[surrealdb] Initial connection failed:', msg)
      try { globalThis.$SE?.(new Error(`Surreal initial connect failed: ${msg}`), { app: appName }) } catch {}
      throw e
    }

    // wrap query: timeout + one retry on expired token
    const originalQuery = client.query.bind(client)
    client.query = (async (...args: any[]) => {
      try {
        return await withTimeout(originalQuery(...(args as [any])), 30000, 'query')
      } catch (e: any) {
        const msg = String(e?.message || e).toLowerCase()
        const expired = msg.includes('token has expired') || msg.includes('jwt expired') || msg.includes('expired token')
        if (expired) {
          console.warn('[surrealdb] JWT expired; re-signing in and retrying once...')
          try {
            await ensureSignedInOnce()
            return await withTimeout(originalQuery(...(args as [any])), 30000, 'query(retry)')
          } catch (e2: any) {
            console.error('[surrealdb] Re-signin + retry failed:', e2?.message || e2)
            try { globalThis.$SE?.(new Error(`Surreal reauth+retry failed: ${e2?.message || e2}`), { app: appName }) } catch {}
            throw e2
          }
        }
        try { globalThis.$SE?.(new Error(`Surreal query failed: ${e?.message || e}`), { app: appName }) } catch {}
        throw e
      }
    }) as typeof client.query

    const KEEPALIVE_MS = 45 * 60 * 1000
    const timer = setInterval(async () => {
      try { await client.query('RETURN 1') } catch (err: any) {
        console.warn('[surrealdb] Keepalive error:', err?.message || err)
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
