# AI Guide Generation Project (Passmed Schema)

This document defines the project to generate AI-ready, per-model admin guides from the MPDG graph and generated specs. It is the starting point for building a repeatable, zero-briefing workflow where an AI can reliably build or maintain admin UIs without re-learning local conventions.

## Vision

Turn the existing schema pipeline into a "single source of truth" for how admin interfaces are built. When a model is described in `graph.mpdg`, running the generator should emit a precise, opinionated guide that tells an AI exactly how to implement CRUD admin UI for that model in this ecosystem (SurrealDB + Nuxt + Typesense + existing composables).

## Success criteria (v1)

- For any model, the generator creates a deterministic guide that:
  - Explains the UI flow (list -> create -> edit -> delete) using our standard admin patterns.
  - Specifies required queries, hooks, and refresh behavior (e.g., Typesense).
  - References the actual generated Surreal functions, views, router endpoints, and composables.
  - Includes example snippets (small, focused) that match the project conventions.
- Guides are generated alongside schema assets (same command), so they never drift.
- The guide structure is stable enough that it becomes the "read this first" doc for AI tasks.

## Scope (v1)

- Primary focus: CRUD admin guide for a single model.
- Sources: MPDG graph + generated specs + shared conventions (Nuxt/Typesense/Surreal patterns).
- Output: Markdown in a predictable location with light metadata.

Non-goals (v1):
- Full app docs, onboarding, or architecture narratives.
- Non-admin UI workflows.
- Automatic code generation for UI (this project only generates guides).

## Inputs

Primary:
- `config/graph.mpdg` (MPDG table definitions and tags)
- `config/specs/*` (live specs used by generators)

Secondary:
- Generated assets (functions, views, routers, types)
- Project conventions (composables, page patterns, request/response formats)

## Outputs (proposed)

- `docs/ai-guides/README.md`
  - Global "how to read these guides" + system-wide conventions.
- `docs/ai-guides/models/<Model>.md`
  - Model-specific admin CRUD guide.
- `docs/ai-guides/partials/*.md`
  - Reusable snippets injected based on capabilities (Typesense, views, edges, subtables).
- `docs/ai-guides/index.json`
  - Optional: machine-readable index of available guides and their features.

## Guide assembly model

The guide is composed of:
1) **Core scaffold** (always present)
2) **Feature addenda** (included only if the model has that capability)
3) **Model details** (fields, ids, views, hooks, etc.)

### Core scaffold (v1 sections)

1. Model overview
2. Admin UI workflow (list, create, edit, delete)
3. Data access (Surreal functions + router endpoints)
4. Client conventions (composables, request schemas, error handling)
5. View/Typesense integration (if enabled)
6. Subtables & edges (if present)
7. Validation & required fields
8. Examples (minimal, high-signal)

### Feature addenda (v1)

- Typesense integration
- Views: admin/public/typesense
- Refresh views hook behavior
- Subtables (subsingle/submany)
- Edge tables (has/belongs)
- Record id strategies (default, $field, composite, template)

## Placeholder/tag system (v1 proposal)

Use a simple placeholder format in templates:

- `{{table.label}}`, `{{table.model}}`, `{{table.idName}}`
- `{{crud.create.function}}`, `{{crud.update.function}}`, `{{crud.delete.function}}`
- `{{router.name}}`, `{{router.endpoints.create}}`, etc.
- `{{views.admin}}`, `{{views.typesense}}` (lists)
- `{{typesense.enabled}}`, `{{typesense.collection}}`
- `{{fields.required}}`, `{{fields.optional}}`

Rules:
- Unresolved placeholders should be removed or replaced with "not applicable".
- Lists render as bullet blocks when present.
- Minimal logic: true/false gating only (no complex conditionals in v1).

## Generation pipeline (proposed)

1. Parse MPDG and/or read live specs for the model.
2. Build a `GuideModelContext` object:
   - model meta, fields, required, id type
   - CRUD functions + return modes
   - view definitions and router endpoints
   - typesense config (if enabled)
   - subtables/edges
3. Render templates into a final Markdown guide.
4. Emit guide files to `docs/ai-guides/**`.

## Integration with CLI

Add a guide generator step to the schema pipeline:

- New command: `pnpm run schema:generate:guides`
- Integrate into `schema:generate` (or `generate` pipeline) after specs/assets generation.
- Optionally allow `--model <name>` for targeted regeneration.

## Initial template: CRUD admin guide (outline)

Title: `Admin Guide: {{table.label}} ({{table.model}})`

1) Overview
   - Purpose of the model in the system
   - ID strategy and required fields

2) List view
   - Query source (view or function)
   - Sort/filter strategy
   - Typesense search (if enabled)

3) Create flow
   - Required fields + defaults
   - Mutation endpoint / function
   - Post-create steps (refresh views, index)

4) Edit flow
   - Fetch record
   - Update endpoint / function
   - Post-update steps (refresh views, index)

5) Delete flow
   - Delete endpoint / function
   - Cascade/cleanup rules

6) Subtables and relations
   - Which subrecords are managed in this admin UI
   - How to create/update child records

7) Examples
   - Minimal payload examples
   - Small snippets of router/composable usage

## Versioning

- Guides include a header with generator version and timestamp.
- Template version stored with the generator to avoid mismatch.

## Open questions (to answer with owner)

1) Where should the "global admin guide" live, and what name should it have?
2) What are the canonical Nuxt composables for CRUD + Typesense?
3) Which router endpoints are the official source for admin operations?
4) What is the default list view pattern (table, cards, filters)?
5) How should delete behavior be described (soft vs hard; cascade rules)?

## Next steps (owner + AI working session)

1) Define the core admin workflow in a "golden" example model.
2) List the exact composables and patterns used today (names + signatures).
3) Define the Typesense integration steps and expected refresh points.
4) Decide on template placeholders and the default guide structure.
5) Implement a minimal `guide:generate` command that writes one model guide.
