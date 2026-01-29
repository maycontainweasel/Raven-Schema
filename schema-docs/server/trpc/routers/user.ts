import { t } from '@schema/server/trpc/context';
import { userRouter as generatedUserRouter } from './generated/user';

const customUserRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userRouter = t.mergeRouters(generatedUserRouter, customUserRouter);
export type UserRouter = typeof userRouter;
