# Schema-Kit Admin Runtime and Directory Toolkit

## Intent
Build a reusable schema-driven admin runtime that lets any consumer app create robust management directories and record workspaces using generated schema metadata, `useTypesense`, and `useApiProcess`.

The first reference implementation is the PassMed `exam` flow in `heliosadmin`. Reusable framework work is developed from `app/app`-derived branches in `apps/schema`, then promoted into `origin/main` as clean framework commits.

## Core Objectives
- Make TypeSense access server-backed only.
- Standardize `useTypesense` as the single public TypeSense composable.
- Promote `useApiProcess` as the primary orchestration name, with `useCRUD` kept as a compatibility alias.
- Use generated schema outputs as the runtime source of truth.
- Prove the pattern on `/exams`, then roll it out to at least 4 more directories.
- Produce a human- and AI-readable tutorial showing how to build a new directory end to end.

## Non-Negotiable Invariants

### TypeSense
- No browser code may talk directly to the raw TypeSense node.
- All TypeSense access must go through server-side API endpoints or server-only utilities.
- Collection schema comes from generated `collections.ts`.
- Model key is the primary identity for TypeSense operations.

### API Process
- Source-authority models write to source DB first.
- If the source write fails, tenant writes do not proceed.
- Tenant-authority models bypass source DB and write directly to target instances.
- Authority must be inferable from generated metadata, with explicit override still available.

### Schema Supply
- Consumer apps should receive everything they need from schema generation/runtime config.
- App-level capabilities such as API-attempt tracking come from schema app config/runtime config.
- Model-level behavior comes from generated model metadata, not page-local duplication.

## Runtime Contracts

### Generated Runtime Metadata
Use these generated outputs as the source of truth:
- `generated/models.ts`
- `generated/models.manifest.json`
- `generated/admin-manifest.ts`
- `generated/typesense/collections.ts`
- `generated/databases.ts`

Runtime consumers should resolve:
- model key
- table
- authority / data mode
- slug policy
- TypeSense enablement
- collection name
- searchable/sortable/filterable fields
- CRUD/router contract

### `useTypesense`
Public responsibilities:
- resolve model to collection
- ensure collection
- recreate collection
- search collection
- count records
- inspect record
- upsert document(s)
- delete document
- refresh collection from server-side model refresh path

Implementation rules:
- server-backed only
- no raw browser TypeSense client usage
- must work with non-SSL TypeSense nodes via backend bridge

### `useTypesenseDirectory`
Responsibilities:
- query state
- pagination
- sorting
- filters/facets
- result mapping

Rules:
- no direct TypeSense transport
- built on `useTypesense`
- page-local config should define UI defaults, not collection contracts

### `useApiProcess`
Public name:
- `useApiProcess`

Compatibility:
- keep `useCRUD` as an alias until migration is complete

Responsibilities:
- endpoint execution
- authority inference
- source-first vs tenant-only routing
- retry and retry-failed behavior
- notifier integration
- API-attempt integration
- structured execution results
- explicit TypeSense sync helpers

## Reference Implementation

### `/exams`
Must prove:
- directory loads through server-backed TypeSense API only
- search, pagination, and filters work
- refresh modal status works
- ensure/rebuild/refresh actions work
- create dialog works
- create flow writes through `useApiProcess` / `useCRUD`
- create flow updates TypeSense explicitly
- record pages update the correct endpoints and re-sync TypeSense

## Documentation Deliverables

### Reference Architecture Guide
Explain:
- what schema emits into apps
- what `useTypesense` does
- what `useApiProcess` does
- what comes from app config vs model config
- what is explicit vs inferred
- what never belongs in client code

Current doc:
- `apps/schema/docs/admin-runtime-reference.md`

### Worked Tutorial
Create a clean teaching guide using a `recipe` model:
- define the model in `graph.mpdg`
- enable capabilities
- run generation
- inspect generated outputs
- build a directory page
- build a create dialog
- build a record page
- wire `useApiProcess`
- wire `useTypesense`
- perform explicit TypeSense sync after mutation

Current doc:
- `apps/schema/docs/admin-runtime-recipe-tutorial.md`

### AI-Oriented Guide
Produce a condensed implementation guide for another AI:
- required generated inputs
- required page-local config
- required composables
- mutation and sync flow
- authority/data-location rules
- testing checklist

## Sprint Outline

### Sprint 1
- finalize runtime model metadata contract
- harden server-backed `useTypesense`
- remove direct browser TypeSense access
- introduce `useApiProcess` alias
- make `/exams` directory fully server-backed

### Sprint 2
- finish `/exams` create/manage/update/delete flow
- standardize explicit TypeSense sync after mutation
- document the real exam flow as the reference implementation

### Sprint 3
- normalize naming and aliases inside `useApiProcess`
- formalize authority and source/tenant policy resolution
- formalize API-attempt runtime capability and payload contract
- define structured result guarantees

### Sprint 4
- apply the same pattern to at least 4 additional directories
- refine contracts only where real edge cases require it

### Sprint 5
- extract framework-safe commits
- cherry-pick reusable work into `origin/main`
- publish the reference guide, recipe tutorial, and AI-oriented guide

## Acceptance Criteria
- Opening `/exams` causes no browser request to raw TypeSense host/port.
- All TypeSense operations route through server API endpoints.
- `/exams` loads records from TypeSense and supports search, sort, pagination, and filters.
- Creating an exam on a source-authority model writes to source first, then target instances.
- If source write fails, target writes do not occur.
- `useApiProcess` can target non-CRUD endpoints as well as CRUD endpoints.
- When API-attempt tracking is enabled, partial failure is recorded accurately.
- A second directory can be built using the same toolkit with only page-local config changes.

## Current Status
- `useTypesense` in `heliosadmin` is server-backed.
- Active browser `$typesense` usage has been removed from the runtime composables.
- `useApiProcess` is available as a compatibility alias over `useCRUD`.
- `/exams` is the first hardening target and the current contract reference.
