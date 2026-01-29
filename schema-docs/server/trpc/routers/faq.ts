import { t } from '@schema/server/trpc/context';
import { fAQRouter as generatedFAQRouter } from './generated/faq';

const customFAQRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const fAQRouter = t.mergeRouters(generatedFAQRouter, customFAQRouter);
export type FAQRouter = typeof fAQRouter;
