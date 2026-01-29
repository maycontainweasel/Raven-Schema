Title: Project — Demo Admin Interface
Scope: global
Applies to: Nuxt 4, MPD Framework

This project builds a minimal demo admin UI in SchemaDocs that mirrors MPD CRUD flows and can be copied into target apps.

## Intent

Make the MPD CRUD paradigm obvious and copy‑ready for AI by providing a working admin interface per model.

## Scope (v1)

- User model list page
- User create dialog
- User edit page
- User delete flow
- Typesense search (if enabled)

## Requirements

- Minimal UI, no heavy component library assumptions
- Uses generated routers + schema‑kit module
- Clear, readable code paths

## Deliverables

- `/demo` + `/demo/<model>` routes
- Shared list + form patterns

## Reporting

Use the report format in `docs/projects/SCHEMA-DOCS-WORKING-SITE.md`.
