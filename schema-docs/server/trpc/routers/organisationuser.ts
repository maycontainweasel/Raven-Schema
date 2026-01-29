import { t } from '@schema/server/trpc/context';
import { organisationUserRouter as generatedOrganisationUserRouter } from './generated/organisationuser';

const customOrganisationUserRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const organisationUserRouter = t.mergeRouters(generatedOrganisationUserRouter, customOrganisationUserRouter);
export type OrganisationUserRouter = typeof organisationUserRouter;
