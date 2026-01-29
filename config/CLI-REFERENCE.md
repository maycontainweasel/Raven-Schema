Title: Schema Tools CLI Reference
Scope: MPD Schema Tooling
Applies to: `apps/schema/src/cli.ts`

This file lists the CLI commands exposed by the schema tooling.  
Use it as the quick reference for new installations.

---

## Fresh project setup (first run)

From repo root:

```
pnpm -C apps/schema run project:setup
```

Target a specific project:

```
pnpm -C apps/schema run project:setup -- --project schema-docs
```

This checks for missing deps, missing Nuxt scaffolds, runtimeConfig blocks, and env files.  
Use `--fix` to auto‑create missing scaffolds and env files.

---

## Core generation

- `schema:generate`  
  Generate types, routers, functions, views, indexes, bundles.  
  Examples:
  - `pnpm -C apps/schema run schema:generate`
  - `pnpm -C apps/schema run schema:generate -- --name exam`
  - `pnpm -C apps/schema run schema:generate -- --project schema-docs,pmv2-admin`

- `graph:spec`  
  Sync `graph.mpdg` into specs.

- `graph:spec:live`  
  Same as above but in live mode.

- `schema:generate:modules`  
  Generate module assets from module specs.

---

## Module + project sync

- `schema-kit:sync`  
  Sync schema‑kit module into target apps.
  Example:
  - `pnpm -C apps/schema run schema:module:sync -- --project schema-docs`

- `module:ensure`  
  Ensure schema‑kit module present and registered in target apps.

- `project:clean [name]`  
  Remove generated assets from target apps and reset `_app.ts`.

---

## Import / export

- `schema:import`  
  Import all generated layers into a database.

- `schema:import:functions`  
  Import functions only.

- `assets:diff`  
  Compare local assets manifest to remote.

- `assets:sync`  
  Sync local manifest to remote schemaAssets.

---

## UI tools

- `ui:generate`  
  Generate admin UI pages from UI specs.

- `ui:override:create <model>`  
  Scaffold UI override for create dialog.

---

## Other utilities

- `site:create [name]`  
  Generate a Nuxt app scaffold from a local template and write a site spec.  
  Examples:
  - `pnpm -C apps/schema run site:create my-site`
  - `pnpm -C apps/schema run site:create -- --template templates/nuxt-4.3.0 --target apps/my-site`
  - `pnpm -C apps/schema run site:create -- my-site --install`
  Notes:
  - Writes `nuxt.config.generated.ts` from `nuxtConfig` in the site spec.
  - Preserves `nuxt.config.overrides.ts` for manual overrides.
  - Merges `packageJson` from the site spec into `package.json` (arrays override, objects merge).

- `site:delete [name]`  
  Remove nginx server block, certs, and hosts entry for a site.  
  Examples:
  - `pnpm -C apps/schema run site:delete my-site`
  - `pnpm -C apps/schema run site:delete -- --spec sites/example.yaml`
  - `pnpm -C apps/schema run site:delete -- --host my-site.schema.dev --yes`
  - `pnpm -C apps/schema run site:delete -- --remove-app`

- `request-schema:generate`  
  Generate RequestSchema helper.

- `databases:generate`  
  Generate databases export.

- `models:generate`  
  Generate models manifest.

- `functions:generate [name]`  
  Generate CRUD Surreal functions.

- `table:create <name>`  
  Scaffold a table migration.

- `import:functions [name]`  
  Import functions into target DBs.

- `context:scaffold`  
  Scaffold a TRPC context override (`schema/context/trpc.ts`) into target app(s).

- `nginx:config`  
  Create `config/nginx.yaml` (and the nginx template if missing), then open it in Sublime.
  Example:
  - `pnpm -C apps/schema run schema:nginx:config`

- `nginx:setup`  
  Create/update an nginx server config, run `mkcert`, update `/etc/hosts`, and restart nginx.
  Examples:
  - `pnpm -C apps/schema run schema:nginx:setup -- --name public.lucky.dev --port 3000 --apply`
  - `pnpm -C apps/schema run schema:nginx:setup -- --name public.lucky.dev --port 3000 --listen-port 4443 --apply`

---

## Flags (common)

- `--name <table>`: target a single table
- `--project <names>`: target specific apps
- `--database <name>`: target a DB instance
- `--dry-run`: print without applying
- `--sync-graph`: sync graph before generate
- `--no-sync-graph`: skip graph sync
