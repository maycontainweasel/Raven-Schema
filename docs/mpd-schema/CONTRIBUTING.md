Title: MPD Schema Docs – How to Add or Update
Scope: global
Applies to: MPD Schema documentation

This file defines the **documentation paradigm** for MPD Schema Docs.

## 1) Where to add content

Use these folders:

- `primer/` → high‑level concepts + mental model (read‑first)
- `reference/` → rules, APIs, contracts, precise behavior
- `patterns/` → canonical implementations and “how we do it”
- `recipes/` → step‑by‑step tasks
- `working/` → living examples tied to code
- `models/` → model‑specific docs
- `api/` → routers/handlers, request/response specifics

## 2) File structure

Every new doc should start with this small header (plain markdown):

```
Title: <clear title>
Scope: global | model:<model> | feature:<feature>
Applies to: <Nuxt 4 | SurrealDB | Typesense | tRPC | MPDG>
Depends on: <optional list>
```

## 3) How to write

Be explicit and deterministic:
- “Do X” > “You might try X”
- No guessing. Only document rules we actually use.
- Every workflow must match the generated code.

## 4) How to add a recipe

Recipes are task‑oriented. Use this template:

```
Title: <Task>
Scope: feature:<feature>
Applies to: <stack>
Depends on: <doc links>

Goal:
Steps:
1)
2)
3)

Example (code):
```

## 5) How to add a pattern

Patterns are reusable implementations. Use this template:

```
Title: <Pattern>
Scope: feature:<feature>
Applies to: <stack>
Depends on: <doc links>

Why:
When to use:
Implementation:
Pitfalls:
```

## 6) Keep the INDEX updated

Whenever you add a major doc, update:

`docs/mpd-schema/INDEX.md`

That index is the canonical read‑first order.
