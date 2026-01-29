import { t } from '@schema/server/trpc/context';
import { adminRouter as generatedAdminRouter } from './generated/admin';

const customAdminRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const adminRouter = t.mergeRouters(generatedAdminRouter, customAdminRouter);
export type AdminRouter = typeof adminRouter;
