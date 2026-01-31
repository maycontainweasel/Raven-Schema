import { t } from '@schema/server/trpc/context';
import { carRouter as generatedCarRouter } from './generated/car';

const customCarRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const carRouter = t.mergeRouters(generatedCarRouter, customCarRouter);
export type CarRouter = typeof carRouter;
