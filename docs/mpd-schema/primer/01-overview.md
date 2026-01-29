Title: MPD Framework Overview
Scope: global
Applies to: MPD Schema Tooling, Schema‑kit, Admin UI

The MPD framework is an opinionated system that turns a **graph DSL** into a working admin stack:

1) `graph.mpdg` → parsed into specs
2) Specs → SurrealDB functions, views, events, indexes
3) Specs → TRPC routers + request schemas
4) Specs → Typesense collections + views
5) Specs → Admin UI pages + field layouts
6) Schema‑kit module → composables + controllers + runtime helpers

The goal: **a single source of truth for data**, with predictable tooling and zero guesswork.
