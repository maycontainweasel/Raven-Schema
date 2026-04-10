---
name: schema-guardian-tenant-fix
description: Use when a tenant discovers a possible framework bug and the AI must default to the safe path before promoting anything into the master schema repo.
---

# Schema Guardian Tenant Fix

## Goal
Force the safe default path for tenant-discovered schema fixes.

## Use when
- A tenant repo found a bug in generator/runtime behavior.
- A tenant AI wants to change schema engine behavior.
- It is unclear whether the change is engine work or app-owned output.

## Do not use when
- The work is already confirmed as master-only shared framework work.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/tenant-governance.md`
3. `docs/ai/versioning-model.md`
4. `docs/ai/framework-promotion-playbook.md`
5. `docs/ai/workstreams/schema-operating-system/README.md`

## Default behavior
- Reproduce and fix the bug in the tenant where it was discovered.
- Verify the real behavior there first.
- Classify changed paths before promoting anything.
- Treat app-owned output as tenant-owned by default.
- Promote only reusable framework-safe source into master.
- Mark whether downstream regeneration is required.

## Ask first if
- The fix changes shared auth/session contracts.
- The fix requires promoting files from app-owned paths.
- The fix changes naming, versioning, or operating-model assumptions.

## Rules
- Do not jump straight from a tenant bug to a master push.
- Do not declare the bug fixed for the ecosystem until the master release and tenant adoption are complete.
- Treat generator fixes as requiring downstream regeneration unless proven otherwise.

## Definition of done
- Engine work and app-owned work were classified.
- The promotion path is explicit.
- Regeneration impact is explicit.
- The next step is either tenant-only or master-promotion, not ambiguous.
