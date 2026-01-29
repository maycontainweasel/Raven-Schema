import { t } from '@schema/server/trpc/context';
import { extensionProductRouter as generatedExtensionProductRouter } from './generated/extensionproduct';

const customExtensionProductRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const extensionProductRouter = t.mergeRouters(generatedExtensionProductRouter, customExtensionProductRouter);
export type ExtensionProductRouter = typeof extensionProductRouter;
