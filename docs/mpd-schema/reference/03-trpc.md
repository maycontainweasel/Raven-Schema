Title: TRPC Routers + Controllers
Scope: global
Applies to: TRPC, Controllers

TRPC routers are generated per model and merged with custom routers.

Controllers are front‑end wrappers that:
- normalize inputs (sub‑IDs vs record objects)
- call TRPC procedures
- unify error handling + Typesense refresh

Custom endpoints go in:
```
server/trpc/routers/<model>.ts
schema/controllers/<model>.ts
```
