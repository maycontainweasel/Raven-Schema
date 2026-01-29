import { t } from '@schema/server/trpc/context';
import { communicationMessageRouter as generatedCommunicationMessageRouter } from './generated/communicationmessage';

const customCommunicationMessageRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const communicationMessageRouter = t.mergeRouters(generatedCommunicationMessageRouter, customCommunicationMessageRouter);
export type CommunicationMessageRouter = typeof communicationMessageRouter;
