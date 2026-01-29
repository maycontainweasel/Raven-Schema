# Schema Capability Testing Project

## Purpose
We need reliable, repeatable tests for every capability generated from `graph.mpdg` (TRPC routers, Surreal functions, frontend controllers, and UI field generators). The short-term goal is smoke‑level proof that each capability **does the thing**. The long-term goal is deeper validation and automatic test generation for all models.

## Scope
- **Source of truth:** `apps/tools/passmed-schema/config/graph.mpdg`
- **Primary test app:** `apps/tools/schema-docs` (Nuxt 4 + schema-kit)
- **Execution style:** CLI-first (Vitest). UI can remain as a demo/diagnostic surface.
- **TRPC access:** **direct router callers** (no HTTP), to mirror how controllers are used.
- **Default instance:** `pm` root, but configurable per run.

## Definitions
- **Capability:** A named feature derived from graph syntax, e.g. `crud`, `router`, `taxonomies`, `relations`, `instance<remote>`, `record<...>` fields.
- **Layer:** Where the capability is tested.
  - **Artifact layer:** file existence / exported types
  - **Backend layer:** TRPC + Surreal functions
  - **Controller layer:** Nuxt controller composables
  - **Field layer:** schema-driven UI field generation

## Phased Approach
### Phase 0 — Essential Smoke (fast feedback)
Goal: verify each capability **works at all**.
- CRUD (create/update/get/delete) for core models.
- Relations: attach/list/detach methods.
- Taxonomies: add/remove/list/clear.
- Subtables (single + many): create and read.
- Record fields: verify RID normalization (`table:id` vs `id`).
- Instance targeting: ensure default instance routing works.

Models for manual baseline tests:
- **User** and **Question** (wide coverage of capabilities).

### Phase 1 — Robust Validation
Goal: verify type correctness, field rules, edge cases.
- Field validation (required, enum, record, datetime).
- Surreal function existence + error branches.
- Instance sync (local → mothership → remote instances).

### Phase 2 — Generator-driven tests
Goal: generate tests for every model + capability automatically.
- Create a **test manifest** from graph.
- Generate test specs from templates.
- Add per-model overrides (fixtures, known constraints).

## Test Matrix (initial)
| Capability | Artifact | TRPC | Controller | Field | Notes |
|---|---|---|---|---|---|
| CRUD | ✅ | ✅ | ✅ | — | IDs, cleanup |
| Relations | ✅ | ✅ | ✅ | — | attach/list/detach |
| Taxonomies | ✅ | ✅ | ✅ | — | add/remove/list |
| Subtables | ✅ | ✅ | ✅ | — | single/many |
| Record fields | — | ✅ | ✅ | ✅ | RID normalization |
| Instance routing | — | ✅ | ✅ | — | local/remote |

## Execution (proposed)
Tests will live under `apps/tools/schema-docs/test/schema-capabilities/`.

Example commands (to add later in schema-docs `package.json`):
- `pnpm -C apps/tools/schema-docs test:capabilities`
- `pnpm -C apps/tools/schema-docs test:capabilities -- --model user`

## Environment & Data
- Use test instances (default `pm`).
- Each test creates its own records and deletes them.
- Track created IDs for cleanup in `afterAll` or `finally`.

## Architecture Sketch
1) **Graph parser** emits a **test manifest** per model.
2) **Test generator** uses manifest + templates to create Vitest files.
3) **Vitest runner** executes in schema-docs app using Nuxt test utils.
4) **Controller layer** uses generated composables.
5) **Backend layer** uses TRPC router callers.

## Immediate Next Steps
1) Add base test harness in schema-docs (Nuxt + Vitest, shared test utils).
2) Hand-write baseline tests for **User** and **Question** (Phase 0).
3) Validate CRUD + relations + taxonomies + subtable behaviors.
4) Define a manifest format based on those tests.
5) Implement a small generator to emit tests from manifest.

## Open Items / Decisions
- Final manifest shape (JSON/YAML/TS).
- Naming scheme for capabilities (suggested: `cap:<name>`).
- Where to keep environment configs (e.g. `schema-docs/.env.testing`).

## Notes
Short-term focus is correctness of *capabilities*. Deep validation and edge cases come after we have a reliable smoke suite for each model.
