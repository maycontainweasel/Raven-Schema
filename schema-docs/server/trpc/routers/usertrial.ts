import { t } from '../context';
import { userTrialRouter as generatedUserTrialRouter } from './generated/usertrial';

const customUserTrialRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userTrialRouter = t.mergeRouters(generatedUserTrialRouter, customUserTrialRouter);
export type UserTrialRouter = typeof userTrialRouter;
