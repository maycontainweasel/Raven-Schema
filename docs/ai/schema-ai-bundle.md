# Schema AI Bundle

## Purpose
This document defines the schema-owned guidance bundle emitted into consumer apps through schema-kit sync.

## Canonical sources inside `apps/schema`
- `AGENTS.md` and other schema-scoped AGENTS files
- `docs/ai/**`
- `.agents/skills/schema-*/**`
- `module/ai-bundle/**`
- `module/docs/controllers/*.md`
- `module/src/resources/**`

## Current implementation
- Consumer-app bundle source lives in `module/ai-bundle/**`.
- `ensureSchemaKitModule()` syncs that bundle into target app roots.
- The sync writes a `schema-ai-bundle.json` marker plus `.schema-ai-bundle.hash`.

## Consumer-app bundle shape
The emitted bundle stays thin and routes to generated/runtime truth:
- root `AGENTS.md`
- local `AGENTS.md` files near common app work areas
- `.agents/skills/schema-*`
- `docs/ai/**`
- a bundle marker file such as `schema-ai-bundle.json`

## Bundle marker contract
The bundle marker identifies:
- bundle version
- bundle source name
- bundle hash
- generation timestamp

## Sync boundary
- Schema owns abstract contracts, workflow skills, and reusable runtime guidance.
- Consumer apps own local examples, UI conventions, and app-specific exceptions.
- If a fix belongs everywhere, change schema canon first.
- If a fix belongs to one app only, keep it local to that app.
