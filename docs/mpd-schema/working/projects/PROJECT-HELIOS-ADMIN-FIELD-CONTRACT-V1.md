# Project: Helios Admin Field Contract V1

## Status
- Phase: Active
- Priority: High
- Target app: `apps/heliosadmin`
- Layer focus: `layers/helios-admin` (+ `layers/helios-ui` consumers)

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
