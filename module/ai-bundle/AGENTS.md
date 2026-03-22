# Schema-Driven App

## What this repo is
- This app consumes schema-kit runtime assets emitted from the schema workspace.
- Generated runtime truth lives under `modules/schema-kit/runtime/generated/**`.
- Model-specific controller docs live under `docs/controllers/**`.

## Read first
- `docs/ai/architecture.md`
- `docs/ai/runtime/authority-routing.md`
- `docs/ai/runtime/resource-selection.md`
- `docs/ai/runtime/typesense.md`
- `docs/controllers/<model>.md`

## Non-negotiable rules
- Generated metadata, controller docs, and schema-kit runtime files are the truth. Do not invent ad hoc CRUD or Typesense flows when those contracts already exist.
- Use the human-facing terms `source authority` and `instance authority`.
- If current code or metadata says `tenant`, `remote`, or `instance`, normalize that to `instance authority` before reasoning about behavior.
- Before using fragment-based model UI or `/admin/[model]` runtime pages, check `apps/schema/config/app.config.yaml -> ui.projectSettings.<project>.enabled`. If it is `false`, treat committed custom pages as the authority for that app.
- Use `useApiProcess()` / `useCRUD()` for mutations and orchestration.
- When a task needs model data, choose the narrowest existing runtime contract that satisfies the fields needed. Do not invent resource keys or assume an `Admin` resource exists.
- If no existing runtime contract fits, inspect schema authoring inputs and ask the user before adding a new reusable resource surface.
- Keep browser Typesense access server-backed through schema-kit runtime composables and server endpoints.
- Do not report TypeSense refresh or rebuild success when fetched records were only partially indexed. Surface partial imports as failures.
- Keep model orchestration in stores, composables, or page handlers. Keep presentational components dumb.
- This file is schema-managed. Put app-specific exceptions in nearer local `AGENTS.md` files, not by weakening the schema contract here.

## Improvement loop
- If a repeated mistake is specific to this app, fix the nearest local `AGENTS.md` or local skill.
- If a repeated mistake belongs to every schema consumer, push the fix back into `apps/schema`.
