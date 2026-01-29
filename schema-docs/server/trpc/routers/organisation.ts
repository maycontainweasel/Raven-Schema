import { t } from '@schema/server/trpc/context';
import { organisationRouter as generatedOrganisationRouter } from './generated/organisation';

const customOrganisationRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const organisationRouter = t.mergeRouters(generatedOrganisationRouter, customOrganisationRouter);
export type OrganisationRouter = typeof organisationRouter;
