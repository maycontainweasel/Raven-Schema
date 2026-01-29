import { t } from '@schema/server/trpc/context';
import { attemptRouter as generatedAttemptRouter } from './generated/attempt';

const customAttemptRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const attemptRouter = t.mergeRouters(generatedAttemptRouter, customAttemptRouter);
export type AttemptRouter = typeof attemptRouter;
