import { t } from '@schema/server/trpc/context';
import { instanceSettingsRouter as generatedInstanceSettingsRouter } from './generated/instancesettings';

const customInstanceSettingsRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const instanceSettingsRouter = t.mergeRouters(generatedInstanceSettingsRouter, customInstanceSettingsRouter);
export type InstanceSettingsRouter = typeof instanceSettingsRouter;
