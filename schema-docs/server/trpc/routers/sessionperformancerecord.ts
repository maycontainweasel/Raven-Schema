import { t } from '@schema/server/trpc/context';
import { sessionPerformanceRecordRouter as generatedSessionPerformanceRecordRouter } from './generated/sessionperformancerecord';

const customSessionPerformanceRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionPerformanceRecordRouter = t.mergeRouters(generatedSessionPerformanceRecordRouter, customSessionPerformanceRecordRouter);
export type SessionPerformanceRecordRouter = typeof sessionPerformanceRecordRouter;
