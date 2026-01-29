import { t } from '@schema/server/trpc/context';
import { communicationCategoryRouter as generatedCommunicationCategoryRouter } from './generated/communicationcategory';

const customCommunicationCategoryRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const communicationCategoryRouter = t.mergeRouters(generatedCommunicationCategoryRouter, customCommunicationCategoryRouter);
export type CommunicationCategoryRouter = typeof communicationCategoryRouter;
