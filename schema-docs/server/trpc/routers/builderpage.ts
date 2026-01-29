import { t } from '@schema/server/trpc/context';
import { builderPageRouter as generatedBuilderPageRouter } from './generated/builderpage';

const customBuilderPageRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const builderPageRouter = t.mergeRouters(generatedBuilderPageRouter, customBuilderPageRouter);
export type BuilderPageRouter = typeof builderPageRouter;
