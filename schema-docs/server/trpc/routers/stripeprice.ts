import { t } from '../context';
import { stripePriceRouter as generatedStripePriceRouter } from './generated/stripeprice';

const customStripePriceRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const stripePriceRouter = t.mergeRouters(generatedStripePriceRouter, customStripePriceRouter);
export type StripePriceRouter = typeof stripePriceRouter;
