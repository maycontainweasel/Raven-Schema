// packages/pmv2shared/trpc/base.ts
import { initTRPC, TRPCError } from '@trpc/server'
import type { Ctx } from './context'
import superjson from 'superjson'

// Configure SuperJSON with RecordId handling
export const transformer = superjson

const isSurrealRecordIdLike = (v: any) => {
  if (!v || typeof v !== 'object') return false
  const ctor = v.constructor?.name
  if (ctor === '_RecordId' || ctor === 'RecordId') return true
  if ('tb' in v && 'id' in v) return true
  if (!('table' in v) || !('id' in v)) return false
  const table = (v as any).table
  return typeof table === 'string' || typeof table?.name === 'string'
}

const recordIdTable = (v: any): string => {
  if ('tb' in v) return String(v.tb)
  const table = (v as any).table
  return String(typeof table === 'string' ? table : table?.name ?? '')
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}

const serializeNestedRecordIds = (value: any): any => {
  if (isSurrealRecordIdLike(value)) {
    return {
      tb: recordIdTable(value),
      id: serializeNestedRecordIds(value.id),
    }
  }
  if (Array.isArray(value)) {
    return value.map(item => serializeNestedRecordIds(item))
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializeNestedRecordIds(nested)]),
    )
  }
  return value
}

// Surreal RecordId codec (keeps { tb, id } across the wire)
transformer.registerCustom<any, { tb: string; id: any }>(
  {
    isApplicable: (v: any) => isSurrealRecordIdLike(v),
    serialize: (v: any) => {
      return {
        tb: recordIdTable(v),
        id: serializeNestedRecordIds(v.id),
      }
    },
    // we deliberately keep it a plain object on the client
    deserialize: (v) => v,
  },
  'SurrealRecordId'
)

export const t = initTRPC.context<Ctx>().create({
  transformer,
})

/** Request/response logging + Sentry capture on error */
export const errorHandler = t.middleware(async ({ ctx, next, path, type, input }) => {
  const start = Date.now()
  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
  try {
    const out = await next()
    const ms = Date.now() - start
    if (ms > 500) {
      console.warn(`[tRPC] slow ${type} ${path} (${ms}ms)`, { reqId })
    }
    return out
  } catch (err: any) {
    const ms = Date.now() - start
    console.error(`[tRPC] ${type} ${path} threw after ${ms}ms:`, err?.message || err, { reqId })
    ctx.se?.(err instanceof Error ? err : new Error(String(err)), {
      component: 'trpc',
      path,
      type,
      durationMs: String(ms),
    })
    throw err
  }
})

/** Auth guards */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.uid) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' })
  }
  return next()
})

const requireRole = (roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    const userRoles = ctx.session?.roles || []
    const ok = userRoles.some((r) => roles.includes(r))
    if (!ok) throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient role' })
    return next()
  })

/** Export helpers */
export const router = t.router
export const mergeRouters = t.mergeRouters
export const publicProcedure = t.procedure.use(errorHandler)
export const protectedProcedure = publicProcedure.use(isAuthed)
export const adminProcedure = protectedProcedure.use(requireRole(['admin', 'superuser']))
export const teacherProcedure = protectedProcedure.use(requireRole(['teacher', 'admin', 'superuser']))
export const studentProcedure = protectedProcedure.use(requireRole(['student', 'teacher', 'admin', 'superuser']))

export type { Ctx } from './context'
