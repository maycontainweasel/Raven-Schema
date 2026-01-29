# Runtime Overrides

Place files here to **override** schema-kit runtime files when syncing to a target app.

Folder layout mirrors `src/runtime` (same as `src/resources`):
- `components/`
- `composables/`
- `stores/`
- `plugins/`
- `server/`

Rules:
- Files here are copied **after** runtime and resource assets.
- Files **do overwrite** existing runtime files.
