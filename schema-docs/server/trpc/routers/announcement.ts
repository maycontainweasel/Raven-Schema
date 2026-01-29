import { t } from '@schema/server/trpc/context';
import { announcementRouter as generatedAnnouncementRouter } from './generated/announcement';

const customAnnouncementRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const announcementRouter = t.mergeRouters(generatedAnnouncementRouter, customAnnouncementRouter);
export type AnnouncementRouter = typeof announcementRouter;
