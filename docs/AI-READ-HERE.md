# AI Read‑Here (Passmed Schema Tooling)

This repo is the schema/tooling workspace that turns a human‑readable “napkin” graph DSL into SurrealDB specs, migrations, views, CRUD functions, TRPC routers, and TypeScript types.

Start here if you’re a new AI working in this repo.

## What this tool does

- **Source of truth**: `config/graph.mpdg` (MPDG DSL).
- **Specs**: Generated into `config/specs_stage/*` (staging) or `config/specs/*` (live).
- **Assets**: Functions, views, events, indexes, bundles generated into `config/migrations/*`.
- **Modules**: Module specs live in `config/bootstrap/modules/*` and generate module assets.

## Workflow (typical)

1. Edit `config/graph.mpdg`.
2. Generate specs:
   - Staging: `pnpm run graph:spec --force`
   - Live: `pnpm run graph:spec:live`
3. Generate assets:
   - Full: `pnpm run schema:generate`
   - Modules: `pnpm run schema:generate:modules`
4. Import into DBs:
   - `pnpm run schema:import` or `pnpm run schema:bootstrap --db <key>`

## Key docs

- MPDG format + blocks:
  - `docs/graph-dsl-profile.md`
- Tag/program glossary:
  - `docs/mpdg-tag-glossary.md`
- CRUD hooks plan:
  - `docs/crud-hooks-plan.md`

## Important conventions

- **Subtables**
  - Inside `(...)` block of a table definition.
  - Prefix with `*` for has‑many; otherwise has‑one.
  - Emits `tableType: submany` or `subsingle`.

- **Views syntax**
  - Inside `[...]` capabilities block, under `views:`.
  - Supports field selectors, fetch, and inline programs.
  - Raw expressions can be provided in parentheses:  
    `role: (select value label from only $this.role)`

- **Record types + assign**
  - `record<model>` fields with `assign: true` are computed **after** payload merge.
  - If a default exists and `assign: true`, defaults stay `""`; assign step uses payload if present, else fallback default.
  - If `assign` is false and default is non‑empty, defaults use `type::record("model", <default>)`.
  - Empty defaults stay empty (no `type::record("x","")`).

- **Overrides**
  - Generated assets live in `config/migrations/*`.
- Overrides live in `config/overrides/*` (or module overrides under `config/bootstrap/modules/<mod>/overrides`).
- App‑specific schema‑kit runtime overrides live in `schema/overrides/schema-kit/runtime/**` (inside the target app).
  - Overrides are imported last.

## Files to look at for generators

- MPDG → spec: `scripts/mpdg-to-spec.ts`
- CRUD + functions: `src/lib/functionGenerator.ts`
- Views: `src/lib/resourceViewGenerator.ts`
- Routers: `src/lib/routerGenerator.ts`
- Modules: `src/cli/moduleGenerate.ts`, `src/lib/modulesImporter.ts`

## Common pitfalls

- Zod input schemas used to strip optional fields. Create schema now uses:
  `Z_<Model>.partial().merge(Z_<Model>.pick(required))`
- Duplicate module migration files can exist (root + subfolder). Generator now removes duplicates and keeps the deepest path.
- Surreal `type::record("table","")` is invalid; defaults must avoid empty record IDs.

If something looks off, check generated specs/assets first; the source is almost always `graph.mpdg` or module specs.
