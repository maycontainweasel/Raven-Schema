# Schema Runtime Architecture

## Purpose
This document explains how `apps/schema` turns a graph definition into runtime assets, generated metadata, and reusable guidance for schema-consuming apps.

## Source-of-truth layers

### Authoring inputs
- `config/graph.mpdg`: model/table authoring in the MPDG DSL.
- `config/app.config.yaml`: app-level runtime capabilities, instance topology, module/layer sync, and environment-aware generation settings.
- `sites/*.yaml`: site declarations that determine which layers and modules a consumer app receives.

### Generator implementation
- `src/lib/modelsManifest.ts`: model runtime metadata and authority normalization.
- `src/lib/databasesExport.ts`: emitted database topology (`instancesEnabled`, `sourceDbInstance`, `tenantDbInstances`, `defaultDbInstance`, `instanceTopology`).
- `src/lib/schemaKitModule.ts`: schema-kit asset sync into consumer apps.
- `src/lib/layerSync.ts`: layer sync into consumer apps.

### Runtime templates
- `module/src/resources/**`: canonical template sources for composables, runtime helpers, generated resource entrypoints, and server scaffolding.
- `module/docs/controllers/*.md`: controller and model-oriented docs that travel with schema-kit outputs.

### Emitted consumer-app artifacts
Consumer apps receive generated or synced copies of:
- model metadata via `@schema/models`
- database topology via `@schema/db`
- Typesense collection schemas via `@schema/typesense/collections`
- controller docs and server/runtime helpers via schema-kit sync
- layers and runtime pages/components declared by the site config

## Runtime reasoning model

### 1. Classify the task
- Schema definition change: start in `config/graph.mpdg`, `config/app.config.yaml`, and the generator code.
- Framework runtime change: start in `module/src/resources/**` and the relevant generator/export code.
- Consumer-app implementation change: start in emitted runtime metadata and the consuming app’s local guidance.
- Guidance change: start in `docs/ai/**`, the nearest `AGENTS.md`, and the relevant schema skill.

### 2. Resolve authority before UI decisions
- Authority is a runtime contract, not a page-level guess.
- App topology comes from generated `@schema/db`.
- Model behavior comes from generated `@schema/models` plus controller docs.
- `source authority` and `instance authority` decide where writes happen, whether source-first behavior is required, and how `useApiProcess()` / `useCRUD()` must be configured.

### 3. Resolve Typesense separately
- Typesense enablement and collection schema are generated contracts.
- Page-local UI code may choose query defaults, sort defaults, and filters, but it should not invent raw collection schemas or browser-side transport.

## Guidance layering
- `AGENTS.md` files stay thin and route to this canon.
- Skills encode repeatable procedures, not all repo knowledge.
- Controller docs and generated metadata stay factual and model-specific.
- Consumer apps may add local examples, but schema canon should stay reusable across repos.

## Improvement loop
- If an agent repeats a schema/runtime mistake, first decide whether the mistake is abstract or app-specific.
- Abstract mistake: update `docs/ai/**`, a schema skill, or a schema-scoped `AGENTS.md`.
- App-specific mistake: update that consumer app’s local docs/AGENTS only.
