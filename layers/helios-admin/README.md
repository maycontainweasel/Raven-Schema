# Helios Admin Layer

Admin engine for Helios-based apps.

## Scope

- Admin shell (layout, header, sidebar, dashboard).
- Model management routes (`/models`, `/admin/*`) and builder routes.
- Admin server APIs for nav/model spec/type-sense orchestration.
- Higher-level admin fields/workflows (e.g. taxonomy manager).

## Depends on

1. `schema-core` (TRPC router/context, schema-kit runtime, Typesense helpers)
2. `helios` (design system and generated theme assets)
3. `helios-ui` (low-level field primitives)
4. `fields` (fields manager page consumed from `#layers/fields`)
