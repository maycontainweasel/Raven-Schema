Title: Project — Helios Model Engine (HME)
Scope: `apps/schema/layers/helios-admin` + target app `heliosadmin`
Applies to: Model specs, model manager, useCRUD orchestration, Typesense, taxonomy/subtable bindings

## Purpose

This project defines and hardens the end-to-end contract that turns MPDG model definitions into a working Helios admin management experience.

Primary outcome:
- Define model in schema graph
- Generate schema outputs
- Enable model in Helios admin
- Immediately get:
  - searchable directory
  - minimal create dialog
  - single-record management page
  - deterministic save behavior for model fields, subtable fields, and taxonomy fields

## Problem Statement

The core failure pattern has been inconsistency across boundaries:
- schema definition shape
- generated runtime metadata
- admin UI spec contracts
- field-component behavior
- save orchestration behavior

HME resolves this by introducing strict contracts at each boundary and by treating generated metadata + UI specs as first-class machine-readable artifacts.

## Project Name

Canonical name: `Helios Model Engine`
Short name: `HME`

HME includes:
- model metadata generation
- model UI spec normalization + persistence
- runtime field binding orchestration
- override interception points

## Design Tenets

1. File-first contracts
- UI and model behavior are defined in committed files (`.ui.yaml`, generated manifest files).
- Runtime reads files; it does not infer behavior from ad-hoc state.

2. Opinionated defaults, universal overrides
- Everything works by default.
- Every major step can be replaced via convention-based overrides.

3. Deterministic saves
- Save behavior is driven by explicit field bindings.
- No implicit guessing for cross-table/taxonomy writes.

4. Generate once, normalize always
- Incoming specs are normalized into canonical structure (versioned).
- Runtime operates only on normalized structures.

5. Fail loudly at boundaries
- Missing action/binding contracts should surface immediately.
- “Cannot determine target action” is a hard error, not silent fallback.

## Phase 1 Scope

Must be production-solid for:
- standard model fields (`kind: model`)
- subtable-managed fields (`kind: subtable`)
- taxonomy-managed fields (`kind: taxonomy`)

Not in Phase 1:
- advanced custom handler runtime (`kind: custom`) beyond explicit error path
- full visual page builder
- non-opinionated multi-theme management shells

## North-Star Acceptance

Given a new generated model:
1. Model appears in Helios model manager.
2. Model can be enabled with defaults.
3. Directory route works and loads records.
4. Create flow creates a record using default create action.
5. Single page loads and renders configured widgets.
6. Save on a widget:
- updates base model payload fields
- updates subtable payload fields
- attaches/detaches taxonomy terms by diff
7. Refresh reflects saved values and taxonomy selection state.

## End-to-End Pipeline (Contract Map)

1. MPDG graph + migration config define model semantics.
2. Schema generation emits:
- `models.ts` (base model map)
- `admin-models.json` (rich admin metadata)
- `admin-manifest.ts` (typed rich admin metadata)
3. `helios-admin` model manager loads generated metadata.
4. Model manager returns normalized model inventory to `/api/models`.
5. Model manager creates/normalizes `app/helios/fragments/models/<model>.ui.yaml`.
6. Spec normalization outputs versioned `ModelLayoutSpec` (v3).
7. Directory and single pages consume normalized spec.
8. Runtime resolves each field’s `binding`.
9. Save orchestration groups updates by binding target:
- model actions
- subtable actions
- taxonomy actions (attach/detach diff)
10. useCRUD executes operations against local/remote mode.
11. Runtime refreshes record + taxonomy snapshots.
12. UI surfaces success/error state clearly.

## Core Contracts

### 1) Generated Admin Manifest Contract

Path (per app): `modules/schema-kit/runtime/generated/admin-models.json`

Required per model:
- `key` (router key)
- `table`
- `data` (`local` or `remote`)
- `fields[]`
- `requiredFields[]`
- `typesense`
- `taxonomyKeys[]`, `taxonomies[]`
- `subtableKeys[]`, `subtables[]`

This file is now the preferred source for model-manager metadata.

### 2) UI Spec Contract (v3)

`ModelLayoutSpec.version` supports `2 | 3`, but generated canonical output is `3`.

`ModelUIFieldSpec.binding` supports:
- `model`
- `subtable`
- `taxonomy`
- `custom`

### 3) Runtime Binding Contract

`model` binding:
- action + payloadKey

`subtable` binding:
- subtableKey + action + payloadKey

`taxonomy` binding:
- taxonomyKey + actions (`getTerms`, `getRecordTerms`, `attach`, `detach`, optional `addTerm`)

### 4) Override Contract

Override by file placement and naming, never by mutating generated foundations.

Expected override levels:
- entire model page
- tab/page section
- row
- column
- widget/card
- create dialog
- create handler

## Save Orchestration Rules (Phase 1)

For each widget save:
1. Resolve and normalize all field bindings.
2. Build grouped payload maps:
- `Map<action, payload>` for model bindings
- `Map<action, payload>` for subtable bindings
3. Execute grouped writes via useCRUD `$process`.
4. For taxonomy bindings:
- compare current selected ids with initial snapshot
- call detach for removed ids
- call attach for added ids
- update snapshot
5. Refresh record state.
6. Refresh taxonomy state for touched taxonomy fields.

## Taxonomy Rules (Phase 1)

1. Taxonomy field values are term id arrays (`valueMode: termIds`).
2. Runtime must load:
- all terms (`getTerms`)
- current record terms (`getRecordTerms`)
3. UI supports creating terms via optional `addTerm` action.
4. Save applies only delta (added/removed), not full replace.

## Failure Gates

Gate A: Manifest integrity
- `admin-models.json` must parse and contain valid model/table keys.

Gate B: Spec integrity
- missing/invalid bindings normalized to safe defaults only for `model` fields.
- invalid custom binding handler is explicit failure on save.

Gate C: Remote mode integrity
- remote writes require resolved instance list.

Gate D: Taxonomy integrity
- missing required taxonomy actions is hard failure for taxonomy save path.

Gate E: Generation integrity
- model-manager must still function with legacy fallback when rich manifest is absent.

## Files of Record

Primary implementation:
- `apps/schema/src/lib/modelsManifest.ts`
- `apps/schema/layers/helios-admin/server/utils/model-manager.ts`
- `apps/schema/layers/helios-admin/app/types/model-spec.ts`
- `apps/schema/layers/helios-admin/app/pages/models/[model].vue`
- `apps/schema/layers/helios-admin/app/pages/admin/[model]/[rid].vue`
- `apps/schema/layers/helios-admin/app/components/fields/ATaxonomyManager.vue`

Generated artifacts (do not hand-edit):
- `modules/schema-kit/runtime/generated/models.ts`
- `modules/schema-kit/runtime/generated/admin-models.json`
- `modules/schema-kit/runtime/generated/admin-manifest.ts`

## Commands

Generate schema outputs:
```bash
pnpm -C apps/schema run schema:generate
```

Generate model manifests only:
```bash
pnpm -C apps/schema run scaffold models:generate
```

Push schema layers into target app copies:
```bash
pnpm -C apps/schema run site:layers:push heliosadmin
```

## AI Handoff Start Here

When resuming this project, read in this order:
1. `apps/schema/docs/mpd-schema/working/projects/PROJECT-HELIOS-MODEL-ENGINE.md`
2. `apps/schema/layers/helios-admin/app/types/model-spec.ts`
3. `apps/schema/layers/helios-admin/server/utils/model-manager.ts`
4. `apps/schema/layers/helios-admin/app/pages/models/[model].vue`
5. `apps/schema/layers/helios-admin/app/pages/admin/[model]/[rid].vue`
6. `apps/schema/src/lib/modelsManifest.ts`

## Current Snapshot (2026-02-19)

Implemented:
- binding contract types for model/subtable/taxonomy/custom
- runtime save orchestration grouped by binding kind
- taxonomy attach/detach diffing + optional term creation
- generated rich admin manifest (`admin-models.json`) in schema tooling
- model-manager preference for generated rich admin manifest with fallback path

Next:
- add explicit schema validation/error reporting for malformed bindings before save
- add deterministic smoke tests for model/subtable/taxonomy save paths
- finalize create-dialog override contract docs with examples
