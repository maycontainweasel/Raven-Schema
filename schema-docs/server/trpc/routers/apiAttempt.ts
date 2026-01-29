import { z } from 'zod';
import { t } from '@schema/server/trpc/context';
import { RequestSchema } from '@schema';

const ApiAttemptCreateInput = z.object({
  endpoint: z.string(),
  method: z.enum(['query', 'mutate']),
  data: z.any(),
  instances: z.array(z.string()).optional().default([]),
  rootInstance: z.string().optional(),
  bypassMothership: z.boolean().optional(),
  dataLocation: z.enum(['local', 'remote']).optional(),
  status: z.enum(['pending', 'success', 'partial', 'failed']).optional(),
  results: z.any().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  meta: z.record(z.string(), z.any()).optional(),
}).passthrough();

const ApiAttemptUpdateInput = z.object({
  id: z.string().min(1),
  payload: z.record(z.string(), z.any()),
});

const ApiAttemptFinalizeInput = z.object({
  id: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional(),
  results: z.any().optional(),
});

const ApiAttemptListInput = z.object({
  status: z.string().optional(),
  limit: z.number().min(1).max(200).optional(),
  start: z.number().min(0).optional(),
});

const resolveStatus = (payload?: any) => {
  if (payload?.status) return payload.status as string;
  const failed = payload?.results?.failed?.length ?? 0;
  const success = payload?.results?.success?.length ?? 0;
  if (failed > 0 && success > 0) return 'partial';
  if (failed > 0) return 'failed';
  if (success > 0) return 'success';
  return 'pending';
};

export const apiAttemptRouter = t.router({
  create: t.procedure
    .input(RequestSchema(ApiAttemptCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = {
        ...input.data,
        status: input.data?.status ?? 'pending',
        startedAt: input.data?.startedAt ?? new Date().toISOString(),
      };
      const query = /* surql */ `
        CREATE apiAttempt CONTENT $payload;
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(ApiAttemptUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('apiAttempt.update requires id and payload');
      }
      const query = /* surql */ `
        LET $rid = type::record('apiAttempt', $id);
        UPDATE $rid MERGE $payload RETURN AFTER;
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  finalize: t.procedure
    .input(RequestSchema(ApiAttemptFinalizeInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload, results } = input.data || { id: undefined, payload: undefined, results: undefined };
      if (!id) {
        throw new Error('apiAttempt.finalize requires id');
      }
      const mergedResults = results ?? (payload as any)?.results;
      const finalPayload = {
        ...(payload || {}),
        results: mergedResults,
        status: resolveStatus({ ...(payload || {}), results: mergedResults }),
        endedAt: payload?.endedAt ?? new Date().toISOString(),
      };
      const query = /* surql */ `
        LET $rid = type::record('apiAttempt', $id);
        UPDATE $rid MERGE $payload RETURN AFTER;
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload: finalPayload }));
      return result;
    }),
  list: t.procedure
    .input(RequestSchema(ApiAttemptListInput.optional()))
    .query(async ({ input, ctx }) => {
      const { db } = ctx;
      const dbInstance = input?.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { status, limit = 50, start = 0 } = input?.data || {};
      const filter = status ? `WHERE status = $status` : '';
      const query = /* surql */ `
        SELECT * FROM apiAttempt ${filter} ORDER BY startedAt DESC LIMIT $limit START $start;
      `;
      const result = await dbInstance.query(query, { status, limit, start });
      return Array.isArray(result?.[0]) ? result[0] : result;
    }),
});

export type ApiAttemptRouter = typeof apiAttemptRouter;
