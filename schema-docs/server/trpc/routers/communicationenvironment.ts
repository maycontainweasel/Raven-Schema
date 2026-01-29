import { t } from '@schema/server/trpc/context';
import { communicationEnvironmentRouter as generatedCommunicationEnvironmentRouter } from './generated/communicationenvironment';

const customCommunicationEnvironmentRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const communicationEnvironmentRouter = t.mergeRouters(generatedCommunicationEnvironmentRouter, customCommunicationEnvironmentRouter);
export type CommunicationEnvironmentRouter = typeof communicationEnvironmentRouter;
