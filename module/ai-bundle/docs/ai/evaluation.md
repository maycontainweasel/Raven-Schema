# Schema Guidance Evaluation

## Purpose
Use this checklist to pressure-test whether this app’s schema guidance is sufficient for a real task.

## Require the agent to state these before coding
- which `AGENTS.md` files applied
- which schema skill triggered
- which files it read first
- the model key and table key
- whether the model is `source authority` or `instance authority`
- whether `instancesEnabled` matters in this app
- whether fragment-based model UI generation is enabled for this project or explicitly disabled in app config
- which endpoints or controllers it intends to use
- which composables it intends to use
- whether Typesense sync is required
- whether TypeSense refresh or rebuild would fail loudly on partial indexing

## Pass criteria
- the agent uses generated/runtime truth before coding
- the agent chooses the correct authority workflow
- the agent does not invent ad hoc CRUD or Typesense transport
- the agent keeps Typesense server-backed
- the agent does not report TypeSense refresh success when indexed counts are incomplete
- the agent states assumptions when guidance is missing

## If it fails
- App-specific failure: update a local `AGENTS.md` file or local app docs.
- Framework-wide failure: push the fix back into `apps/schema`.
