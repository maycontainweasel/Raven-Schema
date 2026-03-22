# Server Work

## Server rules
- Prefer extending generated schema runtime contracts over inventing parallel server endpoints.
- Use `docs/controllers/<model>.md`, generated manifests, and schema-kit runtime files before adding new server behavior.
- Keep raw service access server-side only. Do not introduce new browser paths that expose database topology, credentials, or direct Typesense access.
- If server behavior depends on data location, resolve `source authority` vs `instance authority` first.

## Read first
- `docs/ai/runtime/authority-routing.md`
- `docs/ai/runtime/typesense.md`
- `docs/controllers/<model>.md`
- `modules/schema-kit/runtime/generated/models.manifest.ts`
- `modules/schema-kit/runtime/generated/databases.ts`
