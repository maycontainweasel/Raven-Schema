# Authority Routing

## Purpose
This document defines the abstract runtime contract for where schema-driven records live and how writes are routed.

## Canonical guidance terms
- `source authority`: the source database is the first write target and the system of record.
- `instance authority`: the record lives on one or more target instance databases and is not first written to the source database.

## Current implementation aliases
Current graph metadata, manifests, or older docs may still use:
- `tenant`
- `remote`
- `instance`
- `local`

Normalize them like this before reasoning about behavior:
- `source` or `local` -> `source authority`
- `tenant`, `remote`, or `instance` -> `instance authority`

This keeps the canon stable even while runtime serialization is being cleaned up.

## Where authority truth comes from

### App topology
Generated database topology comes from `src/lib/databasesExport.ts` and is emitted through `@schema/db`.

The runtime fields that matter are:
- `instancesEnabled`
- `sourceDbInstance`
- `tenantDbInstances`
- `defaultDbInstance`
- `instanceTopology`

### Model metadata
Generated model metadata comes from `src/lib/modelsManifest.ts` and is emitted through `@schema/models`.

Resolve, at minimum:
- model key
- table key
- authority/data mode
- slug/id policy
- Typesense enablement
- router and controller contract

## Operational rules

### When instances are disabled
- If `instancesEnabled === false`, treat the app as single-database.
- Use `defaultDbInstance`.
- Authority still describes the model conceptually, but it does not fan out across multiple databases.

### Source authority
- Write to the source database first.
- Only after a successful source write should the same mutation be echoed to target instances.
- If the source write fails, instance writes must not proceed.
- `useApiProcess()` / `useCRUD()` should prefer the generated source instance if one is not supplied explicitly.
- A payload field such as `instances` describes the record, but it does not by itself tell the orchestration layer where to write. Pass target instances explicitly to the process call.

### Instance authority
- Do not write to mothership/source first.
- Write directly to the explicit target instance database or databases.
- If no target instances are available in a multi-instance app, treat that as a configuration or invocation error.
- `bypassMothership` is an implementation lever, not the definition of the contract; the contract is that the record is authored on the instance side.

## Runtime tools
- Use `module/src/resources/composables/useCRUD.ts` as the authoritative orchestration implementation.
- Prefer the public name `useApiProcess()` when describing or consuming the orchestration API.
- `useCRUD()` remains the compatibility implementation and alias source.

## Agent checklist before coding
State these explicitly before implementing a schema-driven feature:
- model key
- table key
- authority after alias normalization
- whether `instancesEnabled` is true
- source instance key
- target instance selection rule
- generated endpoint(s) to call
- whether Typesense sync is required after mutation

## Scope boundary
- This document defines behavior.
- Consumer apps may add local examples that illustrate the behavior, but those examples must not replace the contract.
