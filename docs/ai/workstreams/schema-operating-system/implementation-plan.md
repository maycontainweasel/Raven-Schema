# Implementation Plan

This is the current plan for converging the schema ecosystem toward a cleaner operating model.

## Track 1: Skill Architecture

Define:

- skill tiers
- skill naming rules
- required sections inside a skill
- when a repeated flow graduates into a skill
- when a skill must gain a script or checklist

Deliverables:

- schema skill architecture doc
- guardian skill conventions
- prompt recipe examples
- initial guardian and operational skill scaffolds

## Track 2: Guardian Layer

Define the first "nanny" or guardian skill category.

Purpose:

- enforce defaults
- stop careless deviations
- ask before risky or non-standard behavior
- reduce repeated mistakes by fresh agents

Candidate first guardian skills:

- schema-guardian-tenant-fix
- schema-guardian-auth-flow
- schema-guardian-release-adoption

Current status:

- tenant-fix guardian scaffolded
- auth-flow guardian scaffolded
- release adoption currently handled by `schema-adopt-framework-release`

## Track 3: High-Value Operational Skills

Scaffold the first set of battle-tested operational routines around:

- auth password refresh
- auth login verification
- session cookie verification
- MCP connection and usage checks
- tenant normalization and adoption

Preferred pattern:

- skill
- script or command surface
- validation checklist

Current status:

- first auth/session/MCP/tenant-adoption skill scaffolds added
- next step is turning the highest-friction routines into script-backed checks where possible

## Track 4: Versioning Model

Define:

- shared framework release semantics
- tenant adoption semantics
- app-level or tenant-level version markers
- whether tenant app repos need their own monotonic release identifiers

Open question:

- should tenant schema repos track a shared release plus their own app release counter?

## Track 5: Tenant Proposal Contract

Define how a tenant reports a framework-safe fix back to master.

Candidate additions:

- `schema-report-framework-candidate`
- `schema-adopt-framework-release`
- tenant-side promotion note template

Current status:

- `schema-adopt-framework-release` scaffolded
- `schema-report-framework-candidate` scaffolded
- promotion note template added

## Track 6: Naming Shift

Track the possible rename of the framework and authoring vocabulary.

Current explored naming space includes:

- Lyric
- Score
- Air
- Songbook
- Stanza

This track should remain exploratory until a deliberate rename round is approved.

## Track 7: Graph Modularization

Define how the current single graph source may be split into:

- smaller source files
- templates
- stitched composed inputs
- reusable shared authoring fragments

The outcome should improve maintainability without losing the simplicity of high-level authoring.

## Track 8: Schema v1 / Lyric v2 program

Define:

- the boundary between current Schema v1 delivery work and Lyric v2 redesign work
- the purpose of the parallel `lyric-v2/` workspace
- the role of the sibling `lyric-docs/` app as a proving ground
- how discoveries in docs/testing should feed both v1 fixes and v2 design decisions
