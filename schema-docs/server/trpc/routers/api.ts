import { z } from 'zod'
import { t } from '../context'
import { RequestSchema } from '@schema/request-schema'

const DbQueryInput = z.object({
  query: z.string().min(1),
  vars: z.record(z.string(), z.any()).optional(),
})

const dbRouter = t.router({
  query: t.procedure
    .input(RequestSchema(DbQueryInput))
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx as any
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db
      const payload = input.data || {}
      if (!payload?.query) {
        throw new Error('api.db.query requires a query string')
      }
      return dbInstance.query(payload.query, payload.vars ?? {})
    }),
})

export const apiRouter = t.router({
  db: dbRouter,
})
