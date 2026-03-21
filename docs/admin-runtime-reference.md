# Admin Runtime Reference

## Purpose
This document explains the live runtime contract for a schema-driven admin directory, using the working PassMed `exam` directory in `heliosadmin` as the reference implementation.

The goal is to make it explicit:
- where the data comes from
- which generated files matter
- which composables are responsible for what
- what each TypeSense button actually does
- how a model-specific TypeSense refresh works

## Reference Model: `exam`

The current real implementation is:
- page: `apps/heliosadmin/app/pages/exams/index.vue`
- model key: `exam`
- table: `exam`
- source instance: `pm`
- collection key: `exam`

On the page this shows up as:
- `Source: PM`
- `Collection: exam`

## Where The Values Come From

There are four separate layers.

### 1. Page-local config
Defined in:
- `apps/heliosadmin/app/pages/exams/index.vue`

This is where the page currently defines:
- model key
- table name
- route base
- source instance
- slug policy
- collection key
- query fields
- sortable fields
- filter field

This is UI/runtime wiring for the page. It should stay page-local for now.

### 2. Generated model metadata
Generated into:
- `apps/heliosadmin/modules/schema-kit/runtime/generated/models.manifest.ts`

For `exam`, this supplies:
- `authority: "source"`
- `typesense.enabled: true`
- `typesense.collection: "exam"`
- `typesense.fields`
- `typesense.sortableFields`

This comes from the schema graph and should become the canonical runtime source for model behavior.

### 3. Generated TypeSense schema
Generated into:
- `apps/heliosadmin/modules/schema-kit/runtime/generated/typesense/collections.ts`

This defines the actual TypeSense collection schema used by:
- `Ensure Collection`
- `Rebuild Collection`
- search field validation

For `exam`, this file defines:
- collection name: `exam`
- all Typesense fields
- which fields are sortable
- which fields are facets

### 4. Generated model-specific Typesense endpoints
Generated into:
- `apps/heliosadmin/server/trpc/routers/generated/exam.ts`

If a model has TypeSense enabled, the generator gives it a dedicated `typesense` router with procedures such as:
- `exam.typesense.resource`
- `exam.typesense.list`
- `exam.typesense.refresh`
- `exam.typesense.count`
- `exam.typesense.collection`

This is a core contract.

Every model with TypeSense enabled should have a generated, model-specific Typesense resource and refresh path.

## The Dedicated Typesense Record Contract

For `exam`, the canonical document-shape function is:
- `apps/schema/config/migrations/exam/F_viewExamTypesense.surql`

That function is:

```surql
DEFINE FUNCTION OVERWRITE fn::viewExamTypesense($ExamId: any) {
  let $RID = fn::ridParam("exam", $ExamId);

  if !type::is_record($RID) || !record::exists($RID) {
    throw 'viewExamTypesense | expects valid $ExamId record';
  };

  return SELECT
      key,
      title,
      titleShort,
      college,
      qidIndex,
      instances,
      (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post,
      (<string> record::id($this.id)) AS id
  FROM only $RID;
};
```

This is the important rule:

- the TypeSense document shape is not invented by the page
- it is generated from schema and returned by a dedicated function for that model

For `exam`, the generated router uses that function in two ways:

### Single record
`exam.typesense.resource`

This returns a single exam in TypeSense document shape.

### Bulk refresh
`exam.typesense.refresh`

This:
1. selects all exam ids
2. maps them through `fn::viewExamTypesense(...)`
3. upserts the results into the `exam` TypeSense collection

This should be treated as the standard generated refresh endpoint pattern for TypeSense-enabled models.

## What `useTypesense()` Does

Public composable:
- `apps/heliosadmin/modules/schema-kit/runtime/composables/useTypesense.ts`

Responsibilities:
- resolve model key to collection
- ensure collection
- recreate collection
- search collection
- inspect/count records
- upsert/delete documents
- call the server API only

Important rule:
- browser code must not instantiate a raw TypeSense client
- `useTypesense()` is the public frontend contract
- server endpoints are the transport

## What `useTypesenseDirectory()` Does

Composable:
- `apps/heliosadmin/modules/schema-kit/runtime/composables/useTypesenseDirectory.ts`

Responsibilities:
- search query state
- paging
- sorting
- facet/filter state
- table result mapping

It should not own raw transport details.

It uses:
- `useTypesense()`
- `useTypesenseSearch()`

## What The Refresh Modal Does

Helper:
- `apps/heliosadmin/app/composables/useDirectoryTypesenseManager.ts`

The modal is a workflow helper around TypeSense operations.

It currently uses:
- `useTypesense().getRemoteStatus(...)`
- `useTypesense().getServiceHealth()`
- `useTypesense().ensureCollection(...)`
- `useTypesense().recreateCollection(...)`
- `useTypesense().refreshCollection(...)`

## Button Semantics

### Top-right `Refresh`
Opens the modal only.

It does not refresh the directory by itself.

### `Refresh Directory`
Reloads the current directory table from the existing TypeSense collection.

It does not fetch from SurrealDB.

It only reruns the directory search.

### `Check Status`
Reads:
- TypeSense service status
- whether the collection exists
- whether local schema exists in generated `collections.ts`
- current document count

### `Ensure Collection`
Non-destructive.

Meaning:
- if the collection is missing, create it from generated `collections.ts`
- if it already exists, leave it in place

It does not rebuild the index.

### `Run Refresh`
Fetches model records from the source database and upserts them into the existing TypeSense collection.

It does not recreate the collection first.

### `Rebuild Collection`
Destructive reindex.

Meaning:
1. recreate the collection from generated `collections.ts`
2. fetch model records from the source database
3. upsert them into the fresh collection

This is the clear-and-rebuild path.

## The Live `exam` Refresh Flow

Current page code:
- `apps/heliosadmin/app/pages/exams/index.vue`

The refresh callback is:
- `runExamTypesenseRefresh()`

That currently does:
1. `typesense.ensureCollection('exam')`
2. call `$api.exam.typesense.refresh.mutate({ instance: sourceInstance })`

For this page:
- `sourceInstance = pm`

So the refresh path is explicitly:
- fetch exam Typesense docs from the `pm` database
- not from a tenant database

That is why `Source: PM` matters.

## The Live Search Flow

When `/exams` opens:
1. `index.vue` calls `runDirectorySearch()`
2. that calls `directory.connect()`
3. `useTypesenseDirectory()` ensures the collection exists
4. it then performs a search through `useTypesense().search(...)`
5. server endpoint `/api/models/typesense/exam/search` performs the actual TypeSense query

Important distinction:
- directory search reads from the indexed TypeSense collection
- refresh/rebuild repopulates that collection from the source DB

## The Server API Contract

Current server-backed endpoints used by the runtime:
- `GET /api/models/typesense/:model`
- `POST /api/models/typesense/:model`
- `GET /api/models/typesense/:model/search`
- `GET /api/typesense/health`

The model-scoped API is the runtime transport for the frontend composables.

The generated TRPC model router is the source-side bridge for model-specific refresh/resource/list/count behavior.

## Design Rule Going Forward

For any TypeSense-enabled model:

1. the graph defines TypeSense capability
2. generation emits:
   - model manifest metadata
   - collection schema
   - model-specific Typesense view function
   - generated Typesense router endpoints
3. the app page defines only page-local UI/runtime config
4. `useTypesense()` handles frontend transport
5. `useTypesenseDirectory()` handles table state
6. refresh/rebuild uses the generated model-specific TypeSense refresh path

That is the repeatable contract.
