# MPD Schema Docs Project

This document defines the project for MPD Schema Docs. It is the single source of truth for why this exists, what we are building, and how we keep it aligned as the MPD framework evolves.

## What this is

MPD Schema Docs is a dedicated Nuxt 4 app that hosts:
- **Read‑first documentation** that teaches an AI (or a new dev) the MPD framework end‑to‑end.
- **Working documentation** that shows real, copyable examples for CRUD admin flows, Typesense, instances, and schema‑driven features.
- **Schema‑kit assets** (composables, helpers, patterns) used to keep admin UI work consistent and fast.

The app is intentionally minimal and UI‑agnostic so the examples are portable across projects.

## Why this exists

The MPD framework is opinionated. It uses:
- SurrealDB for data and functions.
- Nuxt 4 for front‑end apps.
- tRPC for API wiring.
- Typesense for search.
- A graph DSL (MPDG) to generate specs, assets, and types.

The AI often guesses and invents new patterns. This project fixes that by providing **authoritative, generated guidance** and **working examples** so the AI can follow the exact MPD workflow without re‑explanation.

## Vision

Create a living, generated documentation system that:
- Mirrors the schema tool output.
- Explains the MPD workflow from first principles.
- Provides copy‑ready examples for real admin tasks.
- Evolves as the framework evolves.

## Success criteria

- A new AI can read this docs app and build a correct admin page for any model on the first try.
- All guidance is generated or sourced from the MPD schema tooling to prevent drift.
- Every important nuance (record IDs, instances, Typesense, views, hooks) is documented with a working example.

## Key terms (v1)

- **MPD Framework**: the opinionated stack and workflow defined here.
- **MPD Schema Tooling**: the generator app that turns `graph.mpdg` into specs, functions, views, routers, and types.
- **Schema‑kit**: the composables and utilities used by Nuxt apps to interact with generated assets.
- **Read‑first docs**: global primer and conventions that must be read before model‑specific docs.
- **Working docs**: practical, copyable implementations used to build real pages.
- **Recipe**: a documented task flow (e.g., “Admin list with Typesense search”).

## What we generate

1) **Global primer** (read first)
   - MPD framework overview
   - SurrealDB + record ID rules
   - Instances + multi‑tenant patterns
   - MPDG DSL explanation
   - Generator pipeline (specs → assets → routers → types)

2) **Model guides**
   - CRUD admin workflow
   - View usage (Admin/Public/Typesense)
   - Create/update/delete expectations
   - Subtables, edges, and IDs
   - Typesense wiring and refresh behavior

3) **Working examples**
   - Real Nuxt pages showing the canonical implementation
   - Live calls to TRPC endpoints
   - Typesense search/list flows
   - Taxonomy/tagging flows
   - Create/update/delete flows with instances

## Documentation architecture (v1)

We will organize documentation as a tree of **Collections**, **Guides**, and **Artifacts**.

- **Collection**: a folder that groups related docs (e.g., `primer`, `recipes`, `working`, `reference`, `models`).
- **Guide**: a multi‑file topic that an AI should read together (e.g., “Admin CRUD Guide”).
- **Artifact**: a small, single‑purpose markdown file that explains one concept, rule, or pattern.

Artifacts are the atomic units. Guides and collections are built from artifacts.

### Artifact naming (proposal)

Artifacts should be short and explicit, and use a stable, searchable name:
- `record-ids.md`
- `instances-multi-tenant.md`
- `typesense-indexing.md`
- `crud-admin-list.md`

### Minimal artifact header (v1)

Each artifact should begin with a short, structured block (plain markdown):

```
Title: <clear title>
Scope: global | model:<model> | feature:<feature>
Applies to: <Nuxt 4 | SurrealDB | Typesense | tRPC | MPDG>
Depends on: <optional list>
```

This keeps artifacts readable now, and makes future automation possible later.

## Project scope (v1)

- Target model: **User**
- Target environment: **Nuxt 4** (admin UI)
- Output location (default): `apps/tools/passmed-schema/docs`
- Example app: this docs app (`apps/tools/passmed-schema/schema-docs`)

## Generation rules

- Documentation should be derived from configuration and specs whenever possible.
- Model guides must reflect the actual generated assets.
- When a nuance is discovered, it must become a documented rule or recipe.
- Guides must remain short, opinionated, and copy‑ready.

## How we keep this alive

Each time we encounter confusion or ambiguity:
1) Capture the nuance.
2) Add it to the primer or a specific recipe.
3) Update the generator templates.
4) Re‑generate the docs.

## Roadmap (living)

- v1: User model guide + core primer + Typesense recipe
- v2: Taxonomy/tagging recipes
- v3: Subtables and edge management recipes
- v4: Generator automation and validations

## Accountability checklist (for the owner)

- Provide the canonical example pages in this docs app.
- Confirm the official composables and helpers.
- Define the expected TRPC endpoints per model.
- Approve each primer section before it becomes “read‑first.”

## Status

This is a work in progress. The goal is accuracy and repeatability, not completeness on day one.
