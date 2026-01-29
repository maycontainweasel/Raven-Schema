Title: SurrealDB Record IDs
Scope: global
Applies to: SurrealDB | MPD Schema Tooling | tRPC | Nuxt 4
Depends on: docs/mpd-schema/primer/01-overview.md

## Why this matters

SurrealDB record IDs are powerful but easy to misuse. The ID can be *composite*
(arrays/objects built from other IDs), and the API surface expects a **specific**
representation depending on where you are in the stack. This primer defines the
exact terms and rules we use everywhere.

---

## Canonical terms (MPD standard)

### 1) **Record ID (RID)**
The full record identifier object as returned by SurrealDB over the network:

```
{ tb: "user", id: "<anything>" }
```

In MPD documentation, **"record ID" always means the full object** with `tb` + `id`.

### 2) **Record Sub‑ID**
The *inner* `id` value of a record ID object:

```
const recordId = { tb: "user", id: "abc123" }
const subId = recordId.id // "abc123"
```

In MPD documentation, **"sub‑ID" always means `recordId.id`**.

### 3) **Surreal ID literal**
The string you would see in SurrealDB's console:

```
user:abc123
```

This is **not** the same as the record ID object returned to the frontend.

---

## Key rules (read‑first)

1) **Frontend TRPC endpoints expect sub‑IDs**  
   When a TRPC input says `id`, we pass the **sub‑ID**, not the full record ID object.

2) **Responses return record IDs**  
   SurrealDB responses include full record ID objects.  
   You must read `record.id` (sub‑ID) before reusing it in TRPC input.

3) **Record IDs can be composite**  
   The `id` field can be any shape: string, number, array, object, or nested record IDs.  
   Composite IDs enable deterministic lookups and subtable patterns.

---

## Example shapes

### Simple ID
```
{ tb: "user", id: "abc123" }
```

### Composite ID (array)
```
{ tb: "productVariant", id: ["gbp", 12] }
```

### Composite ID (object)
```
{ tb: "examQuestion", id: { exam: "exam123", question: "q456" } }
```

---

## Generated types (source of truth)

All schema‑generated types are exported via:

```
@schema/types
```

At minimum, every build includes the core Record ID type:

```
export const RecordID_z = z.object({ tb: z.string(), id: z.any() })
export type RecordID = z.infer<typeof RecordID_z>
```

Model types are also generated, e.g.:

```
export const Z_User = z.object({ ... })
export type User = z.infer<typeof Z_User>
```

**Rule:** Any snippet we generate must import types from `@schema/types` rather
than redefining them.

### Record ID types per table (exportType)

If a table spec declares:

```
id:
  exportType: true
  type: string
  exportName: UserID
```

Then the generator emits:

```
export const UserID_z = RecordID_z.extend({
  tb: z.literal('u'),
  id: z.string(),
})
export type UserID = z.infer<typeof UserID_z>
```

This is how we model **record IDs with a concrete inner shape**. The `id` field can be:

- `string`
- `number`
- `array<...>`
- `object { ... }`
- or any union we support in the graph/spec type system

If you need a composite ID, set `id.type` to a structured type so the generated
record ID type reflects it.

### Where to import types

All generated model and record ID types are exported from:

```
@schema/types
```

Examples:

```
import type { User, UserID, Z_User, UserID_z } from '@schema/types'
```

This keeps frontend code consistent across apps and avoids manual type duplication.

---

## Helpers (Schema‑kit)

Schema‑kit exposes helpers to normalize IDs:

- `resolveRecordId(value)` -> best effort to return a record ID string
- `resolveRecordSubId(value)` -> best effort to return the sub‑ID

These should be used whenever we are not certain about the shape we received.

---

## Practical usage pattern

### 1) Create → capture sub‑ID
```
const result = await $api.user.create.mutate({ ...payload })
const recordId = result?.record?.id
const subId = recordId?.id
```

### 2) Use sub‑ID in TRPC calls
```
await $api.user.update.mutate({ id: subId, payload: {...} })
```

---

## Terminology checklist (for docs + generators)

When writing documentation or code snippets:
- Use **Record ID** for `{ tb, id }`.
- Use **Sub‑ID** for the inner `id`.
- Use **Surreal ID literal** for `table:id` strings.

If an endpoint expects `id`, it **always** means **Sub‑ID** unless explicitly stated otherwise.
