Title: App Config Reference
Scope: MPD Schema Tooling
Applies to: `config/app.config.yaml`

This document explains every top‑level section and common fields used in `app.config.yaml`.
When new options are added, update this file.

---

## project

Metadata for the schema tooling workspace.

- `name` (string): display name for the schema workspace.
- `description` (string): human description for the project.

## tooling

Repo integration settings.

- `repoMode` (string): repo layout mode. Example: `turbo`.

## environment

Global runtime defaults for tooling commands.

- `defaultDatabase` (string): default instance key used when none specified.
- `migrationTargets` (string[]): list of database keys to import or target by default.

## features

Feature toggles for generation.

- `schemaMode` (string): SurrealDB schema mode default (e.g. `schemaless`, `schemafull`).
- `autoApplyMigrations` (boolean): if true, generation may auto‑import assets (use with care).
- `emitDocumentation` (boolean): enable documentation generation outputs.

## databases

Defines database targets (instances). Each key is a database name (e.g. `test`, `pm`, `uk`).

Per‑database fields:

- `active` (boolean): whether this instance is active in tooling.
- `url` (string): base URL for SurrealDB.
- `namespace` (string): SurrealDB namespace.
- `database` (string): SurrealDB database name.
- `username` (string): SurrealDB username.
- `password` (string): SurrealDB password.
- `allowScripting` (boolean): whether to allow script execution.
- `root` (boolean): mark as a root instance (e.g. mothership).

## paths

Filesystem locations used by the tooling.

- `migrations` (string): base folder for specs (`config/specs`).
- `surrealOutput` (string): compiled SurrealDB output.
- `docsOutput` (string): compiled docs output.
- `modules` (string): modules root (e.g. `config/bootstrap/modules`).
- `overrides.functions` (string): overrides folder for functions.
- `projects` (array): list of target apps for generated assets.

### paths.projects entries

Each project entry supports:

- `name` (string): project name.
- `active` (boolean): set `false` to skip this project during generation.
- `nuxtProjectRoot` (string): path to Nuxt app root.
- `generated.types` (string): target for generated TS types.
- `generated.trpcRouters` (string): target for TRPC routers.
- `generated.piniaStores` (string): target for Pinia stores.
- `imports.schemaTypes` (string): import alias for schema types.
- `imports.requestSchema` (string): import alias for RequestSchema.

## ui

Admin UI generator settings.

- `specsPath` (string): UI specs folder.
- `projects` (string[]): which projects receive UI outputs.

## trpc

TRPC generation settings.

- `httpEndpoint` (string): TRPC endpoint path.
- `generateTestPages` (boolean): emit test pages.
- `routerNamespace` (string): router namespace (e.g. `admin`).
- `contextImport` (string): import path for TRPC context.

## defaults

Schema defaults used when not explicitly set.

- `schemaMode` (string)
- `postRecordEnabled` (boolean)
- `bundlesEnabled` (boolean)

## events

Controls how generated event files are written.

- `fileMode` (string): `split` or `table`
  - `split` (default): one file per event (e.g., `E_UserPostCreate.surql`)
  - `table`: one file per table containing all events (e.g., `E_UserPost.surql`)

## schemaKit

Controls schema‑kit module synchronization into target apps.

- `logModuleUpdates` (boolean): enable logs for module sync.
- `validation.strict` (boolean): when true (default) missing feature requirements throw and stop app startup.
- `module.mode` (string): `copy` or `shared`.
- `module.sync` (string): `auto`, `force`, `off`.
- `module.source` (string): source folder for module copy.
- `module.sharedPath` (string): shared path when `mode: shared`.
- `features` (object): default feature toggles for runtime plugins.
  - `trpcClient` (boolean): enable client TRPC plugin.
  - `trpcServer` (boolean): enable server TRPC handler support.
  - `typesense` (boolean): enable Typesense client plugin.
  - `surrealdb.enabled` (boolean): enable SurrealDB server plugin.
  - `redis.enabled` (boolean): enable Redis server plugin.
  - `sentry.enabled` (boolean): master Sentry toggle.
  - `sentry.client` / `sentry.server` (boolean): per-side toggles.
  - `sentry.sourceMaps` (boolean): enable Sentry source map upload in Vite.
  - `auth.enabled` (boolean): enable authentication feature checks.
- `projects` (array): per‑project overrides (match by project name).
  - `name` (string): project name.
  - `features` (object): override any feature toggles above.

Schema‑kit runtime overrides (per app)
- Put overrides in `schema/overrides/schema-kit/runtime/**` inside each target app.
- Any file placed there takes precedence over the generated module runtime file.
- Useful for custom composables/plugins/handlers without forking schema‑kit.

## fileSync

Exclude files from schema-to-app copy operations.

- `globalExclude.module` (array): paths to skip during `schema-kit` module sync for every app.
- `globalExclude.layers` (array): paths to skip during layer sync for every app.
- `globalExclude.docs` (array): paths to skip during schema docs sync for every app.
- `projects` (array): per-project exclusions matched by `paths.projects[].name`.
  - `name` (string): target project name.
  - `exclude.module` (array): skip these `modules/schema-kit/**` files for that app.
  - `exclude.layers` (array): skip these `layers/**` files for that app.
  - `exclude.docs` (array): skip these `docs/**` files for that app.

Notes:
- Paths are matched relative to the target app root.
- Wildcards are supported with `*` and `**`.
- `schema-kit` force sync preserves excluded files before deleting `modules/schema-kit`, then restores them after sync.

## tooling

Project setup helpers.

- `repoMode` (string): `turbo` or `standalone`.
- `projectSetup.requiredDependencies` (array): override the default required dependency list.
- `projectSetup.excludeDependencies` (array): remove specific packages from the required list.
- `projectSetup.includeSharedPackage` (boolean): include `@pmv2/shared` in required dependencies (default: true).

## databasesExport

Where to emit generated database export module.

- `projectOutput` (string): path relative to each app root.

## modelsExport

Where to emit generated models manifest.

- `projectOutput` (string): path relative to each app root.

## requestSchema

RequestSchema generation.

- `output` (string): shared output location (monorepo).
- `projectOutput` (string): per‑app output location.
- `includeInactive` (boolean): include inactive instances.

## typesense

Typesense schema generation.

- `enabled` (boolean)
- `collectionMinLength` (number)
- `output` (string | string[]): output directory(s)
- `projectOutput` (string): per‑app output
- `settings` (object): default Typesense settings

## graph

MPDG graph inputs and spec output settings.

- `input` (string): MPDG graph file path.
- `output` (string): compiled graph TS.
- `mermaidOutput` (string): mermaid graph output.
- `spec.mode` (string): `staging` or `live`.
- `spec.stagingDir` (string)
- `spec.liveDir` (string)
- `spec.conflictPolicy` (string): `skip`, `overwrite`, `only-new`.
- `spec.pruneStale` (boolean)

## modules

Explicit modules to include.

- Array of module names under `config/bootstrap/modules`.

## importFilters

Default filters for schema import/generate commands.

- `onlyChanged` (boolean): import only changed assets by default.
- `tables` (array): tables to include when no CLI `--name`.
- `tablesExclude` (array): tables to exclude.
- `layers.include` / `layers.exclude` (array): filter layers (functions, views, indexes, edges).
- `files.include` / `files.exclude` (object): per‑layer file filters.
- `cleanup.*` (object): cleanup rules for generated assets.
- `bootstrap.functions` (array): optional bootstrap function files.
- `bootstrap.modules` (array): optional module list for import.
- `bootstrap.seeds` (array): optional seed list.

## instance (module defaults)

Default instance table fields.

- `active` (boolean)
- `fields`: fields defined for the instance table.

## taxonomies (module defaults)

Default taxonomy + term fields used when not overridden.

- `taxonomies.fields`: default taxonomy fields.
- `terms.fields`: default term fields.

## documentation

Docs generator settings.

- `documentation.enabled` (boolean)
- `documentation.format` (string)
- `documentation.includeSurrealExamples` (boolean)
- `documentation.locations` (string[])
- `schemaApp.enabled` (boolean)
- `schemaApp.location` (string)
