# MPDG Tag Glossary (WIP)

This is a working reference for the “program-like” tags used in `config/graph.mpdg`.

## General rules

- Field syntax (inside the `{ ... }` fields block):
  - `fieldName!: "default", <tag ...>` (`!` means required; `?` means nullable)
  - The value after `:` is the default literal (e.g. `""`, `0`, `false`, `{}`, `[]`).
  - Anything in `<...>` is a tag/program.

- Angle tags:
  - `$email` is a field reference (used mainly by `id:`).
  - `<password {hash: argon2}>` is a program tag (`password`) with an options object.
  - `<uniqueId, {value: $email}>` is the same idea, allowing a comma before the options object.
  - `<record<role>>` is a type tag (record type).
  - `<assign>` marks the field as a computed assignment after payload merge.

## ID tags

- `id: $email`
  - Spec output:
    - `id.source: email`
  - Meaning:
    - Use the value of `email` to build the record id (upsert id structure).
- `id: $parent`
  - Meaning:
    - Use the parent record id for subtable IDs.
- `id: S($parent, $exam)`
  - Meaning:
    - Build a composite string id from multiple values (uses `fn::stringID([...])`).

## Field type programs

### `<email>`
- Spec output:
  - `type: email`
- Notes:
  - If the default literal is `""` (placeholder), the generator currently emits `required: true` and omits `default`.

### `<password {...}>`
- Example:
  - `password!: "", <password {hash: argon2}>`
- Spec output:
  - `type: password`
  - `required: true`
  - `options.hash: argon2`
- Notes:
  - `{type: argon2}` is also accepted as an alias for `{hash: argon2}`.

### `<record<...>>`
- Example:
  - `role: student, <record<role>> <assign>`
- Spec output:
  - `type: record<role>`
- Default/assign behavior:
  - `assign: true` + default present → defaults use `""`, assign step uses:
    `type::record("role", if ($payload.role) { $payload.role } else { "student" })`
  - `assign` omitted + non‑empty default → defaults use:
    `type::record("role", "student")`
  - empty default (`""`/`null`) stays empty; no `type::record("role","")`.
  - **Raw defaults:** wrap multi‑line Surreal expressions in `{ ... }` (via YAML `|-`) to emit them raw (no quotes). `$field` references still map to `$payload.field`.

### `<uniqueId {...}>`
- Example:
  - `uniqueId: "", <uniqueId, {value: $email}>`
- Spec output:
  - `type: uniqueId`
  - `options.value: $email`
- `default` is omitted when the default literal is `""` (uniqueId is program-generated).

### `<permalink<...>>`
- Example:
  - `permalink: <permalink<$key>>`
- Spec output:
  - `type: permalink`
- Notes:
  - Treated as a slug program; generators should apply `string::slug(...)` (typically to `$payload.key` unless overridden).

## Planned / next
- Validation / indexes driven by tags.
- Standard library of programs (email/password/uniqueId/slug/etc).
- Making program options strongly-typed and documented next to generators.

## Typesense tags (within `typesense:` blocks)
- `<facet>` → mark a field as facet-enabled in the Typesense schema.
- `<RID>` → force record ids to stringify (view uses `record::id($this.id)`).
- `<optional>` or `?` suffix → `optional: true` on the Typesense field.
- `<object { ... }>` → `type: object` with nested `fields` in the Typesense schema.
- `<array<object { ... }>>` / `<array<{ ... }>>` / `{ ... }[]` → `type: object[]` with nested `fields` in the Typesense schema.
  - Field names inside `{ ... }` are preserved as-is.
- Multiline `<{ ... }>` tags are supported (they are collapsed into a single tag block).
- `<infix>` / `<infix: always|fallback|off>` → stored in `collectionsMeta` for query defaults.
- `<sort>` / `<sort: asc|desc>` → stored in `collectionsMeta` for query defaults.
- `<highlight>` / `<highlight: full|snippet>` → stored in `collectionsMeta` for query defaults.

## Relations (record-backed links)

Syntax (caps block):
```
relations:
  exam -> ExamQuestions -> q { cardinality: many, storeOnModel: false, payloadField: exams }
```

Defaults:
- `cardinality`: many
- `storeOnModel`: true
- `payloadField`: left model (pluralized if many)
- `processor`: functions
- `hook`: table where the relation is declared

Notes:
- Relations can be declared on either table. Each declaration applies to the table where it appears.
  Edge tables + attach/detach helpers are still generated once per relation key.
- CRUD functions can auto-attach/detach when `processor: functions`.
- `storeOnModel: false` makes the payload field transient (not stored + not in base Zod schema + not in CRUD inputs).
- `attach*` / `detach*` accept record IDs, strings, or arrays; inputs are normalized via `fn::toRecordArray`.

## View expression helpers
- `$field` expands to `$this.field` when used inside a larger expression.
  - `instances: $instances || []` → `($this.instances || []) AS instances`
- If the expression is exactly `$field`, it becomes a direct field projection:
  - `instances: $instances` → `instances`
- You can use `||` to supply defaults for missing values.

## ID structure expressions
- `id.structure` accepts explicit expressions when it contains `$`.
- `$field` expands to `$payload.field`.
- Example:
  - `structure: fn::stringID([record::tb($id), record::id($id)])`
  - Generates: `type::record('<model>', fn::stringID([record::tb($payload.id), record::id($payload.id)]))`

## Capability mods (WIP)

In the capabilities block (`[ ... ]`), you can enable feature modules using `mods:`:

```mpdg
[
  crud
  router
  views: admin, public
  mods: instance, post, refreshViews
]
```

Behavior:
- `instance` → outputs `instance: true` (or `instance: { ... }` if options provided)
- `post` → outputs `post: { enabled: true, ...options }`
- `refreshViews` → outputs `refreshViews: true` (or `refreshViews: { ... }` if options provided)

Options shape (parsed but not interpreted yet):
- `mods: instance: {}`
- `mods: post { ... }`
- `mods: refreshViews: { ... }`
