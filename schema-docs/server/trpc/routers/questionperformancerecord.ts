import { t } from '@schema/server/trpc/context';
import { questionPerformanceRecordRouter as generatedQuestionPerformanceRecordRouter } from './generated/questionperformancerecord';

const customQuestionPerformanceRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionPerformanceRecordRouter = t.mergeRouters(generatedQuestionPerformanceRecordRouter, customQuestionPerformanceRecordRouter);
export type QuestionPerformanceRecordRouter = typeof questionPerformanceRecordRouter;
