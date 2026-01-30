import type { RedisOptions } from 'ioredis'
import Redis from 'ioredis'
import { eventHandler } from 'h3'

declare global {
  // eslint-disable-next-line no-var
  var __PMV2_REDIS__: Redis | undefined
}

type Cfg = {
  host: string
  port: number
  password?: string
  fileLoggingEnabled?: boolean
}

type SrcTag = 'env:NUXT_REDIS_*' | 'env:NUXT_REDIS__*' | 'env:REDIS_*' | 'rc' | 'default'
type Src = { host: SrcTag; port: SrcTag; password: SrcTag; fileLoggingEnabled: SrcTag }

function readConfigWithSources(): { cfg: Cfg; src: Src } {
  const rc: any = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}
  const r = rc?.redis || {}

  // Prefer runtime env (supports NUXT_REDIS_* or legacy NUXT_REDIS__* / REDIS_*), then rc, then default
  const nuxtHost = process.env.NUXT_REDIS_HOST ?? process.env.NUXT_REDIS__HOST
  const plainHost = process.env.REDIS_HOST
  const host = (nuxtHost || plainHost || r.host || 'localhost') as string
  const hostSrc: SrcTag = nuxtHost
    ? (process.env.NUXT_REDIS_HOST ? 'env:NUXT_REDIS_*' : 'env:NUXT_REDIS__*')
    : plainHost
      ? 'env:REDIS_*'
      : r.host ? 'rc' : 'default'

  const nuxtPort = process.env.NUXT_REDIS_PORT ?? process.env.NUXT_REDIS__PORT
  const plainPort = process.env.REDIS_PORT
  const portRaw = (nuxtPort ?? plainPort ?? r.port ?? 6379) as any
  const port = Number(portRaw)
  const portSrc: SrcTag = nuxtPort
    ? (process.env.NUXT_REDIS_PORT ? 'env:NUXT_REDIS_*' : 'env:NUXT_REDIS__*')
    : plainPort
      ? 'env:REDIS_*'
      : r.port ? 'rc' : 'default'

  const nuxtPwd = process.env.NUXT_REDIS_PASSWORD ?? process.env.NUXT_REDIS__PASSWORD
  const plainPwd = process.env.REDIS_PASSWORD
  const password = (nuxtPwd ?? plainPwd ?? r.password ?? '') as string
  const passwordSrc: SrcTag = nuxtPwd
    ? (process.env.NUXT_REDIS_PASSWORD ? 'env:NUXT_REDIS_*' : 'env:NUXT_REDIS__*')
    : plainPwd
      ? 'env:REDIS_*'
      : r.password ? 'rc' : 'default'

  const nuxtFileLog = process.env.NUXT_REDIS_FILE_LOGGING_ENABLED ?? process.env.NUXT_REDIS__FILE_LOGGING_ENABLED
  const fileLoggingEnabled =
    nuxtFileLog !== undefined
      ? nuxtFileLog === 'true'
      : (r.fileLoggingEnabled ?? false)
  const fileLogSrc: SrcTag = nuxtFileLog !== undefined
    ? (process.env.NUXT_REDIS_FILE_LOGGING_ENABLED ? 'env:NUXT_REDIS_*' : 'env:NUXT_REDIS__*')
    : r.fileLoggingEnabled !== undefined ? 'rc' : 'default'

  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`[redis] REDIS_PORT must be 1-65535, got: ${portRaw}`)
  }

  return {
    cfg: { host, port, password: password || undefined, fileLoggingEnabled },
    src: { host: hostSrc, port: portSrc, password: passwordSrc, fileLoggingEnabled: fileLogSrc },
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string) {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`[redis] ${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

function createRedisServerPlugin(appName: string) {
  return defineNitroPlugin(async (nitroApp) => {
    // attach to each request for API/tRPC convenience
    nitroApp.h3App.use(
      eventHandler((event) => {
        // @ts-expect-error augment context at runtime
        event.context.redis = globalThis.__PMV2_REDIS__
      })
    )

    if (globalThis.__PMV2_REDIS__) return

    const { cfg, src } = readConfigWithSources()

    // One-line startup log with sources (no secrets)
    console.log(
      `[redis] startup → ${cfg.host}:${cfg.port} ` +
      `(src host=${src.host}, port=${src.port}, pwd=${src.password}, fileLog=${src.fileLoggingEnabled})`
    )

    const opts: RedisOptions = {
      host: cfg.host,
      port: cfg.port,
      password: cfg.password,
      lazyConnect: true,
      connectTimeout: 10_000,
      commandTimeout: 5_000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      keepAlive: 30_000,
      family: 4,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000)
        console.log(`[redis] retry #${times}, delay ${delay}ms`)
        return delay
      },
    }

    const redis = new Redis(opts)

    // event hooks
    redis.on('connect', () => console.log(`[redis] connected ${cfg.host}:${cfg.port}`))
    redis.on('ready', () => console.log('[redis] ready'))
    redis.on('close', () => console.warn('[redis] connection closed'))
    redis.on('reconnecting', (ms) => console.log(`[redis] reconnecting in ${ms}ms`))
    redis.on('end', () => console.warn('[redis] connection ended'))
    redis.on('error', (err: Error) => {
      console.error('[redis] error:', err.message)
      try {
        globalThis.$SE?.(err, {
          component: 'redis',
          app: appName,
          host: cfg.host,
          port: String(cfg.port),
        })
      } catch {}
    })

    // try initial connect (fail-fast in prod; warn in dev)
    try {
      await withTimeout(redis.connect(), 10_000, 'connect')
    } catch (e: any) {
      const msg = e?.message || String(e)
      console.error('[redis] initial connect failed:', msg)
      try {
        globalThis.$SE?.(new Error(`Redis initial connect failed: ${msg}`), {
          app: appName,
          host: cfg.host,
          port: String(cfg.port),
        })
      } catch {}
      // leave instance in lazy state; app code can trigger reconnects
    }

    // expose globally
    globalThis.__PMV2_REDIS__ = redis
    console.log('[redis] plugin initialised')
  })
}

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createRedisServerPlugin(appName)(nitroApp)
})

/** Strong getter: throws if not initialised */
export function getRedis(): Redis {
  const r = globalThis.__PMV2_REDIS__
  if (!r) throw new Error('Redis not initialised')
  return r
}

/** Safe getter: undefined if not ready */
export function getRedisSafe(): Redis | undefined {
  return globalThis.__PMV2_REDIS__
}

/** Ensure connected/ready (best-effort) */
export async function ensureRedisReady(): Promise<boolean> {
  const r = getRedis()
  if (r.status !== 'ready') {
    try {
      await r.connect()
    } catch {}
  }
  return r.status === 'ready'
}

/** Health check with ping + rw test + info parsing */
export async function checkRedisHealth(): Promise<{
  connected: boolean
  responseTime?: number
  error?: string
  info?: { version?: string; uptime?: string }
}> {
  const r = getRedis()
  const start = Date.now()
  try {
    await withTimeout(r.ping(), 1500, 'PING')
    const key = `health_${Date.now()}`
    await withTimeout(r.set(key, 'ok', 'EX', 5), 1500, 'SET')
    const v = await withTimeout(r.get(key), 1500, 'GET')
    await withTimeout(r.del(key), 1500, 'DEL')
    if (v !== 'ok') throw new Error('rw mismatch')

    const info = await withTimeout(r.info('server'), 2000, 'INFO')
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1]
    const uptime = info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1]
    return { connected: true, responseTime: Date.now() - start, info: { version, uptime } }
  } catch (e: any) {
    return { connected: false, responseTime: Date.now() - start, error: e?.message || String(e) }
  }
}

/** Graceful disconnect */
export async function disconnectRedis(): Promise<void> {
  try {
    const r = getRedis()
    console.log('[redis] quitting…')
    await r.quit()
    console.log('[redis] quit OK')
  } catch (e: any) {
    console.error('[redis] quit failed – forcing disconnect:', e?.message || e)
    getRedis().disconnect()
  }
}
