---
name: schema-source-directory
description: Use when building or updating a schema-driven directory, list page, or admin index for a source-authority model in a schema-kit consumer app. Follow generated model metadata, source-first mutation routing, and server-backed Typesense rules when applicable.
---

# Schema Source Directory

## Goal
Build a directory flow for a model whose source of truth lives on the source database.

## Use when
- The model is source authority after alias normalization.
- The task is a directory/index/list page, search surface, or directory-backed create flow.

## Do not use when
- The model is instance authority.
- The task is only a single-record workspace with no directory behavior.

## Read first
1. `docs/ai/runtime/authority-routing.md`
2. `docs/ai/runtime/typesense.md` if the model is Typesense-enabled
3. `docs/controllers/<model>.md`
4. `modules/schema-kit/runtime/composables/useCRUD.ts`
5. `modules/schema-kit/runtime/composables/useTypesense.ts`
6. `modules/schema-kit/runtime/composables/useTypesenseDirectory.ts`
7. `references/read-first.md`

## Rules
- Source-authority mutations write to the source database first.
- If the source write fails, instance writes must not proceed.
- If the record carries an `instances` field, still pass the target instances explicitly to `useApiProcess()` / `useCRUD()`. Record payload and orchestration targets are not the same thing.
- Directory search must use generated/runtime search contracts; if Typesense is enabled, keep search server-backed.
- Treat TypeSense document shape as part of the contract. Generated views or transforms must emit schema-safe defaults for nullable strings and arrays instead of relying on missing values.
- Before declaring a Typesense-backed directory complete, compare the generated collection schema with the generated Typesense view/function and confirm every required field is emitted.
- Keep page-local config limited to UI defaults and presentation choices.
- Refreshing a directory and rebuilding an index are separate actions.
- Refresh or rebuild is not successful unless fetched/filtered/imported counts reconcile. Partial TypeSense imports must surface as an error, not as a success notice.

## Definition of done
- Directory reads from generated/runtime contracts.
- Create/update/delete flows route through source-first orchestration.
- Typesense-enabled models perform explicit post-mutation sync.
- After create, the record is searchable in the directory without a manual rescue step.
- Refresh/rebuild reports partial indexing failures clearly.
