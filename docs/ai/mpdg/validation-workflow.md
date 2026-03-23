# Validation Workflow

## Purpose
Validation is the gate between “the stanza looks plausible” and “the graph change is safe to regenerate”.

## Commands
- `pnpm run graph:validate`
- `pnpm run graph:validate:strict`
- `pnpm run graph:spec`
- `pnpm run graph:mermaid`

## Standard workflow
1. Edit `config/graph.mpdg`.
2. Run `pnpm run graph:validate`.
3. Fix graph-level issues first.
4. Run `pnpm run graph:spec` when the validation state is acceptable.
5. Run `pnpm run graph:mermaid` when the relationship diagram matters for the task.
6. Continue to full generation/import only after the graph layer is coherent.

## What validation checks first
- parser/audit issues
- duplicate or ambiguous generated view names
- missing explicit authority in instance-enabled apps
- Typesense schema/document mismatches
- relation targets that do not resolve to known models

## Strict mode
Use `graph:validate:strict` when:
- preparing framework changes for promotion
- tightening the DSL canon
- trying to eliminate warnings rather than merely avoiding runtime breakage

## AI interpretation
The agent should not treat regeneration as validation. Validation happens before regeneration.
