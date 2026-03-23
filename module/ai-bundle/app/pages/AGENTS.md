# Page Work

## Use the schema workflow first
- Before changing a schema-driven model page, use the `schema-model-primer` skill logic: resolve the model contract, authority, endpoints, and Typesense behavior first.
- Before using fragment-based model UI or generic `/admin/[model]` pages, check `apps/schema/config/app.config.yaml -> ui.projectSettings.<project>.enabled`. If that setting is `false`, follow the app’s committed custom pages instead.
- For directories, follow the source-authority or instance-authority directory workflow instead of inventing page-local transport.
- For create flows, use the create-dialog workflow.
- For record pages, use the record-workspace workflow.
- When a page needs model data, choose the narrowest existing runtime contract that satisfies the fields needed. Do not assume an `Admin` resource exists.
- If no existing contract fits, inspect schema authoring inputs and ask before adding a new reusable resource surface.

## Page rules
- Keep page-local config limited to UI defaults such as sort, filters, labels, and route shape.
- Do not decide model authority in page code by guesswork; read generated metadata and controller docs first.
- On source-authority single-record pages, resolve the record's target instances before mutating and route writes through `useCRUD()` / `useApiProcess()` orchestration helpers instead of direct `$api.*.mutate` calls.
- Do not let page-local writes silently collapse to one database when the record belongs to multiple instances. If a write is intentionally single-instance, make that exception explicit in code.
- Acceptable exceptions are dedicated external-service actions or source-only platform administration flows, but those exceptions must stay narrow and obvious in code.
- If a page mutates a Typesense-enabled model, make the post-mutation sync explicit.
- If a page exposes TypeSense refresh or rebuild, treat partial imports as failures instead of successful refreshes.
- TypeSense-enabled pages must keep document output schema-safe for nullable strings and arrays.
- Keep heavy orchestration in stores or composables when the page would otherwise become transport-heavy.
