import { t } from '@schema/server/trpc/context';
import { questionAttemptRouter as generatedQuestionAttemptRouter } from './generated/questionattempt';

const customQuestionAttemptRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionAttemptRouter = t.mergeRouters(generatedQuestionAttemptRouter, customQuestionAttemptRouter);
export type QuestionAttemptRouter = typeof questionAttemptRouter;
