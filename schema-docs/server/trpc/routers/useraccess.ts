import { t } from '../context';
import { userAccessRouter as generatedUserAccessRouter } from './generated/useraccess';

const customUserAccessRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userAccessRouter = t.mergeRouters(generatedUserAccessRouter, customUserAccessRouter);
export type UserAccessRouter = typeof userAccessRouter;
