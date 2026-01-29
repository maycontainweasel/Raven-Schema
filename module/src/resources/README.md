# Resource Runtime Assets

Place files here to be copied into the schema-kit runtime when syncing to a target app.

Folder layout mirrors `src/runtime`:
- `components/` → `runtime/components/`
- `composables/` → `runtime/composables/`
- `stores/` → `runtime/stores/`
- `plugins/` → `runtime/plugins/`
- `server/` → `runtime/server/`

Rules:
- Files are copied **without overwriting** existing runtime files.
- Use `src/overrides` if you need to replace generated/runtime files.
