# Project: Helios Admin Field Contract V1

## Status
- Phase: Active
- Priority: High
- Target app: `apps/heliosadmin`
- Layer focus: `layers/helios-admin` (+ `layers/helios-ui` consumers)
- Last updated: 2026-02-25 (V1.2 hardening pass)

## Goal
Deliver a production-ready first slice of the Helios field contract system that proves:

1. Field APIs are standardized and typed.
2. Component capabilities are documented in-app (`/components`).
3. Tab and widget overrides are first-class.
4. Mixed-card saves are grouped by action endpoint and executed in controlled batches.

This enables fast default admin generation while preserving deep customizability.

## Scope (V1.1)
In scope:
- Canonical field contract types for:
  - `AInput`
  - `ACombobox`
  - `AComboboxAsync`
- Component registry + living docs pages:
  - `/components`
  - `/components/[component]`
- Override support:
  - Tab override
  - Widget override
- Save execution:
  - Group by action (e.g. `user.update`, `user.profile.update`)
  - Run grouped actions with controlled batching and clear partial-failure reporting

Out of scope:
- Per-field override (deferred)
- Full migration into `fields` layer (deferred)
- Complete coverage for all field families (deferred)

## Core Contracts

### 1) Field contract source of truth
Create and adopt typed contracts for:
- Shared field properties
- Binding kinds (`model`, `subtable`, `taxonomy`, `custom`)
- Component-specific options

### 2) Explicit component IDs
Use explicit component names in spec/runtime:
- `AInput`
- `ACombobox`
- `AComboboxAsync`

No variant-overloaded single component pattern for V1.

### 3) Override filesystem convention
Model-scoped overrides:
- Tab: `app/components/admin/overrides/<model>/tabs/<tabSlug>.vue`
- Widget: `app/components/admin/overrides/<model>/widgets/<widgetId>.vue`

### 4) Save grouping semantics
When save is triggered for a widget/card:
- Collect field payloads by action endpoint.
- Merge fields per action into one payload object.
- Execute grouped calls in batch.
- Support mixed actions in the same widget.

Example:
- `user.update` <- `{ firstName, surname }`
- `user.profile.update` <- `{ country, bio }`

## Acceptance Criteria
V1.1 is complete when all are true:

1. `/components` shows component cards driven by typed registry metadata.
2. `/components/[component]` demonstrates API, value shape, and live examples for each V1 component.
3. Record page supports tab/widget override rendering via filesystem convention.
4. Widget save groups fields by action and executes grouped operations correctly.
5. Demo model flow proves: spec -> render -> grouped save -> persisted result.

## V1.2 Hardening (Implemented)
This pass tightened certainty around component options and made the contract executable.

Delivered:
1. Canonical option definitions per component contract (`options[]` with `type`, `required`, `defaultValue`, `description`, `values`).
2. Shared option resolver/validator used by runtime and audit.
3. Components detail page now shows full option matrix table and validation output.
4. Runtime audit now validates:
   - required options are explicitly present in spec
   - option value types and enums
   - unknown option keys (warn)

Primary files:
- `apps/heliosadmin/layers/helios-admin/app/types/field-contract.ts`
- `apps/heliosadmin/layers/helios-admin/app/config/field-component-registry.ts`
- `apps/heliosadmin/layers/helios-admin/app/utils/field-component-options.ts`
- `apps/heliosadmin/layers/helios-admin/app/pages/components/[component].vue`
- `apps/heliosadmin/layers/helios-admin/server/api/models/runtime/[model]/audit.get.ts`
- `apps/heliosadmin/layers/helios-admin/app/pages/admin/[model]/[rid].vue`

## Field Settings Contract Rule
`field.component.options` is now governed by the registry contract for the selected `field.component.name`.

Contract flow:
1. Builder/layout spec writes `component.name` + `component.options`.
2. Runtime resolves options through contract defaults (`resolveFieldComponentOptions(..., { applyDefaults: true })`).
3. Audit validates explicit required keys and contract compliance (`requireExplicitRequired: true`).
4. `/components/[component]` acts as live contract reference for allowed parameters.

Implication:
- Any new field component must add its contract entry before it is considered first-class for layout specs.
- Unknown option keys are surfaced as audit warnings to avoid silent drift.

## Risks
- Existing dirty worktree and generated artifacts across apps.
- Layer source/copy drift (`apps/schema/layers/*` vs `apps/heliosadmin/layers/*`).
- Backward compatibility for pre-contract model specs.

## Mitigations
- Constrain edits to `apps/heliosadmin` plus this project doc in V1.1.
- Preserve runtime fallbacks for unknown or legacy field shapes.
- Keep override behavior additive (no break to default renderer).

## Next after V1.1
- Per-field override layer.
- Builder-driven override scaffold generation UX.
- Migration of mature contracts/catalog into the `fields` layer.

## Next after V1.2
1. Extend strict contract coverage to remaining field families (date, tags, checkbox/switch, radio, taxonomy widgets).
2. Add builder-side contract form controls so only valid options are authored in YAML.
3. Add CI/runtime audit gate level that can fail on unknown option keys (currently warn).
4. Generate contract docs from registry automatically to prevent drift.

## V1.3 Builder Container Layout (Implemented)
This pass adds frame-level container layout controls so nested frame composition is deterministic and editable per frame.

Delivered:
1. Frame options now include a dedicated `Layout` section with `mode` (current: `grid`) and grid size (`cols`, `rows`).
2. Per-frame inner layout defaults to `24 x 24`.
3. Drawing, drag, resize, duplicate, paste, and keyboard nudge all resolve snapping/grid math from the selected parent frame container (not only root canvas grid).
4. Commit renderer now reads `layout.base.innerLayout.grid` recursively so generated output respects each frame's local container grid.
5. Wrapper guide visibility defaults to enabled (`showWrapperLinesOnSelect = true`) for active frame editing clarity.

Primary files:
- `apps/builder/app/stores/heliosBuilder.ts`
- `apps/builder/app/components/builder/FrameOptionsManager.vue`
- `apps/builder/app/pages/index.vue`
- `apps/builder/server/trpc/routers/frame.ts`
- `apps/builder/app/types/helios/layout.ts`

Notes:
- `layout.base.innerLayout` is now the canonical inner-container layout contract.
- Legacy `layout.base.grid` is still read as fallback for backward compatibility.
