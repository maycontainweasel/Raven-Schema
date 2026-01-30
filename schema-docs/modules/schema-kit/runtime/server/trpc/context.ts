import type { H3Event } from 'h3'
import { TRPCError } from '@trpc/server'
import { Surreal } from 'surrealdb'
import { readSession } from '@schema/server/auth/session'
import { getSurrealClient } from '@schema/server/plugins/surrealdb.server'
import { LR, LRS } from '@schema/utils/lrs'
import { dbInstances, defaultDbInstance } from '@schema/db'
import {
  t,
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  transformer,
} from '@schema/server/trpc'

export type ContextExt = Record<string, unknown>

const loadContextExtension = async () => {
  try {
    return await import('~~/schema/context/trpc')
  } catch {
    return null
  }
}

export async function createContext(event: H3Event) {
  const se =
    (event as any).context?.SE ||
    (typeof globalThis.$SE === 'function' ? globalThis.$SE : undefined)

  let db
  try {
    db = getSurrealClient()
  } catch (e: any) {
    se?.(new Error(`Surreal not initialised: ${e?.message || e}`), { where: 'schema-kit.createContext' })
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SurrealDB unavailable' })
  }

  const redis = await resolveRedis()

  const session = await readSession(event).catch((e: any) => {
    se?.(new Error(`readSession failed: ${e?.message || e}`), { where: 'schema-kit.createContext' })
    return null
  })

  const api = {
    query: (query: string, vars?: Record<string, any>) => db.query(query, vars),
    DB: (instance: string) => getInstanceDB(instance),
  }

  const base = {
    event,
    session,
    db,
    redis,
    se,
    SE: se,
    $api: api,
    LR,
    LRS,
  }

  const ext = await loadContextExtension()
  const extra: ContextExt = ext?.createContextExt
    ? await ext.createContextExt(event, base)
    : {}

  return { ...base, ...extra }
}

export type Ctx = Awaited<ReturnType<typeof createContext>>

export { t, router, publicProcedure, protectedProcedure, adminProcedure, transformer }

async function resolveRedis() {
  try {
    const mod = await import('@schema/server/plugins/redis.server')
    return mod.getRedis()
  } catch {
    return undefined
  }
}

const instanceCache = new Map<string, Surreal>()

async function getInstanceDB(instance?: string): Promise<Surreal> {
  const key = instance || (defaultDbInstance as string) || 'pm'
  if (key === (defaultDbInstance as string) || key === 'pm') {
    try {
      return getSurrealClient()
    } catch {
      // fall through to manual connection
    }
  }
  if (instanceCache.has(key)) {
    return instanceCache.get(key) as Surreal
  }
  const cfg = (dbInstances as Record<string, any>)[key]
  if (!cfg) {
    throw new Error(`Unknown database instance "${key}"`)
  }
  const client = new Surreal()
  await client.connect(`${cfg.url}/rpc`)
  await client.signin({ username: cfg.username, password: cfg.password })
  await client.use({ namespace: cfg.namespace, database: cfg.database })
  instanceCache.set(key, client)
  return client
}
