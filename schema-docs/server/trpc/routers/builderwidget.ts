import { t } from '@schema/server/trpc/context';
import { builderWidgetRouter as generatedBuilderWidgetRouter } from './generated/builderwidget';

const customBuilderWidgetRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const builderWidgetRouter = t.mergeRouters(generatedBuilderWidgetRouter, customBuilderWidgetRouter);
export type BuilderWidgetRouter = typeof builderWidgetRouter;
