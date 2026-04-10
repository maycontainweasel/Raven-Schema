# ridParam Contract

`fn::ridParam($model, $value)` exists to do one thing only:

- accept an incoming record-reference shape
- normalize it into a Surreal record id
- or return `NONE`

It is not supposed to:
- call `record::id(...)` on uncertain input
- check existence
- enforce business rules
- mutate anything
- perform extra inference unrelated to record-id normalization

## Accepted shapes

`fn::ridParam($model, $value)` should accept:

- plain key strings
- fully-qualified record strings
- objects with `tb` and `id`
- objects with only `id`
- numeric scalar keys

Examples:

- `"mike1@test.com"` -> `u:mike1@test.com`
- `"u:mike1@test.com"` -> `u:mike1@test.com`
- `{ tb: "u", id: "mike1@test.com" }` -> `u:mike1@test.com`
- `{ id: "mike1@test.com" }` -> `u:mike1@test.com`
- `12` -> `course:12`

## Caller responsibilities

Callers must use other functions for anything beyond normalization.

Typical caller follow-up:

- `type::is_record(...)`
- `record::exists(...)`

If a callsite needs:
- existence checks
- business validation
- richer record-shape interpretation

it should do that outside `fn::ridParam(...)`.

## Why this matters

When `ridParam` grows beyond this contract, it becomes easy to lose sight of its real purpose and harder to reason about generated functions, router inputs, and record-id behavior across apps.

The same rule applies to `fn::stringID(...)`:

- safe normalization and joining only
- no unsafe `record::id(...)` on uncertain input
- no hidden business logic
