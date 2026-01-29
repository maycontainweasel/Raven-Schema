import { t } from '@schema/server/trpc/context';
import { extensionVariantRouter as generatedExtensionVariantRouter } from './generated/extensionvariant';

const customExtensionVariantRouter = t.router({
  // Add or override endpoints here. Example:
  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),
});

export const extensionVariantRouter = t.mergeRouters(generatedExtensionVariantRouter, customExtensionVariantRouter);
export type ExtensionVariantRouter = typeof extensionVariantRouter;
