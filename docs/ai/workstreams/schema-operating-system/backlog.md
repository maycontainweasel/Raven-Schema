# Backlog

This file is the current backlog for the schema operating system workstream.

Use it to keep the long-running improvement tracks visible without relying on chat history.

## Current focus

1. Tenant registration and registry hygiene
2. Shared-framework promotion and adoption lifecycle
3. Guardian skills and operational verification
4. Versioning and release semantics
5. Graph authoring correctness and validation
6. Git/process discipline across master and tenants
7. Naming exploration and graph modularization
8. Schema v1 / Lyric v2 program boundaries

## Active tracks

### P0: Tenant visibility and control-plane hygiene

Goal:

- Every tenant that uses schema is registered, auditable, and carries an explicit adoption state.

Current work:

- keep `docs/ai/repo-registry.yaml` as the canonical tenant registry
- prefer `needs-audit` over stale certainty
- keep `normalize <repo-key>` and `register <repo-key>` as stable instructions

Definition of done:

- no active tenant is missing from the registry
- remotes, branch expectations, and release markers are documented
- stale tenant status is easy to detect

### P0: Promotion and adoption contract

Goal:

- A tenant-discovered fix has a clear path back to master and then back out to other tenants.

Current work:

- promotion candidate template
- tenant governance rules
- shared release adoption skill

Definition of done:

- Lucky-style generator fixes have a durable handoff
- shared release fanout includes regeneration and verification where required

### P1: Guardian layer

Goal:

- Fresh agents default to the safe path instead of making ad hoc framework changes.

Current work:

- tenant-fix guardian
- auth-flow guardian

Next additions:

- release-adoption guardian if adoption continues to drift
- graph-authoring guardian if MPDG mistakes keep recurring

### P1: Operational verification library

Goal:

- Repeated verification flows become reusable and explicit.

Current work:

- password refresh
- login verification
- session-cookie verification
- MCP connectivity

Next additions:

- tenant normalization verification
- graph validation and regeneration verification
- release-adoption verification checklist by impact category

### P1: Versioning model

Goal:

- Shared framework state and tenant adoption state are always legible.

Current work:

- shared `schema-master-000N`
- tenant `.schema-release.yaml`
- release impact categories

Open questions:

- whether each tenant app branch should also carry its own monotonic tenant-local release counter
- whether tenant adoption state should be mirrored into a structured status report in master

### P1: MPDG quality and authoring guardrails

Goal:

- Graph authoring errors become harder to make and easier to diagnose.

Current work:

- MPDG canon lives under `docs/ai/mpdg/**`
- graph validation skill exists

Next additions:

- clearer error-handling expectations in MPDG docs
- stronger examples of valid stanza/view/type blocks
- opinionated guidance for modular graph composition

### P2: Git and change-management process

Goal:

- Framework work, tenant work, and release adoption all follow a predictable git path.

Needed:

- clearer default branch/process guidance for tenant-local feature work
- explicit promotion-note expectations before master promotion
- a shared commit/versioning checklist for important schema rounds

### P2: Naming and graph modularization

Goal:

- Reduce the emotional and operational heaviness of the framework without breaking continuity.

Current explored language:

- Lyric
- Air
- Score
- Songbook
- Stanza

Notes:

- keep `schema-*` technical names stable until a deliberate rename round is approved
- naming exploration should inform future graph modularization and authoring UX

### P2: Schema v1 / Lyric v2 program boundary

Goal:

- Keep shipping Schema v1 while giving Lyric v2 a real design and implementation runway.

Needed:

- explicit docs that separate v1 operations from v2 redesign work
- a stable home for Lyric v2 planning and future implementation
- a sibling documentation/proving app that hardens v1 while informing v2

### P3: Future schema-owned ops datastore

Goal:

- Decide whether master needs a lightweight structured memory layer beyond markdown and git.

Possible uses:

- tenant status snapshots
- promotion candidate records
- incident/bug memory
- MCP endpoint metadata

Current rule:

- do not introduce a dedicated ops database until the markdown + registry + release-marker model proves insufficient
