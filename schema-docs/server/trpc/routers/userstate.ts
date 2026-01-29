import { t } from '../context';
import { userStateRouter as generatedUserStateRouter } from './generated/userstate';

const customUserStateRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userStateRouter = t.mergeRouters(generatedUserStateRouter, customUserStateRouter);
export type UserStateRouter = typeof userStateRouter;
