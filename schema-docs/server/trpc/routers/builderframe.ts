import { t } from '@schema/server/trpc/context';
import { builderFrameRouter as generatedBuilderFrameRouter } from './generated/builderframe';

const customBuilderFrameRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const builderFrameRouter = t.mergeRouters(generatedBuilderFrameRouter, customBuilderFrameRouter);
export type BuilderFrameRouter = typeof builderFrameRouter;
