Title: Router Primer (SchemaDocs)
Scope: Generated TRPC routers only
Applies to: /api testing suite, generated router docs

This primer explains how generated TRPC routers work, how to call them, and how to interpret IDs and instance routing.

## 1) Router structure (generated only)

- Generated routers live in:
  - `schema-docs/server/trpc/routers/generated/*`
- The root router is:
  - `schema-docs/server/trpc/routers/_app.ts`
- For now, **only generated routers are mounted** in the app router.

Each model router follows this pattern:

- `modelRouter` contains:
  - CRUD endpoints (create/update/delete)
  - resource/view endpoints
  - nested routers (taxonomies, typesense, relations) when present

The generated router keys are exposed under `$api.<modelKey>` on the client.

Example:
- `$api.question.create`
- `$api.question.update`
- `$api.question.resource`
- `$api.question.typesense.*` (when available)

## 2) Request payload shape (RequestSchema)

Generated endpoints mostly use this wrapper:

```
RequestSchema(<ZodSchema>)
```

That wrapper yields this request shape:

```
{
  data: <payload>,
  instance?: <InstanceCode>
}
```

- **`data`**: the payload expected by the function.
- **`instance`**: optional instance code (e.g. `uk`, `us`, `pm`).

The UI should always send data inside `data`.

## 3) Local vs Remote data (instance routing)

Every model is marked `local` or `remote` in the generated model manifest:

`@schema/models`

Interpretation:

- **Local model**:
  - Source of truth is mothership (`pm`).
  - Writes must run on `pm` first.
  - After success, same operation is mirrored to other target instances.

- **Remote model**:
  - Source of truth is the selected instance.
  - Writes are run directly on the target instance(s).
  - Mothership is bypassed.

In SchemaDocs, all process calls should use:

```
const { $process } = useCRUD()
await $process('<model>.<endpoint>', data, options)
```

See:
- `docs/primer/USECRUD.md`
- `docs/primer/INSTANCES-LOCAL-REMOTE.md`

## 4) SurrealDB IDs (record vs sub‑id)

SurrealDB returns record IDs as objects:

```
{ tb: "table", id: "recordId" }
```

Rules for inputs:

- When a router expects an `id`, it expects **record sub‑id** (string), not the full record object.
- The sub‑id is `record.id`, not the object.

Examples:

- Returned record:
  - `{ tb: "q", id: "question-123" }`
- Value passed to endpoints:
  - `"question-123"`

**Always pass the sub‑id** to TRPC endpoints unless a specific endpoint explicitly requires a full record object.

## 5) Taxonomies

Taxonomy endpoints are nested routers under the model. Example:

- `$api.question.qcat.*`
- `$api.question.qtag.*`

Common operations:
- `createTaxonomy`
- `addTerm`
- `removeTerm`
- `attach`
- `detach`
- `getTerms`
- `getRecordTerms`

Each uses `RequestSchema(...)`, so the payload is always `{ data: ... , instance?: ... }`.

Term notes:
- Term tables are **per‑taxonomy**: `t_<table>_<taxonomy>`
- Term ID is now **term key** (not stringID)

## 6) Typesense

Typesense endpoints are also nested routers under a model, when enabled:

- `$api.<model>.typesense.*`

These are used to refresh, rebuild, list, and query collections.

Typesense view helpers (Surreal functions) often follow the model ID type.  
If the model ID structure is numeric (e.g. `qid`), pass a number — not a string.

## 7) Custom routers (later)

Custom routers merge into the model router with:

```
t.mergeRouters(generatedRouter, customRouter)
```

For now, **SchemaDocs only mounts generated routers**. Custom functions will be added later and documented separately.

## 8) API console principles

The /api console should:

- Reflect generated routers exactly.
- Provide every input field required by the schema.
- Provide a **Populate** action for dummy data.
- Provide a **Copy snippet** action to export a usable call.
- Preserve and reuse global state (e.g. last created record id).

## 9) Glossary

- **Instance**: target database cluster (pm, uk, us, etc.)
- **Local model**: source of truth is mothership
- **Remote model**: source of truth is remote instance
- **Record ID**: Surreal record object `{ tb, id }`
- **Record sub‑id**: string id used in TRPC endpoints
