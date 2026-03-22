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
3. `module/docs/controllers/<model>.md`
4. `module/src/resources/composables/useCRUD.ts`
5. `references/template-sources.md`

## Required decisions before coding
- record lookup strategy
- update endpoint name
- delete endpoint name if relevant
- authority after alias normalization
- source instance or target instance rule
- explicit post-update and post-delete sync behavior

## Rules
- Load records through generated resource/read contracts where available.
- Route updates and deletes through `useApiProcess()` / `useCRUD()`.
- Keep authority behavior explicit; a record page still needs to know where writes belong.
- If the model is Typesense-enabled, explicitly upsert, refresh, or delete the indexed document after mutation.
- Keep record-page orchestration close to the page/store/composable boundary and keep presentational components dumb.

## Definition of done
- The record workspace loads the right record from the right runtime contract.
- Update and delete operations use generated endpoints.
- Authority routing is correct.
- Typesense-enabled models perform explicit post-mutation sync.
