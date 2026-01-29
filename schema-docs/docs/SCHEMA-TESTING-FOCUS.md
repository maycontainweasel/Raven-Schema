# Schema Testing Focus

This document captures the shared intent, goals, and execution plan for the schema testing initiative so we can resume work at any time without losing context.

## Purpose
- Build a **reliable schema engine** that can be reused across many apps with confidence.
- Ensure every **graph (DSL) capability** is validated through automated tests that run against a live SurrealDB instance.
- Provide **AI-ready reports** so failures can be diagnosed and fixed quickly (including by other AIs).
- Align **CLI tests** and **SchemaDocs UI** so they share one capability runner and one reporting format.

## Core Vision
We define data using a compact **graph DSL** that generates specs, functions, routers, views, Typesense mappings, and modules (post/instance/etc).  
We then run **capability-driven tests** derived from those specs. The tests must be **generic** (not model-specific hacks), deterministic, and safe to clean up.

## Key Principles
- **Capabilities over models**: Tests are organized by capability (CRUD, taxonomies, relations, subtables, views, Typesense, instances) rather than by table names.
- **Round-trip scenarios**: A small number of “circuit” tests exercise combined behavior (CRUD + relations + taxonomy + subtables + post + instance) without exploding into 10M micro-tests.
- **Micro-helpers under the hood**: Scenario steps reuse a common toolkit (payload builder, link/unlink, view runner, mapper runner, cleanup, etc.).
- **Deterministic + cleanup-safe**: All test records are tagged and cleaned up, even after crashes.
- **AI-friendly reporting**: Every step logs inputs, outputs, derived IDs, and assertions to JSONL.

## Scope (What we are building)
1) **CLI capability tests** (Vitest) for functions first, TRPC/controllers later.  
2) **SchemaDocs UI** as a “Schema Workbench”:
   - Live CRUD console
   - Capability test runner UI (same runner as CLI)
   - Typesense tooling (schema diff, mapper preview, reindex)
3) **Generator + DSL validation**:
   - Parse-time validation for DSL
   - Lint rules for conventions/guards
   - Strict handling of defaults and raw blocks

## Phased Plan

### Phase 1 — Core CRUD + Types Correctness (functions only)
**Objective:** basic models create/update/read/delete correctly, types are correct (arrays/objects/records), post & instance edges are created, cleanup works.

**Minimal Models:**  
- `User` (id=$email, password/uniqueId assign, instances, post)  
- `Question` (instances array + Admin::fn view)

**Success Criteria:**
- CRUD L1 for User + Question passes (create/read/update/delete)
- Instances stored as arrays, not strings
- Post record created and linked
- Instance edge created and removed on delete
- JSONL reports generated and cleanup leaves DB clean

### Phase 2 — Taxonomies (required + storage modes)
**Objective:** taxonomy creation + term attach + storage rules work.

**Coverage:**  
User Role taxonomy (required, storeOnModel true, alias support).

**Success Criteria:**
- Required taxonomy enforcement works
- storeOnModel updates base field
- alias payloads behave like canonical payload field

### Phase 3 — Relations + Subtables
**Objective:** relations + subtables work for both single and many, including composite IDs and cascade/orphan rules.

**Coverage:**  
- Exam ↔ Question (required, many)  
- QuestionOption subtable (many, composite IDs)  
- UserProfile + UserExamDate (single + many)

**Success Criteria:**
- Required relations can be linked and read from both sides
- Composite IDs are stable and correct
- Subtable CRUD works and cleanup is correct

### Phase 4 — Views + Typesense Mapping
**Objective:** views and Typesense mapping functions are stable and correct (no TS integration yet).

**Success Criteria:**
- Views run without errors and include declared fields
- Typesense mapper output matches expected schema/shape

### Phase 5 — TRPC/Controllers + UI Integration
**Objective:** run the same scenarios through TRPC and expose the runner in SchemaDocs UI.

**Success Criteria:**
- CLI + UI share one capability runner
- UI can run model/scenario and display JSONL logs

## Scenarios (Round-Trip)
**ModelCircuit(modelKey)**  
1) ensure prerequisites (taxonomies/terms/relations)  
2) create minimal valid record  
3) assert post + instance links  
4) update a complex field  
5) run view + mapper  
6) delete and verify cleanup

**GraphCircuits**
- RelationsCircuit
- TaxonomyCircuit
- SubtableCircuit

## Capability Matrix (Future)
Generated from spec/registry to drive tests dynamically:
- CRUD
- Router/TRPC
- Views
- Taxonomies
- Relations
- Subtables
- Typesense
- Instance
- Post

## Reporting
All tests log JSONL entries:
- `runId`, `model`, `capability`, `step`, `input`, `output`, `assertions`, `derivedIds`
- Failures include minimal repro and cleanup ledger

## DSL & Generator Guardrails
- Strict parsing and linting of DSL
- Raw defaults preserved exactly (no accidental stringification)
- PID/record IDs handled without extra wrapping
- Defaults for `instances` use `fn::defaultInstance({ returnArray: true })`

## Current Status (Live Notes)
- SurrealDB v3 beta (JS SDK v2 alpha) in use
- Function layer tests are the first target
- Test suite restored in `schema-docs/test/capabilities`

## Immediate Next Actions
1) Get `test:capabilities` green for User + Question (Phase 1).
2) Lock instance + post linkage checks.
3) Add taxonomy tests (User Role).
4) Expand to subtables + relations.

## Working Agreement
- Small, measurable increments
- Everything logged
- Everything documented
- Prefer fixing generator/helpers over test hacks
