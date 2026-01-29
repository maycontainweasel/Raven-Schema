import { t } from '@schema/server/trpc/context';
import { sessionCategoryRecordRouter as generatedSessionCategoryRecordRouter } from './generated/sessioncategoryrecord';

const customSessionCategoryRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionCategoryRecordRouter = t.mergeRouters(generatedSessionCategoryRecordRouter, customSessionCategoryRecordRouter);
export type SessionCategoryRecordRouter = typeof sessionCategoryRecordRouter;
