import { t } from '../context';
import { communicationTaxonomyRouter as generatedCommunicationTaxonomyRouter } from './generated/communicationtaxonomy';

const customCommunicationTaxonomyRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const communicationTaxonomyRouter = t.mergeRouters(generatedCommunicationTaxonomyRouter, customCommunicationTaxonomyRouter);
export type CommunicationTaxonomyRouter = typeof communicationTaxonomyRouter;
