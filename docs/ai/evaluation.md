# Schema Guidance Evaluation

## Purpose
Use this checklist to evaluate whether the schema guidance bundle is strong enough for a real task.

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

## Good evaluation prompts
- build a new source-authority directory
- build a new instance-authority management flow
- add a create dialog for a schema-driven model
- update a record page and keep Typesense in sync
- add server behavior for a schema-driven model without bypassing generated contracts

## Pass criteria
- the agent does not invent authority or endpoint behavior
- the agent reads generated/runtime truth before coding
- the agent chooses the correct source-authority or instance-authority workflow
- the agent keeps Typesense server-backed
- the agent does not report TypeSense refresh success when indexed counts are incomplete
- the agent surfaces assumptions instead of guessing through gaps

## Failure handling
- If the failure is abstract, update `docs/ai/**`, `.agents/skills/schema-*`, or the nearest schema `AGENTS.md`.
- If the failure is app-specific, update only the consumer app’s local docs or AGENTS files.
