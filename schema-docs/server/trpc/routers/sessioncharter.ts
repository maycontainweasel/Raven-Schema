import { t } from '@schema/server/trpc/context';
import { sessionCharterRouter as generatedSessionCharterRouter } from './generated/sessioncharter';

const customSessionCharterRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionCharterRouter = t.mergeRouters(generatedSessionCharterRouter, customSessionCharterRouter);
export type SessionCharterRouter = typeof sessionCharterRouter;
