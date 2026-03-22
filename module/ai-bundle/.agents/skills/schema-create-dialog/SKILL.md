---
name: schema-create-dialog
description: Use when adding or updating a schema-driven create dialog, create popout, or create form that writes through schema runtime contracts. Resolve authority first, then wire the correct endpoint, instance routing, and post-create sync behavior.
---

# Schema Create Dialog

## Goal
Build a create flow that respects authority routing, generated endpoints, and post-create sync behavior.

## Use when
- The task adds or updates a create modal, create dialog, create drawer, or create form for a schema-driven model.

## Do not use when
- The task is a bulk importer or migration flow.
- The task does not create records through schema runtime contracts.

## Read first
1. `docs/ai/runtime/authority-routing.md`
2. `docs/ai/runtime/typesense.md` if the model is Typesense-enabled
3. `docs/controllers/<model>.md`
4. `modules/schema-kit/runtime/composables/useCRUD.ts`
5. `references/read-first.md`

## Rules
- Use `useApiProcess()` / `useCRUD()` for the mutation.
- Source-authority models create on source first, then propagate.
- Instance-authority models create directly on the selected target instance or instances.
- If the model is Typesense-enabled, make post-create sync explicit.
- Keep UI focused on capture and feedback; keep orchestration in handlers, stores, or composables.

## Definition of done
- The create form sends the correct payload to the generated endpoint.
- Authority routing is correct.
- Success handling refreshes the right record or directory state.
- Typesense-enabled models perform explicit post-create sync.
