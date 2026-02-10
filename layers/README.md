# Schema Layers Workflow

This folder is the canonical source for reusable Nuxt layers.

## Source Of Truth

- Layer source lives in `apps/schema/layers/<layer-name>`.
- Deployed app copies live in `apps/<site>/layers/<layer-name>`.
- Treat app copies as runtime output, not the primary authoring location.

## Command Distinction (Important)

- `site:layers:sync` updates site YAML layer lists from `app.config.yaml`.
  - It does **not** copy layer files into apps.
- `site:layers:push` (or `schema:layers:sync` / `layers:sync`) copies layer files into target apps.
- `site:layers:pull` copies layer files from app copies back into `apps/schema/layers`.

## Daily Workflow (Edit -> Push To Site)

1. Edit layer code in `apps/schema/layers/<layer-name>`.
2. If releasing a new revision, bump `version` in `apps/schema/layers/<layer-name>/layer.yaml`.
3. Sync layers to a target app:
   - `pnpm -C apps/schema run site:layers:push -- --project <site>`
4. If layer dependencies or Nuxt defaults changed, also run:
   - `pnpm -C apps/schema run site:pkg:sync <site>`
   - `pnpm -C apps/schema run site:config:sync <site>`
5. Verify status:
   - `pnpm -C apps/schema run site:layers:status <site>`

Example for `heliosadmin`:

```bash
pnpm -C apps/schema run site:layers:push -- --project heliosadmin
pnpm -C apps/schema run site:pkg:sync heliosadmin
pnpm -C apps/schema run site:config:sync heliosadmin
pnpm -C apps/schema run site:layers:status heliosadmin
```

## Rolling Out To Other Turbo Repos

After pushing schema changes:

1. Pull latest code in the target repo.
2. Run:

```bash
pnpm -C apps/schema run site:layers:push -- --project <site>
pnpm -C apps/schema run site:pkg:sync <site>
pnpm -C apps/schema run site:config:sync <site>
pnpm -C apps/schema run site:layers:status <site>
```

## If You Edited In An App Layer By Mistake

Pull the layer copy back into schema source:

```bash
pnpm -C apps/schema run site:layers:pull -- --project heliosadmin --layers helios,helios-ui,helios-admin,fields
```

Then run the normal sync commands.

## Notes

- `layers.lock.json` in each app records synced layer versions/hashes.
- `.layer.hash` files are generated sync artifacts in app copies.
- Prefer explicit import paths (for example `#layers/helios-ui/...`) in app code when needed.
