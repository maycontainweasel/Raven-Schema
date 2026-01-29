Title: Local vs Remote Data (Instances)
Scope: global
Applies to: MPD Framework | SurrealDB | tRPC | Nuxt 4
Depends on: docs/mpd-schema/primer/03-record-ids.md

# Local vs Remote Data (Instances)

This primer explains how **instances** and **data location** work in the MPD framework.
It is mandatory reading for any AI or developer using generated routers or `useCRUD`.

## Core idea

All databases in the MPD ecosystem share the same schema. The only difference is **which instance**
you run the same TRPC endpoint against.

- **Root instance** (a.k.a. mothership) = the single source of truth.
- **Remote instances** = regional or deployed databases (UK, ZA, AU, etc.).

The data location for each model is generated in `@schema/models`:

```ts
export const models = {
  question: { table: "q", data: "local" },
  user: { table: "u", data: "remote" },
}
```

## Data location rules

### Local data

Local data is **owned by the root instance**.
When you create/update/delete a local record:

1) Run the TRPC endpoint on the **root instance first**.  
2) If it succeeds, run the same endpoint on **each target instance**.  
3) If root fails, **do not** touch remotes.

This guarantees a single source of truth.

### Remote data

Remote data is **owned by the target instance**.
When you create/update/delete a remote record:

- Only run the TRPC endpoint on the specified instance(s).
- Do **not** use the root instance.

## How data location is determined

`useCRUD` infers data location from `@schema/models`.
You can override it:

- `dataLocation: 'local' | 'remote'`
- or `bypassMothership: true` (equivalent to remote)

If the model is remote and no instances are provided, the call throws.

## Instances and RequestSchema

Generated TRPC endpoints all use a standard input wrapper:

```ts
{
  data: <payload>,
  instance: <instanceCode>
}
```

The instance code selects which database connection to use.

## Root instance rules (strict)

The root instance must always succeed before remote instances are touched.
In V2 execution:

- Root success → proceed to remotes.
- Root fail → remotes are marked **skipped**.

The default root instance code is `pm`, but you can override:

```ts
await $process('question.create', payload, {
  rootInstance: 'pm',
})
```

## Logging / attempts

When `trackAttempts: true` is enabled, the framework writes a record to `apiAttempt`:

- Root success/fail is logged immediately.
- Final summary (success/failed/skipped) is recorded at the end.

This log is the basis for repair runners and re‑sync jobs.

## Practical examples

### Local model (question)

```ts
await $process('question.create', { qid: 123 }, ['uk', 'au'])
```

Result:
1) Create on root instance first.
2) If ok, create on UK + AU.

### Remote model (user)

```ts
await $process('user.create', payload, 'uk')
```

Result:
- Only UK is touched.

## What to remember

- **Local** = root first, then remotes.
- **Remote** = only target instances.
- Root must succeed or nothing else should run.
- Data location is inferred from `@schema/models` unless overridden.
