Title: useCRUD Composable (V2)
Scope: global
Applies to: MPD Framework | TRPC | SurrealDB | Nuxt 4
Depends on: docs/mpd-schema/primer/03-record-ids.md, docs/mpd-schema/primer/02-data-paradigm.md

# useCRUD Composable (V2)

`useCRUD` is the canonical helper for calling generated TRPC endpoints.
It standardizes:

- instance routing (local vs remote)
- retry behavior
- attempt logging (`apiAttempt`)
- return typing (record vs Typesense document)

The **default API** now uses the V2 engine (root‑first, strict).

## The current API surface

### Main entrypoints

- `processRecordForInstances` → **V2** (strict root‑first)
- `processRecordForInstancesV1` → legacy behavior
- `$process` → V2, returns record only
- `$processResult` → V2, returns full result
- `$processLocal` / `$processRemote` → force data location
- `$processAs<T>()` → force return type
- `$processTypesense` / `$processTypesenseResult` → Typesense document return type

### Why use `$process`?

It is:
- shorter
- type‑aware
- opinionated for MPD
- consistent across generated routers

## Default behavior (V2)

1) Determine **data location** from `@schema/models`.
2) Enforce **root instance success** before touching remotes.
3) Retry failed instances according to options.
4) Optionally log attempts to `apiAttempt`.

## Core calls

### Minimal

```ts
const record = await $process('question.create', { qid: 123 })
```

### With instances

```ts
const record = await $process('question.create', { qid: 123 }, ['uk', 'au'])
```

### Remote model with instance

```ts
const record = await $process('user.create', payload, 'uk')
```

### Explicit data location

```ts
const record = await $processLocal('question.create', payload, ['uk'])
const record = await $processRemote('user.create', payload, ['uk'])
```

## Return typing

`useCRUD` infers return types from the endpoint:

- `question.create` → `Question`
- `question.typesense.resource` → `QuestionDocument`

You can override:

```ts
const record = await $process('question.create', payload, {
  returnType: 'typesense',
})
```

Or force a type directly:

```ts
const record = await $processAs<QuestionDocument>()('question.create', payload)
```

## Options (per call)

These can be passed as the **third argument**, or inside a config object.

```ts
await $process('question.create', payload, {
  instances: ['uk', 'au'],
  rootInstance: 'pm',
  dataLocation: 'local',
  retryAttempts: 3,
  retryFailedAttempts: 1,
  retryDelay: 1000,
  retryFailedDelay: 1500,
  concurrency: 4,
  trackAttempts: true,
})
```

### Key options

- `instances` / `instance`  
  Target instance(s). Required for remote models.

- `rootInstance`  
  The single source of truth instance (default `pm`).

- `dataLocation` or `bypassMothership`  
  Force local/remote handling.

- `trackAttempts`  
  Writes a record to `apiAttempt` with full summary.

- `retryAttempts`, `retryDelay`  
  Retries per instance before marking it failed.

- `retryFailedAttempts`, `retryFailedDelay`  
  Extra retry passes for failed instances.

- `concurrency`  
  Max concurrent instance calls.

## Full result shape (V2)

```ts
type ProcessResultV2<R> = {
  record: R | null
  instances: {
    [instance: string]: {
      status: 'success' | 'failed' | 'skipped'
      attempts: number
      startedAt: string
      endedAt: string
      durationMs: number
      record?: R | null
      error?: unknown
    }
  }
  summary: {
    success: string[]
    failed: string[]
    skipped: string[]
    attempts: number
    durationMs: number
  }
}
```

## Track attempts (apiAttempt)

When `trackAttempts: true`:

1) `apiAttempt.create` writes a pending record.
2) Root result is updated immediately.
3) Final summary and per‑instance results are saved.

If root logging fails, the helper will attempt a fallback write to the next available instance.

## Typesense refresh

Typesense updates are **not** automatic in V2 (by design).
Use:

```ts
const { updateTypesenseForRecord } = useCRUD()
await updateTypesenseForRecord({ collectionId: 'question', record })
```

## Legacy V1

If you need the old behavior:

```ts
const { processRecordForInstancesV1 } = useCRUD()
```

V1 returns:

```ts
{
  record: R | null,
  results: {
    success: string[],
    failed: { instance: string, error: unknown }[]
  }
}
```

## Usage permutations (quick reference)

```ts
$process('model.create', payload)
$process('model.create', payload, 'uk')
$process('model.create', payload, ['uk', 'au'])
$process('model.create', payload, { instances: ['uk'] })
$process({ endpoint: 'model.create', instances: ['uk'] }, payload)
$processRemote('model.create', payload, ['uk'])
$processLocal('model.create', payload, ['uk'])
$processAs<MyType>()('model.create', payload)
$processTypesense('model.create', payload)
$processResult('model.create', payload)
```

## Required rules

- Always treat **record IDs** as `RecordID.id` (sub‑id).
- Always obey **local vs remote** rules.
- Always log attempts for multi‑instance operations in production.
