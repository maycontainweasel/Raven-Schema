# Resource Selection

Use this rule whenever a page, component, store, or server handler needs a shape of model data.

## Goal
- Read from the narrowest existing schema contract that already satisfies the fields you need.
- Only widen the runtime surface when no existing contract fits.

## Selection order
1. Check `docs/controllers/<model>.md` for existing generated endpoints.
2. Prefer the narrowest existing runtime shape that matches the UI or handler:
   - `typesense.resource` for lightweight search or summary fields
   - `resource(<key>)` for named generated resource views
   - generated `list`, `count`, relation, taxonomy, or subtable endpoints for structured data work
   - app-specific controller or router overrides only when the generated contract is intentionally extended
3. Confirm the exact field shape in the generated router or runtime files before wiring the UI.
4. If no existing contract fits, inspect the schema graph/spec inputs to see whether a new resource or function-backed view is the right schema change.

## Rules
- Do not invent a resource key because a name sounds plausible.
- Do not assume an `Admin` resource exists for every model.
- If a lightweight card only needs summary fields, do not fetch an admin-only view.
- Resource endpoints should fail soft for unsupported selectors or unavailable backing views/functions: log a server warning and return `null`.
- If a new resource would change the model surface, ask the user before creating it.
- New reusable resources belong in schema authoring inputs, not only in page code.

## Definition of done
- The chosen contract is evidenced by generated controller docs or generated router/runtime files.
- The page or handler reads only the fields it needs.
- The caller handles a `null` resource response safely.
- If no contract fits, the proposed schema change is explicit and user-approved before implementation.
