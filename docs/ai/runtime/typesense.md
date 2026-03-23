# Typesense Contract

## Purpose
This document defines the reusable Typesense contract for schema-driven consumer apps.

## Source of truth
- Generated collection schema originates from schema generation and is emitted as `@schema/typesense/collections`.
- The schema workspace source lives in `config/typesense/collections.ts`.
- Model-specific controller docs under `module/docs/controllers/*.md` can add model-level details.

## Public runtime APIs

### `useTypesense()`
Template source:
- `module/src/resources/composables/useTypesense.ts`

Responsibilities:
- resolve collection metadata from generated schemas
- ensure or recreate collections
- search collections
- inspect or count records
- upsert or delete documents
- call server endpoints only

### `useTypesenseDirectory()`
Template source:
- `module/src/resources/composables/useTypesenseDirectory.ts`

Responsibilities:
- query state
- pagination
- sorting
- facet/filter state
- mapping search responses into directory results

## Non-negotiable rules
- Browser code must not create a raw Typesense client.
- Browser code must go through server-backed endpoints and composables only.
- Collection identity and field schema come from generated metadata, not page-local invention.
- The generated Typesense document contract must match the generated collection schema exactly. Do not add schema fields without confirming the generated Typesense view or function emits them.
- For Typesense-enabled models, post-mutation sync must be explicit: refresh, upsert, or delete through the server-backed runtime contract.

## Directory flow
For a Typesense-backed directory page:
1. resolve the model and collection from generated metadata
2. ensure the collection through `useTypesense()`
3. use `useTypesenseDirectory()` for query, sort, filter, and pagination state
4. keep page-local config limited to UI defaults such as `queryBy`, `sortableFields`, or filter defaults
5. use generated model-specific refresh/resource endpoints when the task requires reindexing or record-shape fetches
6. when Typesense fails, inspect all three generated artefacts together:
   - `config/specs/<Model>(<table>)/<table>.primary.yaml`
   - `config/migrations/<table>/F_view<Model>Typesense.surql`
   - `config/typesense/collections.ts`
   The collection schema and emitted document shape must reconcile field-for-field.

## Mutation flow
- Create/update/delete still flows through `useApiProcess()` / `useCRUD()`.
- Typesense sync is a second explicit step for Typesense-enabled models.
- Do not assume a directory refresh alone repopulates the underlying collection; search and index refresh are separate concerns.
