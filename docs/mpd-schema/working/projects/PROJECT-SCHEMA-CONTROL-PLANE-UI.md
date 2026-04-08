Title: Project — Schema Control Plane UI
Scope: global
Applies to: schema framework, tenant governance, schema operations

This project tracks the future front-end UI that will visually manage schema tenants and shared framework operations.

## Intent

- Provide a visual control surface for schema tenant management.
- Make promotions, releases, adoption state, and generation flows visible without relying only on terminal workflows.
- Give the schema ecosystem an operator-facing UI for long-running maintenance.

## Early direction

- tenant registry view
- release/adoption status per tenant
- promotion candidate queue
- generation and validation actions
- future schema authoring controls where appropriate

## Constraints

- The UI must reflect the master repo as the control plane.
- It must not blur the line between shared framework work and tenant-owned state.
- It should build on the operating model already captured in `docs/ai/workstreams/schema-operating-system/**`.

## Status

This is a tracked future project, not part of the first Zed editor-tooling delivery.

## Reporting

Use the report format in `docs/projects/SCHEMA-DOCS-WORKING-SITE.md`.
