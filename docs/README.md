# Schema Tooling Progress Log

This document tracks the evolving architecture and behaviour of the schema tooling workspace. Update it whenever we introduce or adjust features so the full journey stays visible in one place.

## Current Focus

- Declarative table configs (`config/migrations/**`) drive Surreal table creation, Zod type generation, and TRPC router scaffolding.
- YAML-driven bootstrap imports seed utility functions into Surreal as part of the main pipeline.
- Generated assets flow automatically into the Nuxt playground (`schema-testing-nuxt`) for validation.

## Pipeline Overview

1. **Config Load**
   - `config/app.config.yaml` – core paths, database targets, generator defaults.
   - `config/imports.config.yaml` – selects bootstrap function/table imports.
   - Table definitions discovered via `config/migrations/**/*.(primary|st|st.many|table).yaml`.

2. **Execution Toggles (`src/main.ts`)**
   - Table definitions (`MigrationRunner`) – default `DEFINE TABLE OVERWRITE`, optional `IF NOT EXISTS`.
   - Edge relations (`runTableEdges`) – defines relation tables based on `has`/`belongs` configurations.
   - Bootstrap functions (`runBootstrapFunctions` on `imports.bootstrap`) – imports core SURQL utilities before any generated assets run.
   - Type generation (`generateTableTypes`) – outputs Zod + TS types under `schema-testing-nuxt/app/types/schema/generated`.
   - Router generation (`generateTrpcRouters`) – emits TRPC routers under `schema-testing-nuxt/server/trpc/routers/generated`.
   - Function generation & auto import – writes CRUD SURQL files (`config/functions/tables`) and loads them via `imports.auto`.
   - Table events (`runTableEvents`) – defines Surreal table events based on migration metadata.
   - Bootstrap tables (`runBootstrapTables`) – reserved for future table bootstrap tasks.

3. **Generated Outputs**
   - `schema-testing-nuxt/app/types/schema/generated` – per-table Zod schema (`Z_<Table>`) + inferred types.
   - `schema-testing-nuxt/server/trpc/routers/generated` – TRPC router files plus `index.ts` aggregator consumed by the main router.

## Nuxt Config Merge Order (Generated Apps)

Generated Nuxt apps use a three‑file merge with a safe “additions” layer:

1. `nuxt.config.generated.ts` – generated from `sites/<name>.yaml` (base config + generated modules).
2. `nuxt.config.runtime.ts` – generated from `env.yaml` (runtimeConfig only).
3. `nuxt.config.additions.ts` – **manual** additions (safe place for extra modules/css/transpile).
4. `overrides` inside `nuxt.config.ts` – **manual** and highest priority.

Important rules:

- Arrays (`modules`, `css`, `build.transpile`) are **concatenated** when merging additions.
- Arrays in `overrides` **replace** earlier values.
- Layers can declare Nuxt modules in `layer.yaml` (`modules:`) and optional defaults in
  `layer.yaml` → `nuxtConfig:`. When you add/remove layers, the site tooling composes
  these into `nuxt.config.generated.ts` so you can see the final list.

Recommended usage:

- Put extra modules in `nuxt.config.additions.ts` (safe append).
- Only use `overrides.modules` if you want to **replace/reorder** everything.

## Layer Registry (Short Term)

Layers are “registered” by a `layer.yaml` file inside each layer folder:

- `apps/schema/layers/<layer>/layer.yaml`
- Optional per-app overrides live at:
  - `apps/<site>/layers/<layer>/layer.override.yaml`
  These overrides are merged into the generated Nuxt config and never overwrite the
  schema source layer. The sync process preserves existing override files.

The registry fields are currently minimal (name, version, description). When you include a layer in a site’s `layers:` list, `site:setup --fix` will:

1. Sync the layer folder into `apps/<site>/layers/<layer>`
2. Update `extends` in `nuxt.config.generated.ts`
3. Write `layers.lock.json` in the app root (name + version + hash)

If a `layer.yaml` is missing, the sync process auto‑creates one with version `0.0.0` to keep older layers compatible.

### Layer Status Command

Use the CLI to inspect layer versions per app:

```
pnpm -C apps/schema run layers:status
pnpm -C apps/schema run layers:status -- --project admin
```

It reads `layers.lock.json` when available, falling back to `layer.yaml` metadata.

## Database Targeting

- Define `environment.migrationTargets` in `config/app.config.yaml` with the database keys you want the pipeline to hit (e.g., `['local', 'testing']`). When unset, the runner falls back to `environment.defaultDatabase`.
- Run `pnpm run dev` (or `--migrate`) and the CLI will apply tables/edges/bootstrap/event phases to every entry in that list sequentially.
- Override the list per-invocation with `--database <name>` (alias `--db=<name>`). Providing the flag limits the run to that single database key.
- All names in either place must correspond to entries under `databases:`; the runner exits early if a name can’t be resolved so you never unknowingly skip a target.

## Recent Milestones

- Established YAML table schema format (`table.*`, `fields`, `views`, `router`) → types + routers.
- Added router scaffolding with create/update/delete/resource endpoints using `RequestSchema`.
- Introduced bootstrap function importer with per-directory and explicit file selection, supporting `OVERWRITE` / `IF NOT EXISTS`.
- Added CLI scaffolding command (`pnpm run scaffold table:create <name> --branches ...`) to generate primary + branch table YAML stubs.
- Auto-generating create/update/delete SURQL functions in `config/functions/tables/<table>/` from TRPC config.
- Relation edge runner builds Surreal relation tables from `edges.has` / `edges.belongs` definitions. Provide `table` to enforce a specific relation table name (e.g., `u_has_uSettings`); `in`/`out` default to the parent model when omitted, and unique indexes are added unless `unique: false`/`index: nonunique` is specified.
- Automatic delete events now guard downstream views: when `post` or `delete` blocks are enabled (delete defaults on), cascade events clean up sub-table records via their generated CRUD functions and prune declared edges using the `deleteEdgeFromIn` / `deleteEdgeFromOut` helpers.
- Edge helpers now provide a single, dynamic API for relation tables: `fn::createEdge`, `fn::updateEdge`, `fn::deleteEdge` (uses `INSERT RELATION` and supports bound IDs + optional payload data).
- Relation helper wrappers are now optional per relation (`functions: false`). When disabled, CRUD relation processing still links/unlinks records using direct edge operations.
- Taxonomy helpers now route through the generic API in `config/bootstrap/functions/utility/taxonomyTerms.surql` (`fn::createTerm`, `fn::removeTerm`, `fn::attachTerm`, `fn::detachTerm`, `fn::getTerms`, `fn::getRecordTerms`); per‑taxonomy functions are thin wrappers.
- CRUD hooks + return modes: CRUD generators accept `hooks` (pre/post validate/process) and per-op `return` (`record`/`id`); update auto-injects a postProcess hook to call `fn::refreshRecordViews` when `refreshViews` is true, replacing the old refreshViews event.
- Instance defaults: tables with the `instance` capability now default `instances` via `fn::defaultInstance({ returnArray: true })`, so callers can omit `instances` on single-instance apps.
- Raw defaults: multiline defaults wrapped in `{ ... }` are emitted as raw Surreal expressions (no quotes); `$field` placeholders are still rewritten to `$payload.field`.

## CRUD hooks & return (how to use)

Add hooks and return mode per operation inside a table spec:

```yaml
crud:
  create:
    options:
      return: record        # default for create/update; use id to return only the rid
      hooks:
        preValidate: ["// runs after payload null check"]
        postValidate: ["// after required field checks"]
        preProcess: ["// before upsert/create"]
        postProcess: ["// after create, before return"]
  update:
    options:
      return: id            # default is record; id is handy for lightweight calls
      hooks:
        postProcess: ["fn::afterUpdateAudit($result);"]
  delete:
    options:
      return: id            # default
      allowMissing: true    # default; return null if record doesn't exist
      hooks:
        postProcess: ["fn::cleanupReferences($result['id']);"]
```

Notes:
- Hook arrays are raw SurrealQL lines injected at the named stage.
- `allowMissing` controls delete behavior when the record does not exist. Set `false` to throw.
- Temp vars available to hooks:  
  - create: `$payload`, `$record`, `$rid` (if present)  
  - update: `$recordParam`, `$payloadParam`, `$result`  

## Spec overrides (never overwritten)

Generated specs live in `config/specs/**`. If you want persistent overrides that survive
graph re-syncs, place matching files under:

```
config/overrides/specs/...
```

Override files mirror the generated path. Example:

```
config/overrides/specs/Exam(exam)/exam.primary.yaml
```

Only include keys you want to override; the loader deep‑merges objects and replaces arrays.
  - delete: `$recordParam`, `$result`
- If a table has `refreshViews: true`, the update generator auto-adds `fn::refreshRecordViews($rid)` in postProcess; no refreshViews event is emitted.

## Field defaults (raw expressions)

To emit **raw Surreal expressions** (not quoted strings) in defaults, wrap the default in `{ ... }` and use the YAML block scalar:

```yaml
- permalink:
    type: string
    default: |-
      {
        if($title) {
          string::slug(<string> $title)
        } else {
          string::slug(<string> record::id($id))
        }
      }
```

Notes:
- `$field` placeholders still map to `$payload.field` during generation.
- This is the preferred way to embed multi-line Surreal expressions in defaults.

## CLI Reference

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Execute the full schema pipeline (tables → types → routers → bootstrap). |
| `pnpm run build && pnpm run start` | Run compiled build of the pipeline (same steps as `dev`). |
| `pnpm run scaffold table:create <name> --branches a,b,c` | Generate/extend migration stubs for a primary table and optional branch tables. Use `--force` to overwrite existing files. | if the primary table exists it will only create the branch tables
| `pnpm run dev` (or build/start) | Regenerates TRPC routers, schema types, creates relation edges, imports bootstrap utilities first, writes & imports generated CRUD functions, and reapplies table events. |
| `pnpm run scaffold functions:generate [name]` | Generate SURQL CRUD scaffolds (create/update/delete) for all tables or a single table. |
| `pnpm run scaffold trpc:scaffold <name>` | Insert a default TRPC block into a migration (use names like `user` or `user.settings`; add `--force` to overwrite). |
| `pnpm run schema:assets:diff --database <name>` | Compare local `schema-assets.json` to the target DB `app:schemaAssets` and list assets that differ or are missing. Uses disk rehashing by default; pass `--no-rehash-local` to skip. |
| `pnpm run schema:assets:sync --database <name>` | Replace the target DB `app:schemaAssets` with the local manifest (top-level keys). |
| `pnpm run schema:indexes:rebuild [name]` | Rebuild indexes for a database. Use `--table` to scope by table, or omit for all indexes. |

## Site package management

- `site:pkg:sync [name]`  
  Merge layer packages + site packages into `package.json`.

- `site:pkg:add [name] <packages..>`  
  Add packages to site packages (dependencies by default) and sync `package.json`.

> Keep this table in sync whenever new CLI commands are introduced or existing ones change.

Examples:
```bash
pnpm run schema:import --only-changed --database ph
pnpm run schema:bootstrap --force --database ph
```

## Next Up

- Extend field parsing (required/default/branch awareness) for richer Zod + payload schemas.
- Flesh out bootstrap table imports and branch-table file handling.
- Expand router/view metadata to cover additional request parameters and validation flows.

## Notes

- Keep `imports.config.yaml` aligned with any new bootstrap directories.
- Use the `auto` section in `imports.config.yaml` to pull generated assets (e.g., `functions/tables`) without touching the bootstrap order.
- Generated SURQL assets (tables, views, indexes, events, CRUD functions) now default to `DEFINE ... OVERWRITE` unless you explicitly set `mode: IF NOT EXISTS`, so database applies stay idempotent.
- Asset imports support `--only-changed` (compare against `app:schemaAssets`) and `--force` to override; set `importFilters.onlyChanged: true` to default to only-changed imports.
- `schema:import` and `schema:bootstrap` now rebuild indexes by default; pass `--no-rebuild-indexes` to skip.
- For targeted function refreshes during relation/debug work, prefer explicit imports:
  - `pnpm -C apps/schema run schema:import frame -- --database helios --layers functions --force`
- You can also rebuild indexes manually with `pnpm run schema:indexes:rebuild` (add `--table` or a specific index name to scope).
- `schema:assets:diff` now hashes files from disk by default so any manual edits are detected even if `schema-assets.json` is stale.
- Router default names now use the table label in camelCase (e.g., `User` → `user`, `UserSettings` → `userSettings`), falling back to the table model if no label is set.
- When adding new generators, expose toggles in `RuntimeToggles` so they can be enabled/disabled quickly.
- Record significant adjustments here to maintain a running changelog for the project’s evolution.
