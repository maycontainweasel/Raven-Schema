import { t } from '@schema/server/trpc/context';
import { fruitRouter as generatedFruitRouter } from './generated/fruit';

const customFruitRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const fruitRouter = t.mergeRouters(generatedFruitRouter, customFruitRouter);
export type FruitRouter = typeof fruitRouter;
