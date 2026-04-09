# Design Dump: RID And ID Contracts

## Source

Captured from the Lucky helper-function fix and the surrounding discussion on 2026-04-09.

## Problem

Shared helper functions had grown beyond their intended contract.

The example was `fn::ridParam(...)`, which had started doing more inference than a simple record-id normalizer should do. That made it harder to reason about:
- generated functions
- router inputs
- frontend request shapes
- what the helper was actually responsible for

There is a similar recurring problem in frontend-to-router integrations:
- agents often fail to distinguish record id object shapes from the raw id value expected by the route
- malformed id payloads travel too far before failing

## Proposed v1.5 direction

### 1. Minimal helper contracts

Shared helper functions must have sharply defined responsibility.

Example rule:
- `fn::ridParam(...)` normalizes a record reference or returns `NONE`
- it does not check existence
- it does not enforce business rules
- it does not do additional mutation or inference

### 2. Shared vs optional utility functions

We need three utility tiers:

- core shared utilities that every schema deployment should inherit
- optional library utilities that can be adopted into a tenant when needed
- app-owned overrides when a tenant must diverge intentionally

### 3. Explicit id-shape policy

Generated routes and frontend callers need an explicit app-level policy for id inputs, such as:
- raw string id only
- fully qualified rid string
- object shape with `tb` + `id`

That policy should be:
- generator-visible
- documented
- reflected in emitted AGENTS guidance
- enforced by Zod/request schemas before the router is called

### 4. Recipe-first frontend/backend interface work

Agents should not improvise frontend payload shapes.

We need recipe/skill-driven guidance for:
- how to call generated routes
- how to construct record ids
- when to pass raw ids vs record objects
- how to normalize values before Surreal sees them

## V2 implication

Lyric v2 should treat:
- helper-function minimalism
- request-shape policy
- utility-library layering
- frontend/router contract recipes

as first-class architecture topics, not cleanup afterthoughts.
