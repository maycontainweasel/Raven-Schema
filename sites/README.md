# Sites (Schema Tooling)

This folder stores site specs that drive app scaffolding and generated Nuxt config.

## Where configs come from

Generated Nuxt apps use a three‑file merge:

1. `nuxt.config.generated.ts`  
   Generated from `sites/<slug>.yaml` (`nuxtConfig` block + layer metadata).
2. `nuxt.config.runtime.ts`  
   Generated from `env.yaml` (runtimeConfig only).
3. `nuxt.config.additions.ts`  
   Manual additions. Safe place for extra modules/css/transpile.
4. `nuxt.config.ts`  
   Manual overrides (highest priority).

Merge rules (current behaviour):
* Arrays like `modules`, `css`, `build.transpile` are **concatenated** when merging additions.
* Objects are **deep merged** (additions can extend nested objects).
* Overrides in `nuxt.config.ts` **replace** earlier values for arrays and keys.

## Common commands

Regenerate Nuxt config from the site spec:

```
pnpm -C apps/schema run site:config:sync <slug>
```

Sync layers, verify setup, and apply fixes:

```
pnpm -C apps/schema run site:setup <slug> -- --fix
```

Generate `.env` and runtime config from env spec:

```
pnpm -C apps/schema run site:env:sync <slug>
```

## Example: add UnoCSS + SCSS globals + Helios CSS

In `sites/<slug>.yaml`:

```yaml
nuxtConfig:
  css:
    - ~/helios/scss/index.scss
    - ~/assets/scss/app.scss
  vite:
    css:
      preprocessorOptions:
        scss:
          additionalData: |
            @use "~/assets/scss/variables.scss" as *;
            @use "~/assets/scss/mq.scss" as *;
            @use "~/assets/scss/scale.scss" as *;
```

Then regenerate:

```
pnpm -C apps/schema run site:config:sync <slug>
```

## Layers and `layers.lock.json`

If you add a layer in `sites/<slug>.yaml`:

```yaml
layers:
  - schema-core
  - helios
```

Run:

```
pnpm -C apps/schema run site:setup <slug> -- --fix
```

This:
* syncs the layer into `apps/<site>/layers/<layer>`
* updates `extends` in `nuxt.config.generated.ts`
* writes/updates `layers.lock.json`

