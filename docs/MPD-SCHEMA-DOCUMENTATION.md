# MPD Schema Application Documentation

Audience: developers and operators working with `apps/schema`  
Scope: how the schema system is used in day-to-day development, what files matter, and how to get a working application running

## 1. Why This Application Exists

The schema application exists to keep backend behavior consistent across multiple apps.

In this codebase, we have multiple frontends and runtime contexts that all need to talk to the same data model. Without a central schema workflow, teams end up duplicating SurrealDB logic in different places, and small changes become risky because one app updates while another is left behind.

`apps/schema` is the place where we define model intent once, generate the baseline backend assets, and distribute those assets to the target applications in a predictable way.

## 2. What This Application Produces

From a practical perspective, this workspace can generate and manage:

- SurrealDB assets (functions, views, events, indexes, edges)
- TRPC router scaffolds
- generated type assets for apps
- shared schema-kit runtime outputs (request schema, model/db exports, typesense outputs)
- site/layer/environment scaffolding for app deployment workflows

The important point is that this is not only a code generator. It is a coordination layer between model definition, database behavior, and app runtime consistency.

## 3. How To Think About The Workflow

When working in this system, think in this order:

1. Define intent
: what the model should look like and what behavior it needs.

2. Generate baseline assets
: produce deterministic outputs for DB and apps.

3. Override where needed
: keep custom business logic in explicit override paths.

4. Import and sync
: apply DB assets and sync app runtime/layers.

5. Validate in app context
: check generated routers/types/runtime and run the target app.

This keeps development structured and makes it easier for another developer to understand where a behavior comes from.

## 4. Core Directory Map (And Why Each Area Matters)

Workspace root:

- `apps/schema`

Core files/folders:

- `config/app.config.yaml`
: main configuration contract. This controls databases, project targets, module/layer behavior, and generation/import defaults.

- `config/graph.mpdg`
: human-friendly DSL source where model intent starts.

- `config/specs/**`
: resolved model specs used by generators.

- `config/migrations/**`
: generated SURQL assets organized by table.

- `config/bootstrap/**`
: shared bootstrap functions/modules/seeds.

- `config/overrides/**`
: manual overrides that should win over generated defaults.

- `sites/*.yaml`
: site-level app and deployment definitions.

- `layers/*`
: reusable layers used to compose app behavior by site/location.

- `src/cli.ts`
: primary command interface for generation, import, sync, and deploy operations.

## 5. Required Configuration Files

## 5.1 `config/app.config.yaml`

This is the primary file to understand first. It defines:

- database targets (`databases`, `environment.defaultDatabase`, `migrationTargets`)
- where specs/modules/overrides live (`paths.*`)
- which apps receive generated outputs (`paths.projects`)
- schema-kit feature toggles and module sync behavior (`schemaKit`)
- layer defaults and sync settings (`layers`)
- default import filtering behavior (`importFilters`)

If this file is misconfigured, generation may still run, but outputs/imports will not target the correct places.

## 5.2 `config/graph.mpdg`

This is where model intent is authored. The typical usage is:

- define or update a model
- express capabilities (crud/router/views/typesense/etc.)
- run graph/spec generation
- generate assets from resulting specs

## 5.3 `sites/<name>.yaml`

Site files describe app-level composition and deployment intent. They control:

- where the app lives (`target`)
- what layers it uses (`layers`)
- Nuxt generated config defaults (`nuxtConfig`)
- deployment settings (`deploy`)

## 5.4 `<app>/env.yaml`

`env.yaml` is the source for runtime/env outputs. It is used to generate:

- `.env`
- `.env.staging`
- `env.config.cjs`
- `nuxt.config.runtime.ts`

Use this to keep environment values centralized per app.

## 6. Typical Developer Workflows

## 6.1 Add a new feature/model

If you are adding a feature that requires data changes, the usual path is:

1. Update `config/graph.mpdg` with the new model/fields/capabilities.
2. Run `graph:spec` to produce updated specs.
3. Run `schema:generate` so baseline assets are generated.
4. If needed, place custom logic into override folders (rather than editing generated output).
5. Import assets (`schema:bootstrap`, `schema:import`) into the target DB.
6. Sync module/layers if app runtime changed.
7. Run the target app and validate behavior.

This ensures every app that depends on these models receives a consistent baseline.

## 6.2 Change an existing model safely

For existing models, the safest pattern is:

1. make the model change in `graph.mpdg`
2. regenerate specs/assets
3. compare generated changes in `config/migrations/**`
4. add or update override files for any non-standard business logic
5. import to a controlled DB target first (`--database`)
6. validate app behavior before broader rollout

This avoids silent drift and keeps custom behavior explicit.

## 6.3 Add custom DB behavior without breaking generation

If generated CRUD/functions are not enough for a specific case:

- put custom SURQL in override locations (`config/overrides/functions/...`)
- keep generated files untouched
- let import precedence apply your custom file

This gives flexibility while preserving generator benefits.

## 7. Override Strategy (Critical)

Generated assets are the baseline, not the only source.

Use overrides intentionally:

- schema function overrides:
  `config/overrides/functions/<table>/F_*.surql`

- module overrides:
  `config/bootstrap/modules/<module>/overrides/**`

- app schema-kit runtime overrides:
  `<app>/schema/overrides/schema-kit/runtime/**`

- per-app layer overrides:
  `<app>/layers/<layer>/layer.override.yaml`

General rule: custom behavior should live in override paths so regeneration stays safe.

## 8. Commands By Task (With Context)

## 8.1 Graph/spec

- `pnpm -C apps/schema run graph:spec`
: Use during normal development after editing MPDG.

- `pnpm -C apps/schema run graph:spec:live`
: Use when you intentionally want live-mode spec behavior.

## 8.2 Generation

- `pnpm -C apps/schema run schema:generate`
: Main generation command for types/routers/functions/views/indexes/runtime outputs.

- `pnpm -C apps/schema run schema:generate -- --name <table>`
: Use when iterating on one table to reduce blast radius.

- `pnpm -C apps/schema run schema:generate:modules`
: Generates module assets from module specs.

## 8.3 Import

- `pnpm -C apps/schema run schema:bootstrap`
: Imports bootstrap functions/modules (and optionally seeds/schema functions).

- `pnpm -C apps/schema run schema:import`
: Imports generated schema layers (functions/events/views/indexes/edges).

- `pnpm -C apps/schema run schema:import:functions`
: Functions-only import pass.

- `pnpm -C apps/schema run schema:bootstrap:seed`
: Seed-only import path.

- `pnpm -C apps/schema run schema:indexes:rebuild`
: Rebuild indexes after import cycles.

## 8.4 App runtime/layers

- `pnpm -C apps/schema run schema:module:sync`
: Sync schema-kit module into target apps.

- `pnpm -C apps/schema run schema:layers:sync`
: Sync layer sources into apps and update lock/extends state.

- `pnpm -C apps/schema run layers:status`
: Quick layer version/hash visibility.

## 8.5 Site/deploy

- `pnpm -C apps/schema run site:create <name>`
: Create a site-managed app scaffold.

- `pnpm -C apps/schema run site:setup <name> -- --fix`
: Ensure missing setup pieces are created/fixed.

- `pnpm -C apps/schema run site:env <name>`
: Generate env/runtime outputs from `env.yaml`.

- `pnpm -C apps/schema run site:deploy:init <name>`
: Prepare remote environment.

- `pnpm -C apps/schema run site:deploy <name>`
: Build/sync/reload deployment flow.

## 9. Layers, Sites, and Location-Specific Behavior

The site/layer model is how location-specific behavior is introduced without forking the entire app.

Typical approach:

- keep shared behavior in base app + shared layers
- apply location-specific differences via dedicated layers
- use per-app `layer.override.yaml` for local adjustments

This gives controlled multi-location deployment behavior while keeping the main code path shared.

## 10. Deployment Mechanics (Conceptual)

Deployment combines:

- site spec (`sites/<name>.yaml`)
- app env source (`<app>/env.yaml`)
- generated runtime/env outputs
- deploy commands with safety checks

`site:deploy:init` prepares remote infrastructure details.  
`site:deploy` performs build/sync/PM2 reload behavior using configured site/deploy settings.

## 11. Recommended Reading Order

1. `apps/schema/docs/MPD-SCHEMA-DOCUMENTATION.md`
2. `apps/schema/docs/AI-READ-HERE.md`
3. `apps/schema/docs/graph-dsl-profile.md`
4. `apps/schema/docs/mpdg-tag-glossary.md`
5. `apps/schema/config/app.config.yaml`
6. `apps/schema/src/cli.ts`
7. `apps/schema/src/lib/surqlImporter.ts`
8. `apps/schema/src/lib/modulesImporter.ts`
9. `apps/schema/docs/DEPLOYMENT-PIPELINE-PROJECT.md`

## 12. Official App Context

Use this assumption while documenting and validating behavior:

- official PMV2 apps: `apps/pmv2-public`, `apps/pmv2-session`, `apps/pmv2-dashboard`
- standardized site-managed equivalents: `apps/public`, `apps/session`, `apps/dashboard`

## 13. Key Implementation Notes

- Keep generated and override responsibilities separate.
- Prefer adding custom logic via override paths, not editing generated files directly.
- Keep `app.config.yaml`, `sites/*.yaml`, and per-app `env.yaml` aligned.
- Validate DB target selection before import commands.
- Use scoped generation/import (`--name`, `--database`) for safer incremental changes.

## 14. Starting Point for a Working Application

This section provides a concrete baseline configuration for a working `public` app driven by `apps/schema`.

## 14.1 Example `config/app.config.yaml` (baseline)

```yaml
version: 0.1

project:
  name: passmed-schema

environment:
  defaultDatabase: local
  migrationTargets:
    - local

databases:
  local:
    active: true
    url: http://127.0.0.1:8000
    namespace: appns
    database: app_v1
    username: root
    password: root
    allowScripting: true
    root: true

paths:
  migrations: ./config/specs
  modules: ./config/bootstrap/modules
  overrides:
    functions: ./config/overrides/functions
  projects:
    - name: public
      nuxtProjectRoot: ../public
      active: true
      layers:
        - schema-core
        - pm-za

schemaKit:
  module:
    mode: force
    sync: force
    source: module
  features:
    trpcClient: true
    trpcServer: true
    typesense: true
    surrealdb:
      enabled: true
    redis:
      enabled: false
    sentry:
      enabled: false
      client: false
      server: false
      sourceMaps: false

layers:
  source: ./layers
  sync: force
  defaults:
    - schema-core
```

Notes:

- If targeting legacy app folders, replace `nuxtProjectRoot` with `../pmv2-public`.
- Keep DB names aligned with `--database` values used in CLI commands.

## 14.2 Example `sites/public.yaml`

```yaml
name: public
slug: public
template: templates/nuxt-4.3.0
target: apps/public

layers:
  - schema-core
  - pm-za

nuxtConfig:
  devServer:
    host: 0.0.0.0
    port: 8301
  vite:
    server:
      allowedHosts:
        - public.v3.passmed.local
      origin: https://public.v3.passmed.local:4443
      hmr:
        protocol: wss
        host: public.v3.passmed.local
        clientPort: 4443
        path: /__vitews

deploy:
  host: your-server-host
  domain: public.example.com
  port: 8301
  remoteName: public
  remoteRoot: $HOME
  remotePath: public
  remoteNginxSudo: true
  overwriteNginx: true
  overwriteApp: true
  startPm2: true
  ssl:
    email: devops@example.com
    redirect: true
```

## 14.3 Example `apps/public/env.yaml`

```yaml
NUXT_PUBLIC_API_URL: /
NUXT_SURREALDB_URL: http://127.0.0.1:8000
NUXT_SURREALDB_USER: root
NUXT_SURREALDB_PASS: root
NUXT_SURREALDB_NAMESPACE: appns
NUXT_SURREALDB_DATABASE: app_v1

NUXT_TYPESENSE_HOST: http://127.0.0.1
NUXT_PUBLIC_TYPESENSE_HOST: http://127.0.0.1
NUXT_TYPESENSE_API_KEY: xyz
NUXT_PUBLIC_TYPESENSE_API_KEY: xyz
NUXT_TYPESENSE_PORT: 8108
NUXT_PUBLIC_TYPESENSE_PORT: 8108
NUXT_TYPESENSE_ENABLE_CORS: true
NUXT_PUBLIC_TYPESENSE_ENABLE_CORS: true

NUXT_SESSION_SECRET: replace-with-strong-secret
NUXT_COOKIE_DOMAIN: localhost
NUXT_SESSION_COOKIE: sid

NUXT_SITEURL: https://public.v3.passmed.local:4443
```

## 14.4 Command Sequence (first working setup)

From repo root:

```bash
pnpm -C apps/schema run graph:spec
pnpm -C apps/schema run schema:generate -- --project public
pnpm -C apps/schema run schema:generate:modules
pnpm -C apps/schema run schema:bootstrap -- --database local
pnpm -C apps/schema run schema:import -- --database local
pnpm -C apps/schema run site:setup public -- --fix
pnpm -C apps/schema run site:env public
pnpm -C apps/schema run schema:module:sync -- --project public
pnpm -C apps/schema run schema:layers:sync -- --project public
```

Then run the app:

```bash
pnpm -C apps/public dev
```

## 14.5 Quick Validation Checklist

- `apps/public/modules/schema-kit/runtime/generated/*` exists.
- `apps/public/server/trpc/routers/generated/index.ts` exists.
- `apps/public/nuxt.config.generated.ts` and `apps/public/nuxt.config.runtime.ts` exist.
- DB has imported bootstrap + schema assets for selected tables.
- Public app starts without module/layer resolution errors.
