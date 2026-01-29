import { t } from '@schema/server/trpc/context';
import { userQuestionPerformanceRecordRouter as generatedUserQuestionPerformanceRecordRouter } from './generated/userquestionperformancerecord';

const customUserQuestionPerformanceRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userQuestionPerformanceRecordRouter = t.mergeRouters(generatedUserQuestionPerformanceRecordRouter, customUserQuestionPerformanceRecordRouter);
export type UserQuestionPerformanceRecordRouter = typeof userQuestionPerformanceRecordRouter;
