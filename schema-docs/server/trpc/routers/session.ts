import { t } from '@schema/server/trpc/context';
import { sessionRouter as generatedSessionRouter } from './generated/session';

const customSessionRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionRouter = t.mergeRouters(generatedSessionRouter, customSessionRouter);
export type SessionRouter = typeof sessionRouter;
