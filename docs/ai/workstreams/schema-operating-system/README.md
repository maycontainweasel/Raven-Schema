# Schema Operating System

This workstream tracks the long-running effort to make the schema ecosystem calm, opinionated, reproducible, and easy for both humans and AIs to operate.

It is broader than child-repo sync alone. It covers the full operating model for:

- schema skills
- tenant repo governance
- shared-framework promotion
- tenant adoption of shared releases
- version tracking
- verification routines
- naming and language shifts
- graph decomposition and composition
- the boundary between active Schema v1 work and planned Lyric v2 work

Use this workstream whenever the task is about making the schema platform itself easier to use, safer to maintain, or more understandable to future agents.

## Working name

For now, keep the workstream name as `schema-operating-system` even if the framework brand changes later.

This gives us one stable phrase to use in prompts:

- "Continue the schema operating system workstream."
- "Update the schema operating system docs before ending this round."
- "Treat this as schema operating system work, not just a local tenant fix."

## Goal

Converge the schema ecosystem from:

- ad hoc
- tenant-specific
- difficult to resume
- repetitive
- partially documented

into a system that is:

- opinionated
- repeatable
- explicit about defaults
- explicit about escalation
- battle-tested by skills, scripts, and verification
- easy for a fresh AI to resume without chat history

## Core outcomes

### 1. Skill architecture

Define how schema skills are structured, named, promoted, validated, and discovered.

This includes:

- atomic skills
- composed skills
- operational skills
- verification skills
- "guardian" or "nanny" skills that enforce defaults and ask before deviation

### 2. Tenant governance

Define how a tenant schema repo:

- reports a framework-safe fix
- distinguishes engine work from app-owned output
- proposes changes back up to master
- adopts a shared release after it lands

### 3. Versioning model

Define opinionated versioning for:

- the shared schema framework
- tenant schema repos
- tenant adoption state
- generator-affecting changes that require regeneration

### 4. Verification model

Define the reusable "prove it worked" layer for recurring operational routines such as:

- password refresh flows
- auth/session verification
- MCP connectivity
- tenant normalization
- release adoption

### 5. Naming and language

Track the ongoing exploration of friendlier, lighter terminology for the framework and authoring model.

Current naming exploration includes:

- framework/system naming
- graph source naming
- composition vocabulary like lyric, score, air, songbook, stanza

### 6. Graph modularization

Define how the current single `graph.mpdg` source may evolve into:

- multiple composable source files
- reusable templates
- stitched or compiled graph inputs
- better versionability of shared and app-owned schema inputs

## Canonical references

- `AGENTS.md`
- `docs/AI-READ-HERE.md`
- `docs/ai/control-plane.md`
- `docs/ai/repo-registry.yaml`
- `docs/ai/tenant-governance.md`
- `docs/ai/versioning-model.md`
- `docs/ai/skill-architecture.md`
- `docs/ai/templates/framework-candidate-note.md`
- `docs/ai/framework-promotion-playbook.md`
- `docs/ai/framework-release-log.md`
- `docs/ai/skills/README.md`
- `docs/ai/workstreams/schema-repo-operations/README.md`
- `docs/ai/workstreams/schema-operating-system/backlog.md`

## Working rule

If a repeated schema pain point appears more than once, do not leave the solution only in chat context.

Capture it here as one of:

- a decision
- a prompt recipe
- a skill requirement
- a versioning rule
- a verification checklist item
- a future script candidate
