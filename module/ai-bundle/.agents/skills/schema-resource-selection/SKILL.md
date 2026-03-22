---
name: schema-resource-selection
description: Use when a schema-driven task needs a model data shape, linked-record summary, record view, or new generated resource. Inspect existing resource and typesense contracts first, and ask before creating a new graph-backed resource.
---

# Schema Resource Selection

## Goal
Choose the correct existing schema contract before wiring UI or server code, and only create a new resource when the current runtime surface is genuinely insufficient.

## Use when
- A page or component needs linked model data.
- You are choosing between `typesense.resource`, `resource(<key>)`, `list`, relation, taxonomy, or custom controller shapes.
- A task appears to need a new named resource or generated view.

## Do not use when
- The task is purely visual and does not change data loading.
- The correct runtime contract is already stated explicitly in the task or nearby code.

## Read first
1. `docs/ai/runtime/resource-selection.md`
2. `docs/controllers/<model>.md`
3. `server/trpc/routers/generated/<model>.ts`
4. `references/read-first.md`

## Workflow
1. Write down the exact fields the page or handler needs.
2. Find the narrowest existing contract that supplies those fields.
3. Verify the actual returned shape in generated controller docs or generated router code.
4. Use that existing contract.
5. If nothing fits, inspect the graph/spec inputs and ask the user before adding a new reusable resource.

## Rules
- Prefer the narrowest existing contract that satisfies the task.
- Do not invent resource keys such as `Admin` by guesswork.
- Resource endpoints may return `null` when the selector is unsupported or the backing view/function is unavailable. Handle that state explicitly in the caller.
- Do not create a new graph-backed resource silently.
- If a new resource is needed, implement it in schema authoring inputs and regenerate; do not fake it in page code.

## Definition of done
- The chosen contract is evidenced by generated docs or generated router/runtime files.
- The implementation does not assume a missing resource/view exists.
- Any new reusable resource is user-approved before schema changes are made.
