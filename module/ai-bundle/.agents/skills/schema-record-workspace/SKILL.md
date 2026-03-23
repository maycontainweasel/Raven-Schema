---
name: schema-record-workspace
description: Use when building or updating a schema-driven single-record page, management workspace, or record detail flow. Follow generated resource/update contracts, authority routing, and explicit Typesense sync rules when applicable.
---

# Schema Record Workspace

## Goal
Build a single-record management flow that loads, updates, and syncs a schema-driven record without inventing transport or routing rules.

## Use when
- The task is a record page, detail workspace, or single-record management surface.
- The task updates or deletes a schema-driven record.

## Do not use when
- The task is only a directory page.
- The task is only a purely visual wrapper around an already-correct record workflow.

## Read first
1. `docs/ai/runtime/authority-routing.md`
2. `docs/ai/runtime/typesense.md` if the model is Typesense-enabled
3. `docs/controllers/<model>.md`
4. `modules/schema-kit/runtime/composables/useCRUD.ts`
5. `references/read-first.md`

## Rules
- Load records through generated resource/read contracts where available.
- Route updates and deletes through `useApiProcess()` / `useCRUD()`.
- Keep authority behavior explicit; a record page still needs to know where writes belong.
- For source-authority record pages, derive the target instances from the record state before mutating and pass them into the orchestration helper. Do not call model TRPC mutation endpoints directly from page code unless the write is intentionally single-instance.
- If the model is Typesense-enabled, explicitly upsert, refresh, or delete the indexed document after mutation.

## Definition of done
- The record workspace loads the right record from the right runtime contract.
- Update and delete operations use generated endpoints.
- Authority routing is correct.
- Typesense-enabled models perform explicit post-mutation sync.
