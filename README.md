# Node.js TypeScript Base Template

A solid baseline Node.js TypeScript framework for rapid development of utility tools and applications.

## Overview

This template provides a complete TypeScript environment with all the essentials for building Node.js applications. It's designed to be copied to new projects where you can immediately start building tools without setting up the basic infrastructure.

## Features

- ✅ **TypeScript 5.x** with strict configuration
- ✅ **Modern Node.js** (ES2022 target)
- ✅ **Development tools** (tsx for fast execution)
- ✅ **Code quality** (ESLint + Prettier)
- ✅ **Build system** (TypeScript compiler)
- ✅ **Watch mode** for development
- ✅ **Path aliases** support (@/* → src/*)
- ✅ **Comprehensive .gitignore**

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development (with watch mode):**
   ```bash
   npm run watch
   ```

3. **Run once in development:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run production build:**
   ```bash
   npm start
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the application in development mode |
| `npm run watch` | Run with file watching (auto-restart on changes) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled JavaScript |
| `npm run clean` | Remove the dist directory |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Type check without building |
| `npm run schema:generate` | Generate functions, views, indexes, types, routers, bundles (no DB writes) |
| `npm run schema:generate:modules` | Generate module assets from module specs (functions, views, indexes, bundles) |
| `npm run schema:full` | Run the full DB cycle: generate -> generate:modules -> bootstrap -> import -> seed |
| `npm run schema:import` | Import generated SURQL assets (functions, events, views, indexes) |
| `npm run schema:import:functions` | Import generated/override SURQL functions into target DBs |
| `npm run schema:bootstrap` | Import bootstrap assets and enabled modules into target DBs (no seeds) |
| `npm run schema:seed` | Import only seed data for target DBs |
| `npm run schema:bootstrap:seed` | Alias of `schema:seed` |
| `npm run schema:request-schema` | Generate the shared RequestSchema helper (instance-aware request input) |

## Common Tasks (with examples)

> Assume commands run from `apps/tools/passmed-schema`. Add `-- --flag` after npm scripts to pass CLI flags through.

- Generate everything (no DB writes):  
  `pnpm run schema:generate`

- Run the full DB cycle (generate -> modules -> bootstrap -> import -> seed):  
  `pnpm run schema:full --database uk --force`

- Generate just one table (e.g., `exam`):  
  `pnpm run schema:generate --name exam`

- Generate client assets only for selected projects:  
  `pnpm run schema:generate --project passmed-mothership,lucky-public`

- Import functions for all tables into default DB targets, honoring overrides:  
  `pnpm run schema:import:functions`

- Import all layers (functions, events, views, indexes) into default DB targets:  
  `pnpm run schema:import`

- Generate assets for modules (uses `paths.modules` and `modules:` list):  
  `pnpm run schema:generate:modules`

- Import only one table’s functions into specific DBs:  
  `pnpm run schema:import:functions --name exam --database uk,test`

- Import all layers (functions, events, views, indexes) for one table:  
  `pnpm run schema:import --name exam`

- Import selected layers only (e.g., functions + indexes) to a DB:  
  `pnpm run schema:import --layers functions,indexes --database uk`

- Dry run (see what would be applied):  
  `pnpm run schema:import --dry-run`

- Run bootstrap (core + modules from config):  
  `pnpm run schema:bootstrap`

- Bootstrap with explicit modules to override config:  
  `pnpm run schema:bootstrap --modules post,instances --database uk`

- Import only seeds for DB(s):  
  `pnpm run schema:seed --database uk,test`

- Copy a spec folder from staging to live (by label, model, or folder name):  
  `pnpm run spec:copy User`  
  `pnpm run spec:copy u`  
  `pnpm run spec:copy User(u)`

Default end‑to‑end (`pnpm run dev`) still generates and applies everything unless you pass the CLI toggles described in `src/main.ts` (`--no-generate`, `--no-apply`, `--dry-run`, etc.).

## Sync utility (push to other folders)

We ship a simple **rsync-based** sync tool to copy selected files to one or more local targets (Git‑less workflow).

- Config: `config/sync.yaml`
- Docs: `docs/SYNC-UTILITY.md`
- Run:
  - `pnpm -C apps/tools/passmed-schema schema:sync`
  - Dry-run: `pnpm -C apps/tools/passmed-schema schema:sync -- --dry-run`
  - Itemized diff: `pnpm -C apps/tools/passmed-schema schema:sync -- --itemize`
  - Checksum diff: `pnpm -C apps/tools/passmed-schema schema:sync -- --checksum`

`sync.yaml` supports **multiple projects per target**, **global excludes**, and **package.json preservation** (e.g. keep `name` while updating scripts/deps).

## Overrides and selective import

- Generated SURQL assets (functions `F_`, events `E_`, views `V_`, indexes `I_`, bundles `Z_`) live in `config/migrations/<table>/`.
- To override a generated function, place `F_<function>.surql` in `config/overrides/functions/<table>/` (or the folder set in `paths.overrides.functions` in `app.config.yaml`). During import, override files win; generation never touches the override folder.
- Folder shape example:
  ```
  config/
    migrations/
      exam/
        F_createExam.surql        # generated
    overrides/
      functions/
        exam/
          F_createExam.surql      # your custom version (takes precedence on import)
  ```

## MPDG DSL notes (quick)

- The MPDG source file is `config/graph.mpdg`. It expands into specs + generated assets.
- Core DSL docs:
  - `docs/graph-dsl-profile.md`
  - `docs/mpdg-tag-glossary.md`
- Views can now be generated as functions with `Name::fn[...]` (see `docs/graph-dsl-profile.md`).
- `record<model>` + `<assign>` behavior:
  - `assign: true` + default present → defaults use `""`; assign step uses payload if present, else fallback default.
  - `assign: false` + non‑empty default → defaults use `type::record("model", <default>)`.
  - Empty defaults stay empty (no `type::record("model","")`).
- Relations helper wrappers are optional:
  - set `functions: false` in a relation block to skip `attach*`, `detach*`, `get*` helper generation.
  - CRUD relation linking still runs (direct edge writes via `fn::createEdge(...)` and edge deletes).
- For one-to-many parent links where create payload sends a single parent id (for example `frame.page`):
  - use `cardinality: one`
  - use `payloadField: page`
  - keep `linkOnCreate: true` to auto-link after create.

### Relation import/debug tip

If runtime behavior looks stale after DSL changes, import functions explicitly to the intended DB:

```bash
pnpm -C apps/schema run schema:generate
pnpm -C apps/schema run schema:import frame -- --database helios --layers functions --force
```

## Event file mode

Events can be written as one file per event or bundled per table. Configure in `config/app.config.yaml`:

```yaml
events:
  fileMode: table # split | table
```

## Configuring paths

`config/app.config.yaml`
```yaml
paths:
  migrations: ./config/specs
  surrealOutput: ./surreal/generated
  docsOutput: ./docs/generated
  overrides:
    functions: ./config/overrides/functions   # change this to move overrides elsewhere
  modules: ./config/bootstrap/modules         # base path for modules (default)
```

## Import filters (include/exclude)

Use `importFilters` in `config/app.config.yaml` to restrict what gets imported by default.

```yaml
importFilters:
  # Default import mode (true = only changed assets, false = import all)
  onlyChanged: true
  # Table selection (only used when you don’t pass --name)
  tables:
    - user
    - exam
  tablesExclude:
    - faq

  # Layer selection for schema:import (only used when you don’t pass --layers)
  layers:
    include: [functions, events, indexes, edges]   # omit views
    exclude: [views]

  # File-level include/exclude (per layer; match file base name without .surql)
  files:
    exclude:
      views:
        - V_QuestionTypesense
      functions:
        - F_createUser

  # Cleanup rules (default should be include: "*" and optional excludes)
  cleanup:
    views:
      include: "*"
      exclude:
        - QuestionTypesense
        - QuestionAdmin
    events:
      include: "*"
      exclude:
        - UserCreateSubTables
    indexes:
      include: "*"
      exclude:
        - ExamKey

  bootstrap:
    functionsExclude:
      - utility/objectAssign
    modulesExclude:
      - post
    seedsExclude:
      - au
```

Modules (toggle capabilities per DB)
```yaml
modules:
  - post
  - instance
```

Typesense schema output
```yaml
typesense:
  enabled: true
  output: ./config/typesense
```

Graph spec generation (prune stale specs)
```yaml
graph:
  spec:
    pruneStale: true # remove spec folders not present in graph.mpdg (default: true)
    syncOnGenerate: true # run graph:spec before schema:generate (default: true)
```

Types output pruning
```yaml
graph:
  spec:
    pruneStale: true # also prunes generated types under app/types/schema/generated/tables
```

Bundle generation toggle
```yaml
defaults:
  bundlesEnabled: true # set false to skip Z_* bundle files
```

Per-table override (spec):
```yaml
bundle: false
```

Schema-kit module outputs (bundled into each target app)
```yaml
schemaKit:
  logModuleUpdates: false

requestSchema:
  projectOutput: modules/schema-kit/runtime/generated/request-schema.ts

typesense:
  projectOutput: modules/schema-kit/runtime/generated/typesense

databasesExport:
  projectOutput: modules/schema-kit/runtime/generated/databases.ts

modelsExport:
  projectOutput: modules/schema-kit/runtime/generated/models.ts
```

Per-project generated paths (defaults + overrides)
```yaml
paths:
  projects:
    - name: pmv2-mothership
      nuxtProjectRoot: ../../pmv2-mothership
      # Optional overrides (defaults derive from nuxtProjectRoot):
      # generated:
      #   types: <root>/app/types/schema/generated
      #   trpcRouters: <root>/server/trpc/routers
      #   piniaStores: <root>/app/stores/generated
      # imports:
      #   schemaTypes: '@schema/types'
      #   requestSchema: '@schema'
```

Tip: generated routers import from schema-kit aliases by default:
- `@schema` (RequestSchema)
- `@schema/types` (Zod types)
- `@schema/typesense/collections` (Typesense collections)
- `@schema/db` (databases export)
- `@schema/models` (models manifest)

Module overrides
- Place SURQL overrides under `config/bootstrap/modules/<module>/overrides/**`. If a file shares the same name/relative path as one in the module’s base/functions/migrations, the override is imported instead during `schema:bootstrap`.

Schema-kit runtime overrides (per app)
- Place runtime overrides under `schema/overrides/schema-kit/runtime/**` in the target app.
- Any file present here takes precedence over the generated schema‑kit module runtime file.
  - Example: `schema/overrides/schema-kit/runtime/composables/useCRUD.ts`
  - Example: `schema/overrides/schema-kit/runtime/plugins/trpc-client.ts`
  - Example: `schema/overrides/schema-kit/runtime/server/api/aliases.get.ts`

## Per-table / per-project targeting

- Tables: pass `--name <tableKey>` to `schema:generate` or import commands. The key matches the table migration filename (e.g., `exam`, `user.profile` becomes `user/profile` in CLI).
- Projects (client assets only): pass `--project <comma list>` to `schema:generate` to restrict type/router emission to specific `paths.projects[].name`.
- Databases (imports only): pass `--database <comma list>` to `schema:import` or `schema:import:functions` to target specific DB entries from `app.config.yaml`. Defaults to `environment.migrationTargets` or `environment.defaultDatabase`.

## Quick workflow recipes

1) Prototype CRUD functions without touching DB  
   `pnpm run schema:generate --name exam`

2) Ship functions to a single environment, honoring overrides  
   `pnpm run schema:import:functions --name exam --database uk`

3) Import just indexes for a table  
   `pnpm run schema:import --layers indexes --name exam --database uk`

4) Compare generated vs custom  
   - Generate: `pnpm run schema:generate --name exam` (outputs to `config/migrations/exam/`)  
   - Copy the generated `F_*` you want to tweak into your overrides folder and edit. Future imports will pick your version.

## Adding table events

- In a table spec (`*.table.yaml`), add an `events:` array. Each entry supports:
  - `name`: Optional. If omitted, tooling prefixes the table name (`<TableName>Event`).
  - `on`: Trigger(s) (`CREATE`, `UPDATE`, `DELETE`, etc.). String or list.
  - `when`: Optional condition expression (Surreal `WHEN` clause). If omitted, a condition is built from `on`.
  - `query`: The event body (SURQL). You can write it as a block string; the runner wraps it in `{ ... }` if not already.
  - `onExisting`: `OVERWRITE` (default) or `IF NOT EXISTS`.
  - `comment`: Optional description.

Example:
```yaml
events:
  - name: AuditCreate
    on: CREATE
    query: |
      {
        let $now = time::now();
        create audit_log content {
          table: "exam",
          rid: $after.id,
          action: "create",
          at: $now
        };
      }
    comment: "Capture create events for audits"
```

What happens:
- Generation writes `E_AuditCreate.surql` under `config/migrations/<table>/`.
- Importing events: `pnpm run schema:import --layers events --name exam --database uk` (or omit `--layers` to import all).
- Events auto-merge with system-generated post/delete cascade events; explicit `events:` wins by name when `onExisting`/`OVERWRITE` applies.

## Notes
- Import commands support `--dry-run` for safe preview of DB mutations.
- Bundles (`Z_*.surql`) are generated for reference and not imported; layer imports handle functions, events, views, indexes only.
- Use `pnpm run schema:generate --name user` to generate assets for a single table; omit `--name` to do all. (If using npm, insert `--` before flags.)
- Use `pnpm run schema:import --layers functions,indexes --name user --database test --dry-run` to push only the selected assets to specific database targets. (If using npm, insert `--` before flags.) The default database targets mirror `environment.migrationTargets` (or `defaultDatabase`).
- Bootstrap imports everything under `config/bootstrap/functions` plus modules listed in `modules:` (or passed via `--modules`). Module layout: `config/modules/<module>/<module>.surql` (base) and optional `functions/*.surql`.
- Module specs: place table specs under `config/bootstrap/modules/<module>/specs/*.table.yaml`; generated SURQL assets land in `<module>/migrations/` via `schema:generate:modules`. These assets are imported during `schema:bootstrap` alongside the module base/function files.
- Module overrides: put any SURQL file with the same name under `config/bootstrap/modules/<module>/overrides/**`. During bootstrap import, overrides win over base/functions/migrations; bundles are never imported.
- Seeds: place `config/bootstrap/seed/<dbkey>.surql`. Seeds are imported only by `schema:seed` (or alias `schema:bootstrap:seed`) and only the file matching the current database key is imported.

## Project Structure

```
node-ts-base/
├── src/                    # TypeScript source files
│   └── main.ts            # Main entry point
├── dist/                  # Compiled JavaScript (created after build)
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
├── .gitignore           # Git ignore rules
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## TypeScript Configuration

The `tsconfig.json` is configured with:
- **Strict mode** enabled for better type safety
- **ES2022** target for modern JavaScript features
- **CommonJS** modules for Node.js compatibility
- **Source maps** for debugging
- **Path aliases** (`@/*` maps to `src/*`)
- **Declaration files** generation

## Development Workflow

1. **Make changes** in `src/main.ts` or create new files in `src/`
2. **Use watch mode** (`npm run watch`) for automatic reloading
3. **Lint and format** your code regularly
4. **Build** when ready for production

## AI Assistant Instructions

When working with this template:

1. **Dependencies are already installed** - just run `npm install`
2. **Main entry point** is `src/main.ts`
3. **Use `npm run watch`** for development with auto-reload
4. **TypeScript is configured** with strict settings and modern features
5. **Linting and formatting** are set up and ready to use
6. **Build with `npm run build`** when ready for production

## Extending the Template

This template is designed to be extended for specific use cases:

- **Web scraping tools** - Add axios, cheerio, puppeteer
- **Database utilities** - Add database drivers and ORMs
- **CLI applications** - Add commander.js or yargs
- **API clients** - Add HTTP clients and validation libraries
- **File processing** - Add fs-extra, csv-parser, etc.

## Requirements

- **Node.js 18.0.0** or higher
- **npm** or **yarn** for package management

## License

MIT - Use this template freely for any project.
