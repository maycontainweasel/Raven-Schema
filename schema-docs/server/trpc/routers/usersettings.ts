import { t } from '../context';
import { userSettingsRouter as generatedUserSettingsRouter } from './generated/usersettings';

const customUserSettingsRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userSettingsRouter = t.mergeRouters(generatedUserSettingsRouter, customUserSettingsRouter);
export type UserSettingsRouter = typeof userSettingsRouter;
