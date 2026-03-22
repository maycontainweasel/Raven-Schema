# Authority Routing

## Purpose
This document defines where schema-driven records live and how writes should be routed in a consumer app.

## Canonical terms
- `source authority`: write to the source database first, then echo to target instances when required.
- `instance authority`: write directly to the intended instance database or databases without first writing to source.

## Current implementation aliases
Generated metadata or older code may still use:
- `local`
- `remote`
- `tenant`
- `instance`

Normalize them like this before reasoning about behavior:
- `source` or `local` -> `source authority`
- `tenant`, `remote`, or `instance` -> `instance authority`

## Where truth comes from
- App topology: `modules/schema-kit/runtime/generated/databases.ts`
- Model behavior: `modules/schema-kit/runtime/generated/models.ts` and `modules/schema-kit/runtime/generated/models.manifest.ts`
- Model details: `docs/controllers/<model>.md`

## Operational rules

### Single-database mode
- If `instancesEnabled === false`, treat the app as single-database and use `defaultDbInstance`.
- Authority still matters conceptually, but there is no multi-database fan-out.

### Source authority
- Write to the source instance first.
- Only after the source write succeeds should the mutation be echoed to target instances.
- If the source write fails, instance writes must not proceed.
- A payload field such as `instances` describes the record, but it does not by itself tell the orchestration layer where to write. Pass target instances explicitly to the process call.

### Instance authority
- Do not write to the source instance first.
- Write directly to the explicit target instance or instances.
- In multi-instance mode, missing target instances should be treated as a configuration or invocation problem.

## Runtime API
- Prefer `useApiProcess()` as the public orchestration name.
- `useCRUD()` is the implementation and compatibility alias.
- Do not reimplement source-first or instance-direct routing in page code.
