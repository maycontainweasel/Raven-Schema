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

Alias for site-aware setups:

```
pnpm -C apps/schema run site:project:setup -- --project admin
```

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

- Helios standard setup (new app)
  1. `pnpm -C apps/schema run site:create <name> -- --setup`
  2. `pnpm -C apps/schema run site:layers:add <name> helios`
  3. `pnpm -C apps/schema run site:helios:setup <name>`
  4. Start the app and open `/helios`, then click **Commit** once per breakpoint.
  Notes:
  - `site:helios:setup` now ensures a safe root route by creating `app/pages/index.vue` with `/ -> /helios` redirect when missing.
  - It also ensures `app/app.vue` is Nuxt page-shell compatible when the file is missing or still using `NuxtWelcome`.
  - It now seeds baseline Helios files under `app/helios/{fragments,generated,scss}` so `/helios` can run before first manual commit.

- `site:create [name]`  
  Generate a Nuxt app scaffold from a local template and write a site spec.  
  Examples:
  - `pnpm -C apps/schema run site:create my-site`
  - `pnpm -C apps/schema run site:create -- --template templates/nuxt-4.3.0 --target apps/my-site`
  - `pnpm -C apps/schema run site:create -- my-site --install`
  Notes:
  - Writes `nuxt.config.generated.ts` from `nuxtConfig` in the site spec.
  - Use `nuxt.config.ts` for manual overrides (merged after generated + runtime).
  - Merges `packageJson` from the site spec into `package.json` (arrays override, objects merge).
  - Writes `.env` and `.env.staging` when `env` is present in the site spec.
  - Writes `ecosystem.config.cjs` when `deploy.ecosystem` is present.
  - If the site spec already includes `helios`, creates a safe root redirect (`/ -> /helios`) when missing.
  Flags:
  - `--nginx` run nginx setup
  - `--nginx-config` capture nginx settings without applying
  - `--no-nginx` skip nginx prompts entirely
  - `--admin` include the `admin-core` layer in the site spec
  - `--setup` run `site:setup --fix` after creation

- `site:setup [name]`  
  Run project setup checks for a site spec (server scaffolds, runtimeConfig, env files).  
  Examples:
  - `pnpm -C apps/schema run site:setup public`
  - `pnpm -C apps/schema run site:setup -- --spec sites/public.yaml --fix`

- `site:config:sync [name]`  
  Regenerate `nuxt.config.generated.ts` from `sites/<slug>.yaml` without touching layers/packages.  
  Example:
  - `pnpm -C apps/schema run site:config:sync my-site`

- `site:delete [name]`  
  Remove nginx server block, certs, and hosts entry for a site.  
  Examples:
  - `pnpm -C apps/schema run site:delete my-site`
  - `pnpm -C apps/schema run site:delete -- --spec sites/example.yaml`
  - `pnpm -C apps/schema run site:delete -- --host my-site.schema.dev --yes`
  - `pnpm -C apps/schema run site:delete -- --remove-app`
  - `pnpm -C apps/schema run site:delete -- --keep-spec`
  - `pnpm -C apps/schema run site:delete -- --keep-nginx`

- `site:env:sync [name]`  
  Generate `.env` and `.env.staging` from the site spec `env` block.  
  Examples:
  - `pnpm -C apps/schema run site:env:sync my-site`
  - `pnpm -C apps/schema run site:env:sync -- --spec sites/example.yaml`

- `site:env:sync:yaml [name]`  
  Generate `.env`, `.env.staging`, `env.config.cjs`, and `nuxt.config.runtime.ts` from `env.yaml`.  
  Examples:
  - `pnpm -C apps/schema run site:env:sync:yaml -- my-site`
  - `pnpm -C apps/schema run site:env:sync:yaml -- --app apps/testapp --env env.yaml`

- `site:env [name]`  
  Alias for `site:env:sync:yaml`.  
  Example:
  - `pnpm -C apps/schema run site:env -- testapp`

- `site:deploy:init [name]`  
  SSH setup for nginx + app folder + PM2 placeholder.  
  Examples:
  - `pnpm -C apps/schema run site:deploy:init my-site`
  - `pnpm -C apps/schema run site:deploy:init -- --host mpire.live --domain mysite.mpire.live --port 4041`

- `site:deploy:setup [name]`  
  Alias for the initial SSH setup (preferred name).  
  Example:
  - `pnpm -C apps/schema run site:deploy:setup my-site`

- `site:deploy [name]`  
  Build, sync `.output` to the remote `output/` folder, sync `ecosystem.config.cjs`, and reload PM2 (runs setup first if needed).  
  Example:
  - `pnpm -C apps/schema run site:deploy my-site`

- `site:adopt [name]`  
  Adopt an existing Nuxt app into the site system.  
  Examples:
  - `pnpm -C apps/schema run site:adopt admin`
  - `pnpm -C apps/schema run site:adopt -- --app apps/admin --force`
  - `pnpm -C apps/schema run site:adopt -- --no-update-app`

- `site:layers:sync [name]`  
  Sync site YAML layers from `app.config.yaml`.  
  Examples:
  - `pnpm -C apps/schema run site:layers:sync`
  - `pnpm -C apps/schema run site:layers:sync -- --project admin`

- `site:layers:push [name]`  
  Push layer source from `apps/schema/layers` into app layer copies (`apps/<site>/layers`).  
  Examples:
  - `pnpm -C apps/schema run site:layers:push heliosadmin`
  - `pnpm -C apps/schema run site:layers:push -- --project heliosadmin --layers-sync force`

- `site:layers:pull [name]`  
  Pull app layer copies back into `apps/schema/layers` (useful if edits were made in an app copy).  
  Examples:
  - `pnpm -C apps/schema run site:layers:pull heliosadmin`
  - `pnpm -C apps/schema run site:layers:pull -- --project heliosadmin --layers helios-ui,helios-admin --delete`

- `site:layers:status [name]`  
  Show configured and available layers for a site (plus `layers.lock.json` if present).  
  Examples:
  - `pnpm -C apps/schema run site:layers:status public`
  - `pnpm -C apps/schema run site:layers:status -- --spec sites/public.yaml`

- `site:layers:add [name] <layers..>`  
  Add one or more layers to a site, sync layer files, sync packages, and optionally install.  
  Examples:
  - `pnpm -C apps/schema run site:layers:add public scale-kit`
  - `pnpm -C apps/schema run site:layers:add public scale-kit,auth`
  Notes:
  - Adding `helios` now also creates a safe root redirect (`/ -> /helios`) when missing.
  - After adding `helios`, run `site:helios:setup` to generate Helios setup fragments and Uno options.

- `site:helios:setup [name]`
  Add/configure the `helios` layer baseline and write Helios setup fragments.
  Examples:
  - `pnpm -C apps/schema run site:helios:setup target`
  - `pnpm -C apps/schema run site:helios:setup -- --spec sites/target.yaml --yes`
  Notes:
  - Seeds baseline files under `app/helios/{fragments,generated,scss}` when missing.
  - Creates `app/helios/fragments/setup.json` and default `app/helios/fragments/type.json` if missing.
  - Ensures `app/pages/index.vue` redirects `/` to `/helios` when no root page exists.
  - Ensures `app/app.vue` uses a Nuxt page shell when missing or still on `NuxtWelcome`.

- `site:helios:doctor [name]`
  Validate Helios setup health for a target site/app.
  Examples:
  - `pnpm -C apps/schema run site:helios:doctor heliosadmin`
  - `pnpm -C apps/schema run site:helios:doctor -- --spec sites/heliosadmin.yaml --json`
  Checks:
  - Baseline Helios artifacts under `app/helios/{fragments,generated,scss}`
  - `nuxt.config.additions.ts` Helios css/module/unocss bridge tokens
  - `uno.config.ts` Helios merge bridge tokens
  - Required Helios packages in `package.json`
  - App shell/root page and `layers.lock.json` health hints
  Exit code:
  - Returns non-zero when required checks fail.

- `site:layers:remove [name] <layers..>`  
  Remove layers from a site (use `--force` to remove `schema-core`).  
  Examples:
  - `pnpm -C apps/schema run site:layers:remove public scale-kit`
  - `pnpm -C apps/schema run site:layers:remove public schema-core -- --force`

- `layers:status [name]`  
  Show layer versions for site(s), using `layers.lock.json` when available.  
  Examples:
  - `pnpm -C apps/schema run layers:status`
  - `pnpm -C apps/schema run layers:status -- --project admin`

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
