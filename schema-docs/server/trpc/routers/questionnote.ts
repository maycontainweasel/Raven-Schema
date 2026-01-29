import { t } from '@schema/server/trpc/context';
import { questionNoteRouter as generatedQuestionNoteRouter } from './generated/questionnote';

const customQuestionNoteRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const questionNoteRouter = t.mergeRouters(generatedQuestionNoteRouter, customQuestionNoteRouter);
export type QuestionNoteRouter = typeof questionNoteRouter;
