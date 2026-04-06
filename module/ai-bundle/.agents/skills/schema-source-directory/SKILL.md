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

## Required decisions before coding
- route base and record route identifier policy (`slug`, `key`, or record sub-id)
- model key and router key
- source instance key
- target instance propagation rule
- list/search endpoint contract
- create endpoint contract
- collection key and query defaults if Typesense is enabled
- create-dialog field set
- default deployment selection for create
- single-record workspace tabs/cards after redirect
- explicit post-mutation sync behavior

## Rules
- Source-authority mutations write to the source database first.
- If the source write fails, instance writes must not proceed.
- Prefer the orchestration wrappers exposed by `useCRUD()` / `useApiProcess()`, especially `$process()` for single page actions and source-first create/update/delete flows.
- If the record carries an `instances` field, still pass the target instances explicitly to `useApiProcess()` / `useCRUD()`. Record payload and orchestration targets are not the same thing.
- Taxonomy term creation, attach, detach, publication updates, deployment updates, and delete flows are still source-authority mutations. Do not bypass `$process()` just because the router exposes a direct mutation.
- If the model does not have a natural slug/key, route to the record workspace by record sub-id. Do not invent a new slug field in page code.
- Directory search must use generated/runtime search contracts; if Typesense is enabled, keep search server-backed.
- Treat TypeSense document shape as part of the contract. Generated views or transforms must emit schema-safe defaults for nullable strings and arrays instead of relying on missing values.
- Before declaring a Typesense-backed directory complete, compare the generated collection schema with the generated Typesense view/function and confirm every required field is emitted.
- Keep page-local config limited to UI defaults and presentation choices.
- In consumer apps with committed custom pages, the baseline custom flow is: directory -> create dialog -> source-first write -> explicit TypeSense sync -> directory refresh -> redirect -> record workspace with left-nav tabs and card-level saves.
- For small content models, the default record-workspace variant is usually `Content` and `Instances`, with publication controls kept on the content tab unless the task says otherwise.
- Refreshing a directory and rebuilding an index are separate actions.
- Refresh or rebuild is not successful unless fetched/filtered/imported counts reconcile. Partial TypeSense imports must surface as an error, not as a success notice.

## Intake checklist
State these explicitly before coding:
- What is the route base?
- What is the model key and router key?
- Is the record route driven by `slug`, `key`, or record sub-id?
- Which fields appear in the create dialog?
- Which fields appear in the directory table?
- Which fields belong on the first record tab?
- Which deployment instances should be preselected on create?
- Does the record need publication controls?
- Which TypeSense collection and query/filter fields power the directory?
- What is the explicit post-create, post-update, and post-delete TypeSense behaviour?

## Definition of done
- Directory reads from generated/runtime contracts.
- Create/update/delete flows route through source-first orchestration.
- Typesense-enabled models perform explicit post-mutation sync.
- After create, the record is searchable in the directory without a manual rescue step.
- Refresh/rebuild reports partial indexing failures clearly.
