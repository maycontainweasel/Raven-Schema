import { t } from '@schema/server/trpc/context';
import { questionRouter as generatedQuestionRouter } from './generated/question';

const customQuestionRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionRouter = t.mergeRouters(generatedQuestionRouter, customQuestionRouter);
export type QuestionRouter = typeof questionRouter;
