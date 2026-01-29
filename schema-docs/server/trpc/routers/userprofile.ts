import { t } from '@schema/server/trpc/context';
import { userProfileRouter as generatedUserProfileRouter } from './generated/userprofile';

const customUserProfileRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userProfileRouter = t.mergeRouters(generatedUserProfileRouter, customUserProfileRouter);
export type UserProfileRouter = typeof userProfileRouter;
