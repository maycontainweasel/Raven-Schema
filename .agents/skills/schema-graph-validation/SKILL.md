---
name: schema-graph-validation
description: Use after any config/graph.mpdg change. Run the graph validator first, interpret the issues by category, and only then proceed to regeneration or promotion.
---

# Schema Graph Validation

## Goal
Treat graph validation as the quality gate before regeneration, import, or framework promotion.

## Use when
- Any MPDG stanza or graph block changed.
- A generated Typesense/resource issue might actually be a graph mismatch.
- Preparing framework-safe schema commits for later promotion.

## Do not use when
- Nothing in `config/graph.mpdg` changed.

## Read first
1. `docs/ai/mpdg/validation-workflow.md`
2. `config/AGENTS.md`

## Workflow
1. Run `pnpm run graph:validate`.
2. Classify issues by category: audit, authority, views, Typesense, relations.
3. Fix graph-level issues before regeneration.
4. Use `pnpm run graph:validate:strict` when preparing framework work for promotion.

## Rules
- Regeneration is not validation.
- Do not ignore Typesense parity errors.
- If validation shows a repeated misunderstanding, update the nearest MPDG doc or skill in the same change.

## Definition of done
- The graph change was validated explicitly.
- Any remaining warnings are understood and acceptable for the task.
- Promotion-ready work uses the stricter path where appropriate.
