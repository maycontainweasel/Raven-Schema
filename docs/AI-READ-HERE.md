# AI Read‑Here (Schema Tooling Workspace)

This repo is the schema/tooling workspace that turns a human‑readable “napkin” graph DSL into SurrealDB specs, migrations, views, CRUD functions, TRPC routers, and TypeScript types.

Start here if you’re a new AI working in this repo.

For cross-repo promotion, child-repo sync, and version tracking, also read:
- `docs/ai/control-plane.md`
- `docs/ai/repo-registry.yaml`
- `docs/ai/framework-promotion-playbook.md`
- `docs/ai/framework-release-log.md`
- `docs/ai/skills/README.md`
- `docs/ai/workstreams/README.md`

For editor tooling and MPDG authoring ergonomics, also read:
- `docs/ai/workstreams/mpdg-editor-tooling/README.md`
- `docs/graph-dsl-profile.md`
- `docs/ai/mpdg/validation-workflow.md`
- `extension/mpd-graph-dsl/README.md`
- `extension/zed-mpdg/README.md`

## Read next for schema runtime work

The canonical schema-owned AI guidance now lives in:
- `docs/ai/README.md`
- `docs/ai/architecture.md`
- `docs/ai/runtime/authority-routing.md`
- `docs/ai/runtime/typesense.md`

Use those docs for runtime contracts and agent workflow. Use this file for the schema generator workflow and file map.

## Read next for cross-repo schema operations

The canonical master-repo operating model now lives in:
- `docs/ai/control-plane.md`
- `docs/ai/repo-registry.yaml`
- `docs/ai/tenant-governance.md`
- `docs/ai/versioning-model.md`
- `docs/ai/skill-architecture.md`
- `docs/ai/templates/framework-candidate-note.md`
- `docs/ai/framework-promotion-playbook.md`
- `docs/ai/framework-release-log.md`
- `docs/ai/workstreams/schema-repo-operations/README.md`
- `docs/ai/workstreams/schema-operating-system/README.md`
- `docs/ai/workstreams/schema-operating-system/backlog.md`

Use those files when the task is about:
- promoting framework work from a child schema repo
- bringing a child repo up to date
- auditing remotes, `main`, `app`, or release markers
- improving the long-term schema repo operating system

## Read next for editor tooling work

The canonical editor-tooling track now lives in:
- `docs/ai/workstreams/mpdg-editor-tooling/README.md`
- `docs/ai/workstreams/mpdg-editor-tooling/implementation-plan.md`
- `docs/graph-dsl-profile.md`
- `docs/ai/mpdg/validation-workflow.md`
- `extension/mpd-graph-dsl/README.md`
- `extension/zed-mpdg/README.md`

Use those files when the task is about:
- MPDG syntax highlighting
- Zed editor support
- future MPDG completions, diagnostics, linting, or formatting
- improving editor ergonomics for `graph.mpdg` authoring

## Read next for graph authoring work

The canonical MPDG authoring guidance now lives in:
- `docs/ai/mpdg/README.md`
- `docs/ai/mpdg/stanza-authoring.md`
- `docs/ai/mpdg/views-and-resources.md`
- `docs/ai/mpdg/typesense-authoring.md`
- `docs/ai/mpdg/relations-taxonomies-subtables.md`
- `docs/ai/mpdg/validation-workflow.md`

Use those docs when the task is about editing `config/graph.mpdg`, adding a stanza, changing a view, adding Typesense, or defining relations/taxonomies/subtables.

## What this tool does

- **Source of truth**: `config/graph.mpdg` (MPDG DSL).
- **Specs**: Generated into `config/specs_stage/*` (staging) or `config/specs/*` (live).
- **Assets**: Functions, views, events, indexes, bundles generated into `config/migrations/*`.
- **Modules**: Module specs live in `config/bootstrap/modules/*` and generate module assets.

## Workflow (typical)

1. Edit `config/graph.mpdg`.
2. Validate the graph change:
   - `pnpm run graph:validate`
3. Generate specs:
   - Staging: `pnpm run graph:spec --force`
   - Live: `pnpm run graph:spec:live`
4. Generate assets:
   - Full: `pnpm run schema:generate`
   - Modules: `pnpm run schema:generate:modules`
5. Import into DBs:
   - `pnpm run schema:import` or `pnpm run schema:bootstrap --db <key>`

## Key docs

- MPDG format + blocks:
  - `docs/graph-dsl-profile.md`
- MPDG authoring canon:
  - `docs/ai/mpdg/README.md`
- Schema runtime/authority canon:
  - `docs/ai/runtime/authority-routing.md`
- Schema Typesense canon:
  - `docs/ai/runtime/typesense.md`
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
