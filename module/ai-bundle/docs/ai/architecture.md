# Schema Consumer Architecture

## Purpose
This document explains how a schema-consuming app should discover the correct runtime contracts before implementing a feature.

## Source-of-truth files in the consumer app

### Generated runtime metadata
- `modules/schema-kit/runtime/generated/models.ts`
- `modules/schema-kit/runtime/generated/models.manifest.ts`
- `modules/schema-kit/runtime/generated/admin-manifest.ts`
- `modules/schema-kit/runtime/generated/admin-models.json`
- `modules/schema-kit/runtime/generated/databases.ts`
- `modules/schema-kit/runtime/generated/typesense/collections.ts`

### Runtime composables
- `modules/schema-kit/runtime/composables/useCRUD.ts`
- `modules/schema-kit/runtime/composables/useTypesense.ts`
- `modules/schema-kit/runtime/composables/useTypesenseDirectory.ts`

### Model/controller docs
- `docs/controllers/<model>.md`

## Decision order
1. Resolve the model key and table key.
2. Resolve authority after alias normalization.
3. Resolve whether the app is operating in single-database or multi-instance mode.
4. Resolve generated endpoints and controller contract.
5. Resolve whether Typesense is enabled and which explicit sync step is required.
6. Only then choose page/store/server implementation details.

## Design rules
- Generated metadata describes the contract; UI code should consume it.
- Page-local code may choose labels, sort defaults, filters, and layout, but should not invent authority or transport behavior.
- `source authority` and `instance authority` are database-authority contracts, not business-domain names.
- App-specific examples may teach a pattern, but they are not the definition of the pattern.
