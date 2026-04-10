---
name: schema-adopt-framework-release
description: Use when a tenant must adopt a shared schema framework release, including normalization, regeneration when required, verification, and release-marker updates.
---

# Schema Adopt Framework Release

## Goal
Carry a shared framework release all the way into a tenant, not just halfway.

## Use when
- A new shared release landed in master.
- A tenant needs the latest framework fix.
- A generator change requires downstream regeneration.

## Do not use when
- The task is only to inspect tenant state without mutating it.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/tenant-governance.md`
3. `docs/ai/versioning-model.md`
4. `docs/ai/framework-release-log.md`

## Default behavior
- Audit the tenant first.
- Normalize the tenant.
- Decide whether regeneration is required.
- Run regeneration when the shared release affects emitted assets.
- Run the relevant verification.
- Update the tenant release marker/reporting state.

## Ask first if
- The tenant working tree is dirty and the safe path is ambiguous.
- Adoption requires changing tenant-only output that may conflict with local work.
- The tenant uses a remote that should be migrated before adoption.

## Rules
- Do not stop at normalization if the release requires regeneration.
- Do not describe a tenant as fully updated if only `main` moved but emitted output did not.
- Keep engine work and app-owned output boundaries explicit.

## Definition of done
- Tenant `main` is aligned.
- Tenant `app` contains the intended shared release.
- Regeneration happened when required.
- Verification happened or the blocker is explicit.
- Release marker/reporting state is current.
