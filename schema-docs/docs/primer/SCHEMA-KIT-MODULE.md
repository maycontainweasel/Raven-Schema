Title: Schema Kit Nuxt Module (Primer)
Scope: global
Applies to: Nuxt 4, MPD Framework

This primer is for a new AI joining the project. It explains the intent and scope of the Schema Kit Nuxt module so the module can be implemented and copied into any target Nuxt app.

## Context

We are building MPD Schema tooling that generates:
- SurrealDB assets (functions, views, events, indexes)
- Types and request schemas
- TRPC routers

We also have a SchemaDocs app (Nuxt 4) that should work as a clean, neutral target and receive generated assets without manual setup.

Goal: Any Nuxt 4 app should be able to adopt MPD Schema by installing one module and receive all required wiring (types, request schema imports, aliases, conventions).

## The Problem

Generated routers and types need stable import paths. We do not want to manually configure aliases in each target app. The module should supply those paths and configuration in a single, reusable place.

## Module Intent

Create a Nuxt 4 module (in `apps/tools/passmed-schema/module`) that:
- Provides the import alias used by generated routers (example: `@schema`)
- Exposes generated schema types to the app
- Supports Typesense and other generated assets in a consistent way
- Makes a target app fully compatible with MPD Schema outputs with minimal configuration

## Current State

- A starter Nuxt module exists at `apps/tools/passmed-schema/module`
- SchemaDocs app lives at `apps/tools/passmed-schema/schema-docs`
- App config now supports `documentation.schemaApp` which injects SchemaDocs as a project and emits routers/types into it

## Minimum Requirements (v1)

1) Provide a stable alias (default `@schema`) that points to the request schema output.
2) Expose generated types from the target app path.
3) Allow override of aliases and paths per app if needed.
4) Keep the target app config minimal (no manual alias definitions).

## Assumptions

- Nuxt 4 is the only target for now.
- The module is workspace-local (copied into repos, not necessarily published).
- Generated routers import:
  - schema types via `schemaTypes` path
  - request schema via `@schema` (configurable)

## Open Questions

- What should the final module name be? (e.g., `@mpd/schema-kit`)
- Where should request schema live by default?
- Should the module also auto-register TRPC helpers or only aliases?

## Immediate Next Steps

1) Rename and clean the module scaffold (README, package name).
2) Define module options:
   - `schemaAlias` (default `@schema`)
   - `schemaTypesPath`
   - `requestSchemaPath`
3) Implement alias registration in `nuxt.config` via module hooks.
4) Test in SchemaDocs app.

## Success Criteria

If a new Nuxt 4 app installs the module and points to the generated output folder, it should compile and run without any manual alias setup.
