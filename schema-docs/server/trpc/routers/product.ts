import { t } from '@schema/server/trpc/context';
import { productRouter as generatedProductRouter } from './generated/product';

const customProductRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const productRouter = t.mergeRouters(generatedProductRouter, customProductRouter);
export type ProductRouter = typeof productRouter;
