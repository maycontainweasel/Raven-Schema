import { t } from '@schema/server/trpc/context';
import { userQuestionNoteRouter as generatedUserQuestionNoteRouter } from './generated/userquestionnote';

const customUserQuestionNoteRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const userQuestionNoteRouter = t.mergeRouters(generatedUserQuestionNoteRouter, customUserQuestionNoteRouter);
export type UserQuestionNoteRouter = typeof userQuestionNoteRouter;
