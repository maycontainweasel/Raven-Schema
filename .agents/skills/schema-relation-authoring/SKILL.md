---
name: schema-relation-authoring
description: Use when adding or changing MPDG relations:. Resolve left/right models, payload field, cardinality, and generated relation behaviour before editing, then validate the graph.
---

# Schema Relation Authoring

## Goal
Add or change record-backed relation contracts intentionally, with clear payload and generated edge behaviour.

## Use when
- Editing `relations:` in a stanza.
- Adding shared relation behaviour used by CRUD/runtime generation.

## Do not use when
- The task is a plain subtable or page-only linkage.

## Read first
1. `docs/ai/mpdg/relations-taxonomies-subtables.md`
2. `config/AGENTS.md`

## Required decisions before editing
- left model
- edge table
- right model
- cardinality
- payload field
- store-on-model
- link-on-create
- hook/processor

## Rules
- Do not leave relation targets ambiguous.
- Do not reuse payload fields casually across multiple relations.
- Treat relations as shared model contracts, not page-only conveniences.
- Validate that referenced models resolve.

## Definition of done
- Relation targets and payload behaviour were stated explicitly.
- Validation does not report missing relation models or malformed relation output.
