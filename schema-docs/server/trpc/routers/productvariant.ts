import { t } from '@schema/server/trpc/context';
import { productVariantRouter as generatedProductVariantRouter } from './generated/productvariant';

const customProductVariantRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const productVariantRouter = t.mergeRouters(generatedProductVariantRouter, customProductVariantRouter);
export type ProductVariantRouter = typeof productVariantRouter;
