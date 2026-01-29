import { t } from '@schema/server/trpc/context';
import { questionOptionRecordRouter as generatedQuestionOptionRecordRouter } from './generated/questionoptionrecord';

const customQuestionOptionRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionOptionRecordRouter = t.mergeRouters(generatedQuestionOptionRecordRouter, customQuestionOptionRecordRouter);
export type QuestionOptionRecordRouter = typeof questionOptionRecordRouter;
