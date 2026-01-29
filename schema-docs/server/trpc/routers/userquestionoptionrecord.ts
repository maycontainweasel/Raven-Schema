import { t } from '@schema/server/trpc/context';
import { userQuestionOptionRecordRouter as generatedUserQuestionOptionRecordRouter } from './generated/userquestionoptionrecord';

const customUserQuestionOptionRecordRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userQuestionOptionRecordRouter = t.mergeRouters(generatedUserQuestionOptionRecordRouter, customUserQuestionOptionRecordRouter);
export type UserQuestionOptionRecordRouter = typeof userQuestionOptionRecordRouter;
