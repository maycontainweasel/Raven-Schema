import { t } from '../context';
import { stripeProductRouter as generatedStripeProductRouter } from './generated/stripeproduct';

const customStripeProductRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const stripeProductRouter = t.mergeRouters(generatedStripeProductRouter, customStripeProductRouter);
export type StripeProductRouter = typeof stripeProductRouter;
