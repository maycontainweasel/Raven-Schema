import { t } from '@schema/server/trpc/context';
import { sessionQuestionRouter as generatedSessionQuestionRouter } from './generated/sessionquestion';

const customSessionQuestionRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const sessionQuestionRouter = t.mergeRouters(generatedSessionQuestionRouter, customSessionQuestionRouter);
export type SessionQuestionRouter = typeof sessionQuestionRouter;
