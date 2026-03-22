# Typesense Contract

## Purpose
This document defines the reusable Typesense contract for a schema-consuming app.

## Source of truth
- Generated collection schemas live in `modules/schema-kit/runtime/generated/typesense/collections.ts`.
- Model/controller details live in `docs/controllers/<model>.md`.

## Public runtime APIs
- `modules/schema-kit/runtime/composables/useTypesense.ts`
- `modules/schema-kit/runtime/composables/useTypesenseDirectory.ts`

## Rules
- Browser code must not instantiate a raw Typesense client.
- Use server-backed runtime helpers and server endpoints only.
- Treat collection schema, collection name, and searchable/sortable fields as generated truth.
- For Typesense-enabled models, make post-mutation sync explicit through the runtime contract.

## Directory flow
1. Resolve the model and collection from generated metadata.
2. Ensure the collection through `useTypesense()`.
3. Use `useTypesenseDirectory()` for search state, sorting, pagination, and filters.
4. Keep page-local config limited to UI defaults.
5. Treat search reload and index refresh as separate actions.
