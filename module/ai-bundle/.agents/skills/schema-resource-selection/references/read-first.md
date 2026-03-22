# Read First

Use this checklist when choosing or creating a resource contract.

## Existing contract search
- Read `docs/controllers/<model>.md`.
- Search the generated router for:
  - `typesense.resource`
  - `resource`
  - `list`
  - `count`
  - relation helpers
  - taxonomy helpers
  - subtable helpers

## If no existing contract fits
- Inspect the schema graph and model spec inputs for the model.
- Confirm whether a new named resource, function-backed view, or controller extension is the right schema change.

## Ask before widening the surface
- If the change adds a new reusable resource or endpoint, ask the user before implementing it.
