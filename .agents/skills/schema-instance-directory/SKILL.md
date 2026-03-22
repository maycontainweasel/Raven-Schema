---
name: schema-instance-directory
description: Use when building or updating a schema-driven directory, list page, or admin index for an instance-authority model in a schema-kit consumer app. Follow explicit target-instance routing and server-backed Typesense rules when applicable.
---

# Schema Instance Directory

## Goal
Build a directory flow for a model whose records live on target instance databases rather than the source database.

## Use when
- The model normalizes to instance authority.
- The task is a directory/index/list page, search surface, or directory-backed create flow.

## Do not use when
- The model is source authority.
- The task is only a record workspace with no directory concerns.

## Read first
1. `docs/ai/runtime/authority-routing.md`
2. `docs/ai/runtime/typesense.md` if the model is Typesense-enabled
3. `module/docs/controllers/<model>.md`
4. `module/src/resources/composables/useCRUD.ts`
5. `module/src/resources/composables/useTypesense.ts`
6. `module/src/resources/composables/useTypesenseDirectory.ts`
7. `references/template-sources.md`

## Required decisions before coding
- target instance selection rule
- whether `instancesEnabled` is true in the consuming app
- list/search endpoint contract
- create endpoint contract
- collection key and query defaults if Typesense is enabled
- explicit post-mutation sync behavior per target instance

## Rules
- Instance-authority mutations do not write to the source database first.
- Target instances must be explicit when the app is operating in multi-instance mode.
- Use `useApiProcess()` / `useCRUD()` to perform the routing; do not reimplement instance fan-out manually in page code.
- Keep Typesense search server-backed and treat sync as explicit per the generated/runtime contract.
- Keep page-local config focused on UI defaults, not authority inference.

## Definition of done
- Directory reads from the generated/runtime contract for the model.
- Create/update/delete flows write directly to the intended target instance or instances.
- Typesense-enabled models perform explicit post-mutation sync against the correct instance-side data.
- No source-first behavior was introduced for an instance-authority model.
