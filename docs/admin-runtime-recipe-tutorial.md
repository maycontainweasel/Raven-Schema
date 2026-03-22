# Tutorial: Build a Recipe Directory and Management Flow

> This is a worked tutorial. Use `docs/ai/runtime/authority-routing.md` for the canonical source-authority vs instance-authority contract.

## Purpose
This tutorial explains how to build a schema-driven admin directory for a new model called `recipe`.

It is intentionally generic.

Use this to understand:
- what to define in the graph
- what the schema generator should emit
- what the admin app should consume
- how to wire TypeSense search and refresh
- how to wire create/update/delete through `useApiProcess`

The real reference implementation is `exam`.

This tutorial uses `recipe` because it is easier to reason about without PassMed-specific noise.

## Step 1: Define The Model In The Graph

Your graph needs to define at least:
- the model/table
- its authority
- CRUD/router capability
- TypeSense capability

For example, `recipe` might be:
- authority: `source`
- TypeSense enabled: yes
- taxonomy enabled: yes

What matters here is intent:
- if `recipe` is source-authority data, writes must go to the source DB first
- if TypeSense is enabled, the generator must emit a collection schema and a model-specific refresh/resource path

## Step 2: Define The Typesense Shape In The Graph

The graph should describe the fields that belong in the `recipe` TypeSense document.

Typical examples:
- `id`
- `slug`
- `title`
- `summary`
- `difficulty`
- `tags`
- `instances`
- `post`

This definition is what the generator uses to emit:
- `generated/typesense/collections.ts`

That file is the collection schema source of truth in the app runtime.

## Step 3: Run Schema Generation

After generation, the app should receive:

### Runtime model metadata
- `generated/models.ts`
- `generated/models.manifest.ts` or `.json`
- `generated/admin-manifest.ts`
- `generated/databases.ts`

### TypeSense metadata
- `generated/typesense/collections.ts`

### Generated model router
A generated router with a `typesense` block for the model, including procedures like:
- `recipe.typesense.resource`
- `recipe.typesense.list`
- `recipe.typesense.refresh`
- `recipe.typesense.count`
- `recipe.typesense.collection`

### Generated Surreal function
A model-specific document function similar to:
- `fn::viewRecipeTypesense(...)`

This function must return exactly the document shape that TypeSense expects for one `recipe` record.

This is a core rule:
- pages do not invent TypeSense document shape
- generated model logic does

## Step 4: Confirm The Generated Typesense Record Contract

Every TypeSense-enabled model should have two important paths:

### Single-record Typesense resource
Example:
- `recipe.typesense.resource`

Purpose:
- return one record in Typesense document shape

### Bulk refresh endpoint
Example:
- `recipe.typesense.refresh`

Purpose:
- fetch model records from the authoritative DB
- map them through the generated Typesense view function
- upsert them into the TypeSense collection

This is the dedicated TypeSense record endpoint contract that must be explicit in both implementation and documentation.

## Step 5: Build The Directory Page

Create a page such as:
- `app/pages/recipes/index.vue`

Keep page-local config explicit for now.

Example shape:

```ts
const pageConfig = {
  model: {
    key: 'recipe',
    table: 'recipe',
    routeBase: '/recipes',
    sourceInstance: 'pm',
    slugPolicy: 'slug',
  },
  typesense: {
    collectionKey: 'recipe',
    collectionName: 'recipe',
    queryBy: ['title', 'summary', 'slug'],
    sortableFields: ['title', 'slug'],
    filterField: 'instances',
  },
}
```

This page-local config should define:
- page wiring
- UI defaults
- search defaults

It should not redefine:
- collection schema
- model authority
- generated Typesense resource shape

Those come from schema generation.

## Step 6: Wire The Directory Composables

Use:
- `useTypesense()`
- `useTypesenseDirectory()`
- `useDirectoryTypesenseManager()`

Responsibilities:

### `useTypesense()`
- frontend-safe public TypeSense composable
- server-backed only
- ensure/recreate/search/upsert/delete/count/inspect

### `useTypesenseDirectory()`
- table query state
- paging
- sorting
- filters/facets

### `useDirectoryTypesenseManager()`
- modal workflow helper
- status
- ensure
- refresh
- rebuild

## Step 7: Understand The Buttons

Your modal should preserve these semantics:

### `Refresh Directory`
- rerun the directory search only
- do not reindex

### `Check Status`
- read service health
- read collection status
- read document count
- confirm schema exists locally

### `Ensure Collection`
- create the collection from generated `collections.ts` if missing
- do not clear an existing collection

### `Run Refresh`
- fetch model documents from the authoritative DB
- upsert them into the existing collection

### `Rebuild Collection`
- recreate the collection from generated schema
- then fetch and reindex model documents

## Step 8: Build The Create Flow

For mutations, use:
- `useApiProcess()`

Compatibility alias:
- `useCRUD()`

Responsibilities:
- execute endpoint
- infer source vs tenant authority
- run source-first or tenant-only write routing
- retry
- return structured result

For a source-authority model like `recipe`:
1. create on the source DB first
2. if successful, create on target instances
3. if source fails, stop

Then explicitly sync TypeSense:
- fetch the generated Typesense resource shape for that record
- upsert it into the collection

## Step 9: Build The Record Page

The single-record page should:
- load the record normally
- update through generated TRPC endpoints
- explicitly re-sync TypeSense after mutation
- delete/deindex explicitly when removed

The important split is:
- `useApiProcess()` handles data writes
- `useTypesense()` handles TypeSense transport

Do not make the page talk to raw TypeSense directly.

## Step 10: Confirm Source vs Tenant Behavior

This is critical.

### Source-authority model
Example:
- `recipe`
- `exam`

Behavior:
- write to source DB first
- then fan out to target instances

### Tenant-authority model
Example:
- `user`

Behavior:
- bypass source DB
- write directly to target tenant instance(s)

This behavior should come from generated runtime metadata, with explicit override still available.

## Step 11: Acceptance Checklist

A `recipe` directory is considered correct when:
- opening `/recipes` causes no browser request to the raw TypeSense host
- directory search uses server-backed TypeSense API only
- `Ensure Collection` uses generated `collections.ts`
- `Run Refresh` uses the generated `recipe.typesense.refresh` path
- `Rebuild Collection` recreates the collection and reindexes
- create uses `useApiProcess()`
- create is followed by explicit TypeSense sync
- record updates and deletes follow the same pattern

## Final Rule

When building a new directory:

1. define the model in the graph
2. define the TypeSense block in the graph
3. generate schema outputs
4. confirm the generated `view<Model>Typesense` function exists
5. confirm the generated `model.typesense.resource/refresh` endpoints exist
6. wire the page with `useTypesense`, `useTypesenseDirectory`, and `useApiProcess`
7. keep the UI custom, but keep the runtime contract consistent

That is the repeatable pattern.
