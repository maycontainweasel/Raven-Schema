# Sync Utility (Schema Tools)

This utility provides a simple, Git‑less way to sync selected files/folders
from this repo into one or more target locations. It uses **rsync** and a
YAML config file with **include / exclude** patterns.

---

## Files

- Config: `apps/tools/passmed-schema/config/sync.yaml`
- Script: `apps/tools/passmed-schema/scripts/sync.mjs`
- Runner: `apps/tools/passmed-schema/scripts/sync.sh`

---

## Quick start

1) Edit the config:

```
apps/tools/passmed-schema/config/sync.yaml
```

2) Run sync:

```
pnpm -C apps/tools/passmed-schema schema:sync
```

Or:

```
bash apps/tools/passmed-schema/scripts/sync.sh
```

---

## Config format

```yaml
root: /absolute/path/to/repo
dryRun: false

globalExclude:
  - "**/node_modules/**"
  - "**/.nuxt/**"
  - "**/dist/**"
  - "**/.output/**"
  - "**/.turbo/**"
  - "**/.git/**"

targets:
  - name: schema-kit
    active: true
    root: /absolute/path/to/repo/apps/tools/passmed-schema
    include:
      - "**/*"
      - "config/graph.mpdg"
    exclude:
      - "config/**"
    projects:
      - name: target-a
        active: true
        dest: /path/to/target-a
        mode: overwrite
        packageJson:
          preserve:
            - name
      - name: target-b
        active: false
        dest: /path/to/target-b
        mode: overwrite

  - name: admin-ui
    active: true
    root: /absolute/path/to/repo/apps/pmv2-admin
    include:
      - "**/*"
      - "nuxt.config.ts"
      - "package.json"
      - "README.md"
    exclude:
      - "modules/schema-kit/runtime/generated/**"
      - "server/trpc/routers/generated/**"
      - "layers/generated/app/pages/**"
    projects:
      - name: admin-target
        active: true
        dest: /path/to/admin-target
        mode: overwrite
        packageJson:
          preserve:
            - name

  - name: schema-docs
    active: true
    root: /absolute/path/to/repo/apps/tools/schema-docs
    include:
      - "**/*"
      - "nuxt.config.ts"
      - "package.json"
      - "README.md"
    projects:
      - name: schema-docs-target
        active: true
        dest: /path/to/schema-docs-target
        mode: overwrite
        packageJson:
          preserve:
            - name
```

### `mode`

- `overwrite` (default): always overwrite matching files.
- `skip`: do not overwrite existing files.
- `mirror`: delete files in the destination that aren’t in the source.

### `dryRun`

Set `dryRun: true` at the root or per target to preview without copying.

### `globalExclude`

Patterns applied to **every** target (like a global push‑ignore).

### `includeMode`

Controls how `include` behaves when you also have `exclude` rules:

- `allowlist` (default): only include patterns are copied (everything else is excluded).
- `additive`: include patterns are **additions** to the default “include all” behavior.

Use `additive` when you want to **exclude a folder**, but still include a specific file inside it (e.g. keep `config/ui/README.md`).

```yaml
includeMode: additive
include:
  - "config/ui/README.md"
exclude:
  - "config/ui/*"
```

### `packageJson`

Optional per **project/target/root** config to preserve fields when syncing.

```yaml
packageJson:
  preserve:
    - name
```

If set to `true`, it defaults to preserving `name`.

**Default safety:** if the destination already has a `package.json` and no
`packageJson` config is set, the sync will **skip** copying `package.json`.

To force a merge, set `packageJson` with `preserve` keys (or `true`).

### `active`

Optional flag on **targets** or **projects**. If `false`, that target/project
is skipped.

```yaml
targets:
  - name: admin-ui
    active: false
    projects:
      - name: admin-target
        active: false
```

### `itemize` / `checksum`

Optional flags at root/target/project level:

- `itemize: true` → adds `--itemize-changes` (shows file‑level diffs)
- `checksum: true` → adds `--checksum` (content hash comparison)

### `logFile`

Optional path to append the rsync output (useful with `itemize`).

```yaml
logFile: ./sync-itemize.log
```

CLI override:

```
pnpm -C apps/tools/passmed-schema schema:sync -- --output ./sync-itemize.log
```

### `listChanges`

Prints **only the changed file paths** (clean list). Forces a dry‑run.

CLI:

```
pnpm -C apps/tools/passmed-schema schema:sync -- --list-changes
```

### `seed`

Optional seeding for **new installs** (writes baseline config files if missing).

Example:

```yaml
seed:
  appConfig:
    template: config/app.config.template.yaml
    values:
      PROJECT_NAME: dmo-schema
      PROJECT_DESCRIPTION: DMO schema workspace
      DATABASE_URL: http://127.0.0.1:8000
      DATABASE_NAMESPACE: schema
      DATABASE_NAME: testing
      DATABASE_USER: root
      DATABASE_PASSWORD: root
```

Notes:
 - Writes `config/app.config.yaml` if it does not exist.
 - Set `appConfig.force: true` to overwrite.

---

## Notes

- Uses `rsync` (must be installed).
- Include patterns are **explicit allow‑list** (like a Git “include”).
- Exclude patterns are applied after includes (so you can include a file
  inside a normally excluded folder by listing it explicitly).
- If you set **no `include`**, rsync syncs everything (minus excludes).

---

## CLI flags

```
pnpm -C apps/tools/passmed-schema schema:sync -- --dry-run
pnpm -C apps/tools/passmed-schema schema:sync -- -n
pnpm -C apps/tools/passmed-schema schema:sync -- --itemize
pnpm -C apps/tools/passmed-schema schema:sync -- --checksum
pnpm -C apps/tools/passmed-schema schema:sync -- --output ./sync-itemize.log
pnpm -C apps/tools/passmed-schema schema:sync -- --list-changes
pnpm -C apps/tools/passmed-schema schema:sync -- --config /path/to/other.yaml
```

## Example: run with a different config

```
bash apps/tools/passmed-schema/scripts/sync.sh /path/to/custom-sync.yaml
```

---

## Troubleshooting

- If a file isn’t copied, check `include` patterns first.
- If a file is excluded unexpectedly, check the `exclude` list.
- Use `dryRun: true` to preview.
