# Fields Layer (Helios Fields)

This layer is the component-engine workspace for headless field components in Helios Admin.

## Purpose

- Browse and configure approved headless UI fields.
- Save field configuration fragments in the host app.
- Generate/deploy concrete component files into the host app (`app/components/fields/*`).
- Re-load saved fragments so configuration is never lost if the layer is removed/re-added.

## Current scope

- Catalog + config manager at `/fields`.
- Initial deployed component: `UiCombobox` (Ark UI based, UnoCSS-friendly styling).
- Persistence files:
  - `app/fields/fragments/catalog.json`
  - `app/fields/fragments/components/combobox.json`
  - `app/fields/generated/fields.settings.json`

## API

- `GET /api/fields/read` -> reads persisted fragments (with safe defaults).
- `POST /api/fields/deploy` -> writes fragments and generates selected components.

## Notes

This is the first iteration of the component engine. The next components (select, date picker, etc.) should follow the same pattern:

1. Add config schema and defaults.
2. Add UI editor section.
3. Add generator function in deploy endpoint.
4. Persist fragment in `app/fields/fragments/components/<component>.json`.
