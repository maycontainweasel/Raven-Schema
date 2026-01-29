import { t } from '@schema/server/trpc/context';
import { communicationThreadRouter as generatedCommunicationThreadRouter } from './generated/communicationthread';

const customCommunicationThreadRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const communicationThreadRouter = t.mergeRouters(generatedCommunicationThreadRouter, customCommunicationThreadRouter);
export type CommunicationThreadRouter = typeof communicationThreadRouter;
