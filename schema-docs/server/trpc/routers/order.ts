import { t } from '@schema/server/trpc/context';
import { orderRouter as generatedOrderRouter } from './generated/order';

const customOrderRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const orderRouter = t.mergeRouters(generatedOrderRouter, customOrderRouter);
export type OrderRouter = typeof orderRouter;
