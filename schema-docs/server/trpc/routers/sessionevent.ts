import { t } from '@schema/server/trpc/context';
import { sessionEventRouter as generatedSessionEventRouter } from './generated/sessionevent';

const customSessionEventRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionEventRouter = t.mergeRouters(generatedSessionEventRouter, customSessionEventRouter);
export type SessionEventRouter = typeof sessionEventRouter;
