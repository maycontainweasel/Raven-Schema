# Schema Skill Architecture

This file defines how schema skills should be structured and when a repeated schema workflow should graduate into a skill, script, or validation routine.

## Purpose

The schema ecosystem depends on repeated operational behavior across:

- schema authoring
- runtime assumptions
- auth/session flows
- MCP usage
- tenant governance
- shared framework promotion
- tenant adoption of shared releases

Skills exist to stop fresh agents from reinventing these workflows badly.

## Skill tiers

### Atomic

One precise action or one tightly scoped decision.

Examples:

- create or update a stanza
- choose the right resource contract
- validate a graph change

### Composed

A small workflow built from multiple atomic steps.

Examples:

- build a source-authority directory
- update a record workspace
- register a tenant in the master registry

### Operational

A real maintenance or lifecycle flow with side effects across repos, runtimes, or environments.

Examples:

- promote a tenant-discovered framework fix
- adopt a shared release into a tenant
- refresh user password hashes
- verify login and session behavior after an auth change

### Verification

A "prove it worked" workflow.

Examples:

- verify login succeeds
- verify session cookie refreshes
- verify an MCP server is reachable and configured correctly

### Guardian

A default-enforcing wrapper that tells an agent how to behave before it starts mutating state.

Guardian skills exist to reduce repeated mistakes.

They should:

- establish the default safe path
- define when the agent must ask first
- stop ad hoc deviations
- route to the right operational or atomic skills

## Required sections in every schema skill

Every skill should include:

- `Goal`
- `Use when`
- `Do not use when`
- `Read first`
- `Default behavior`
- `Ask first if`
- `Rules`
- `Definition of done`

If the skill is operational or verification-heavy, it should also include:

- `Commands`
- `Validation`
- `Failure handling`

## Required behavior for guardian skills

Guardian skills must explicitly state:

- the default path
- which mutations are forbidden without asking
- what the agent must classify before changing anything
- which downstream skill to use once the situation is understood

Good guardian prompts sound like:

- "Do the default safe thing unless a documented exception applies."
- "Ask before promoting app-owned work."
- "Ask before changing shared auth contracts."

## When a workflow becomes a skill

Create or update a skill when any of the following are true:

- the same workflow appears more than once
- fresh agents repeatedly get it wrong
- the workflow has a non-obvious default path
- the workflow has safety or versioning implications
- the workflow benefits from a copy-ready prompt

## When a skill must gain a script

Add or improve a script when:

- the workflow performs repeated shell steps
- the workflow spans multiple repos
- the workflow is safety-critical
- the workflow needs consistent reporting
- prose-only execution keeps drifting

Preferred stack:

- skill for reasoning
- script for repeatable mechanics
- checklist for proof

## Naming rules

Use `schema-` as the stable skill prefix until a deliberate rename round is approved.

Recommended patterns:

- `schema-<noun>-authoring`
- `schema-<noun>-verify`
- `schema-<noun>-check`
- `schema-<verb>-<object>`
- `schema-guardian-<domain>`

Examples:

- `schema-auth-login-verify`
- `schema-session-cookie-verify`
- `schema-mcp-connect-check`
- `schema-adopt-framework-release`
- `schema-guardian-tenant-fix`

## Working rule

If a skill keeps being used as free-form prose only, decide whether the next improvement should be:

- a better skill
- a supporting script
- a validation checklist
- a guardian wrapper
