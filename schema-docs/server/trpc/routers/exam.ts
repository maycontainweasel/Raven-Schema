import { t } from '@schema/server/trpc/context';
import { examRouter as generatedExamRouter } from './generated/exam';

const customExamRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const examRouter = t.mergeRouters(generatedExamRouter, customExamRouter);
export type ExamRouter = typeof examRouter;
