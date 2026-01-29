import { z } from 'zod';
import { t } from '@schema/server/trpc/context';
import { RequestSchema } from '@schema/request-schema';

const UpdatePostStatusInput = z.object({
  recordId: z.object({ tb: z.string(), id: z.any() }),
  status: z.enum(['draft', 'publish']),
});

export const adminRouter = t.router({
  updatePostStatus: t.procedure
    .input(RequestSchema(UpdatePostStatusInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { recordId, status } = input.data || { recordId: undefined, status: undefined };
      if (!recordId || !(recordId as any).id || !(recordId as any).tb) {
        throw new Error('admin updatePostStatus requires recordId');
      }
      if (!status) {
        throw new Error('admin updatePostStatus requires status');
      }
      const query = /* surql */ `
        let $rid = type::record($tb, $id);
        RETURN fn::updateAdminPostStatus($rid, $status);
      `;
      const result = await LRS(await dbInstance.query(query, { tb: (recordId as any).tb, id: (recordId as any).id, status }));
      return result;
    }),
});
