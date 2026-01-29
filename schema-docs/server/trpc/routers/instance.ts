import { t } from '@schema/server/trpc/context';
import { instanceRouter as generatedInstanceRouter } from './generated/instance';

const customInstanceRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const instanceRouter = t.mergeRouters(generatedInstanceRouter, customInstanceRouter);
export type InstanceRouter = typeof instanceRouter;
