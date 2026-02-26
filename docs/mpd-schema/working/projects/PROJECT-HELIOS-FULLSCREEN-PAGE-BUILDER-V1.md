# Project: Helios Fullscreen Page Builder V1

## Status
- Phase: Active
- Priority: High
- Last updated: 2026-02-26
- Scope: `apps/heliosadmin/layers/helios-admin` + `apps/schema/layers/helios-admin`

## Goal
Move the current `page-builder-2` model layout editor into a dedicated fullscreen builder environment so layout authoring is less cramped and remains file-first.

## V1 Decisions (Locked)
1. Replace current PB2 entry UX with a dedicated fullscreen overlay from `/models/[model]`.
2. Keep the current `.ui.yaml` and generated `.ui.json` contracts unchanged.
3. Keep current native pointer drag/resize (`PageFrameCanvas`) for frame interactions.
4. Remove legacy Page Builder tab from visible navigation (PB2 path is the canonical builder UX).
5. Add close guard for unsaved edits in the builder overlay.
6. Sync implementation in both helios-admin layer copies.

## What V1 Delivers
1. Fullscreen fixed builder shell with dedicated top action bar.
2. In-overlay actions for:
- Schema reference
- Commit spec
- Close builder
3. Close confirmation when local spec edits are dirty.
4. Escape behavior:
- close topmost builder dialog first
- then prompt/close builder
5. Existing PB2 feature parity preserved:
- tabs list/reorder
- frame add/reorder/resize
- fields card preview
- field settings JSON/options editor
- runtime preview mode

## Non-Goals (V1)
1. New spec schema or split spec files.
2. Interact.js migration.
3. New frame engine (nested draw/grid redesign).
4. Per-field override scaffolding UX.

## Contracts and Persistence
- Commit path remains:
  - `POST /api/models/layout/[model]`
  - `commitModelSpec(...)`
- Generated outputs remain:
  - fragment: `app/helios/fragments/models/<model>.ui.yaml`
  - generated: `app/helios/generated/models/<model>.ui.json`
- Route generation behavior remains unchanged.

## Implementation Notes
- Builder overlay dirty state compares current in-memory spec to last loaded/committed snapshot.
- Overlay close/backdrop/Escape respects dirty confirmation.
- Modal stack order increased so field/frame/schema dialogs render above overlay.

## Acceptance Criteria
1. Clicking `Page Builder` opens fullscreen overlay.
2. Builder remains visually and functionally equivalent to prior PB2 capabilities.
3. Commit still persists and regenerates as before.
4. Closing dirty builder requires explicit discard confirmation.
5. Behavior is consistent in both layer copies.

## Next Iterations
1. Formalize frame/container contracts for override-level mapping.
2. Add model-field reference side panel + filtered field picker UX.
3. Introduce class-safe controls for frame/card/field layout tokens.
4. Add override scaffolding controls for frame/card/field layers.
