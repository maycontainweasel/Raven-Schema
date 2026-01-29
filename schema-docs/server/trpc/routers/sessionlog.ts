import { t } from '@schema/server/trpc/context';
import { sessionLogRouter as generatedSessionLogRouter } from './generated/sessionlog';

const customSessionLogRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionLogRouter = t.mergeRouters(generatedSessionLogRouter, customSessionLogRouter);
export type SessionLogRouter = typeof sessionLogRouter;
