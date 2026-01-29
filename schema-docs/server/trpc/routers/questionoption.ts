import { t } from '@schema/server/trpc/context';
import { questionOptionRouter as generatedQuestionOptionRouter } from './generated/questionoption';

const customQuestionOptionRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionOptionRouter = t.mergeRouters(generatedQuestionOptionRouter, customQuestionOptionRouter);
export type QuestionOptionRouter = typeof questionOptionRouter;
