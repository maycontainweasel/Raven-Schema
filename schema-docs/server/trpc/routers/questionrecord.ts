import { t } from '@schema/server/trpc/context';
import { questionRecordRouter as generatedQuestionRecordRouter } from './generated/questionrecord';

const customQuestionRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionRecordRouter = t.mergeRouters(generatedQuestionRecordRouter, customQuestionRecordRouter);
export type QuestionRecordRouter = typeof questionRecordRouter;
