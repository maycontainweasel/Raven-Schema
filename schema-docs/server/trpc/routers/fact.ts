import { t } from '@schema/server/trpc/context';
import { factRouter as generatedFactRouter } from './generated/fact';

const customFactRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const factRouter = t.mergeRouters(generatedFactRouter, customFactRouter);
export type FactRouter = typeof factRouter;
