# Sites (Schema Tooling)

This folder is the source of truth for app-level site specs (`sites/<slug>.yaml`).
Site specs drive:

- app scaffold target (`target`)
- layer composition (`layers`)
- generated Nuxt defaults (`nuxtConfig`)
- site deploy behavior (`deploy`)
- schema-kit feature toggles (`schemaKit`)

For broader platform context, also see:

- `apps/schema/docs/MPD-SCHEMA-DOCUMENTATION.md` (section `5.3 sites/<name>.yaml`)
- `apps/schema/config/CLI-REFERENCE.md`

## Site YAML Contract

Required keys:

- `name: string`
- `slug: string`
- `template: string`
- `target: string`

Optional top-level keys:

- `layers: string[]`
- `nuxtConfig: object`
- `packageJson: object`
- `env: object`
- `deploy: object`
- `capabilities: object` (legacy alias)
- `schemaKit.capabilities: object`
- `schemaKit.features: object`

Note: unknown keys are tolerated and preserved in the YAML object model.

## Deploy Block Reference

`deploy` is used by `site:deploy*`, `site:pm2:logs`, and related commands.

Common keys:

- `host: string` SSH host alias (for example `pmca-public`)
- `user: string` optional SSH user
- `port: number` upstream app port
- `domain: string` site domain for full deploy pipeline
- `appDir: string` remote app directory
- `remoteBase: string` base for `remotePath` (default `$HOME`)
- `remoteRoot: string` parent directory for app folder
- `remotePath: string` path under `remoteBase`; used to derive `remoteRoot`, `remoteName`, `appDir`
- `remoteName: string` remote app name
- `pm2Name: string` PM2 process name
- `pm2Command: string` PM2 command or absolute path
- `buildCommand: string` local build command
- `rsyncDelete: boolean` enable `--delete` when syncing build output
- `restartNginx: boolean` restart nginx after deploy
- `nginxSitesEnabled: string` nginx sites-enabled path
- `restartCommand: string` nginx restart/reload command
- `remoteNginxSudo: boolean` use sudo for nginx/certbot actions
- `overwriteNginx: boolean` init step behavior
- `overwriteApp: boolean` init step behavior
- `startPm2: boolean` init step behavior
- `pm2Env: object` extra env merged into generated ecosystem app env
- `ecosystem: object` full ecosystem override (if set, generated template is skipped)
- `ssl.email: string`
- `ssl.redirect: boolean`
- `ssl.enabled: boolean` optional explicit enable flag

### `deploy.targets` (Multi-target overrides)

`deploy.targets` lets one site spec contain multiple deployment targets (for example `za`, `ca`).

Example:

```yaml
deploy:
  ssl:
    email: ""
    redirect: true
  targets:
    za:
      host: pmza-public
      appDir: /home/mpire/passmed-public
      pm2Name: pm-public
      port: 3123
    ca:
      host: pmca-public
      appDir: /home/mpire/passmed-public
      pm2Name: pm-public
      port: 3123
```

Selection:

- `--target za` applies `deploy.targets.za`
- `--target ca` applies `deploy.targets.ca`

Merge behavior:

- base `deploy` is deep-merged with selected target override
- `deploy.targets` is removed from the resolved deploy object before execution
- target values take precedence over base deploy values

## Nuxt Config Generation Model

Generated Nuxt apps merge config from:

1. `nuxt.config.generated.ts` from `sites/<slug>.yaml` (`nuxtConfig` + layer composition)
2. `nuxt.config.runtime.ts` from `env.yaml`-derived runtime values
3. `nuxt.config.additions.ts` manual additions
4. `nuxt.config.ts` manual highest-priority overrides

Current merge behavior:

- arrays like `modules`, `css`, `build.transpile` are concatenated in additions
- objects are deep merged
- explicit values in `nuxt.config.ts` override previous merged values

## Local Dev URL Banner

When a site has `NUXT_SITEURL` in `env.yaml`, schema site tooling now treats that as the preferred local browser URL.

- `site:create` seeds `NUXT_SITEURL` from nginx-aware site defaults when available
- `site:env` / `site:env:sync:yaml` writes `.env` from `env.yaml`
- package sync writes `scripts/schema-dev.mjs` into the target app and wraps the app `dev` script
- running `pnpm run dev` or `bun run dev` in the app prints the local site URL before Nuxt starts

This is intended for local nginx-backed domains like `https://orbit.local:4443` so the terminal shows a clickable browser URL, not only the raw Nuxt port.

## Deployment Modes

Full pipeline (`site:deploy`):

- init preflight/setup as needed
- verify HTTP
- optional SSL handling
- build + sync + PM2 reload

Push-only pipeline (`site:deploy:push`):

- optional env sync (`env.yaml` -> `env.config.cjs`)
- optional build
- sync output/runtime assets
- sync ecosystem/env config
- PM2 `startOrReload --update-env`
- does not run nginx/ssl/init flow

## Typical Commands

Regenerate generated Nuxt config:

```bash
pnpm -C apps/schema run site:config:sync <slug>
```

Sync layers + app setup fixes:

```bash
pnpm -C apps/schema run site:setup <slug> -- --fix
```

Sync env outputs from `env.yaml`:

```bash
pnpm -C apps/schema run site:env:sync <slug>
```

Full deploy:

```bash
pnpm -C apps/schema run site:deploy -- <slug> --target <target>
```

Push-only deploy:

```bash
pnpm -C apps/schema run site:deploy:push -- <slug> --target <target>
```

## Layer Sync and `layers.lock.json`

When you add a layer in site YAML:

```yaml
layers:
  - schema-core
  - helios
```

Run:

```bash
pnpm -C apps/schema run site:setup <slug> -- --fix
```

This:

- syncs the layer into `apps/<site>/layers/<layer>`
- updates `extends` in `nuxt.config.generated.ts`
- writes/updates `layers.lock.json`
