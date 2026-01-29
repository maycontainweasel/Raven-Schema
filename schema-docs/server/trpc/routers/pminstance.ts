import { t } from '@schema/server/trpc/context';
import { pMInstanceRouter as generatedPMInstanceRouter } from './generated/pminstance';

const customPMInstanceRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const pMInstanceRouter = t.mergeRouters(generatedPMInstanceRouter, customPMInstanceRouter);
export type PMInstanceRouter = typeof pMInstanceRouter;
