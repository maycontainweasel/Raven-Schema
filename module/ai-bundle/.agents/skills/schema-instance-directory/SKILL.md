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
3. `docs/controllers/<model>.md`
4. `modules/schema-kit/runtime/composables/useCRUD.ts`
5. `modules/schema-kit/runtime/composables/useTypesense.ts`
6. `modules/schema-kit/runtime/composables/useTypesenseDirectory.ts`
7. `references/read-first.md`

## Rules
- Instance-authority mutations do not write to the source database first.
- In multi-instance mode, target instances must be explicit.
- Use `useApiProcess()` / `useCRUD()` to perform routing; do not reimplement instance fan-out manually in page code.
- Keep Typesense search server-backed and make sync explicit.

## Definition of done
- Directory reads from generated/runtime contracts.
- Create/update/delete flows write directly to the intended target instance or instances.
- Typesense-enabled models perform explicit post-mutation sync against the correct instance-side data.
