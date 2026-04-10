# Validation Checklist

Use this checklist when changing the schema operating model itself.

## Documentation

- The new rule or workflow is captured in a durable file in this repo.
- The change is not left only in chat context.
- If the change affects fresh-agent recovery, update `AGENTS.md` and/or `docs/AI-READ-HERE.md`.
- If the change affects skill selection, update `docs/ai/skills/README.md`.

## Skills

- If the workflow is repeated, decide whether it needs:
  - a new skill
  - a revised existing skill
  - a guardian wrapper
- If the workflow is safety-critical, specify:
  - default behavior
  - ask-first conditions
  - forbidden automatic actions

## Versioning

- If the change affects the shared framework, decide whether a new shared release is required.
- If the change affects tenant adoption, specify how the tenant learns that the release is required.
- If the change affects emitted assets, explicitly mark regeneration as required or not required.

## Tenant governance

- Engine work and app-owned work are still separated clearly.
- The promotion path from tenant to master is still explicit.
- The adoption path from master back to tenants is still explicit.

## Verification

- The workflow includes a "prove it worked" step.
- If a manual checklist keeps repeating, note it as a script candidate.
- If the flow touches auth, sessions, passwords, or MCP, define the exact validation surface.
