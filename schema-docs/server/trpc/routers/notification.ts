import { t } from '@schema/server/trpc/context';
import { notificationRouter as generatedNotificationRouter } from './generated/notification';

const customNotificationRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const notificationRouter = t.mergeRouters(generatedNotificationRouter, customNotificationRouter);
export type NotificationRouter = typeof notificationRouter;
