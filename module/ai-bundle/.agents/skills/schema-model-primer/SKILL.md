---
name: schema-model-primer
description: Use when a task touches a schema-driven model, controller, CRUD flow, directory, record workspace, Typesense behavior, or authority routing in a schema-kit consumer app. Read the local schema runtime contracts and model docs before making changes.
---

# Schema Model Primer

## Goal
Resolve the model contract before coding so the implementation uses emitted runtime truth instead of inventing behavior.

## Use when
- A task touches a schema-driven model in this app.
- You need to determine endpoints, authority, instance routing, or Typesense behavior.

## Do not use when
- The task is purely visual and does not touch schema runtime behavior.
- The task is specific to Helios design/layout concerns rather than schema runtime concerns.

## Read first
1. `docs/ai/architecture.md`
2. `docs/ai/runtime/authority-routing.md`
3. `docs/ai/runtime/resource-selection.md`
4. `docs/controllers/<model>.md`
5. `modules/schema-kit/runtime/generated/models.ts`
6. `modules/schema-kit/runtime/generated/models.manifest.ts`
7. `modules/schema-kit/runtime/generated/databases.ts`
8. `references/read-first.md`
9. If Typesense is involved: `docs/ai/runtime/typesense.md`

## Required decisions before coding
- model key
- table key
- authority after alias normalization
- whether `instancesEnabled` matters here
- source instance
- target instance rule
- generated endpoints
- exact read contract for the task (`typesense.resource`, `resource(<key>)`, `list`, relation, taxonomy, subtable, or override)
- slug/id policy
- whether Typesense sync is required

## Rules
- Normalize `tenant`, `remote`, and `instance` to `instance authority` before choosing a flow.
- Treat generated metadata and controller docs as the factual contract.
- Choose the narrowest existing runtime contract that satisfies the task before adding or changing a resource surface.
- Do not invent resource keys by guesswork. If no existing contract fits, ask before creating a new reusable resource in schema.
- Prefer `useApiProcess()` as the public orchestration name and `useCRUD()` as the compatibility implementation.
- Do not invent custom CRUD or Typesense transport when runtime contracts already exist.

## Definition of done
- The model contract was read before implementation.
- Authority and instance routing were stated explicitly.
- Endpoints and runtime helpers were chosen from generated files and controller docs.
- Typesense behavior, if enabled, is accounted for explicitly.
