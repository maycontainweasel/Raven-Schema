# Schema-Kit Templates

## What lives here
- `module/src/resources/**` contains template files that are copied or synced into consumer apps.
- `module/docs/controllers/*.md` contains model-oriented controller/runtime docs that consumer apps can also consume.
- `module/ai-bundle/**` contains the schema-managed AGENTS/docs/skills bundle emitted into consumer apps.

## Edit rules
- Make framework-wide runtime changes here, not only in emitted copies inside consumer apps.
- Keep the preferred public orchestration name `useApiProcess()` aligned with the compatibility implementation in `src/resources/composables/useCRUD.ts`.
- Keep Typesense flows server-backed through `src/resources/composables/useTypesense.ts` and related server routes.
- When authority routing changes, update `../docs/ai/runtime/authority-routing.md` in the same change.
- When consumer guidance changes, update `ai-bundle/**` and the schema-owned canon in `../docs/ai/**` together.
- Do not bake consumer-app-specific examples into template runtime files.
