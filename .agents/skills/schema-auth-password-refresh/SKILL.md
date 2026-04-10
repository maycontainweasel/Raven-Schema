---
name: schema-auth-password-refresh
description: Use when password hashes or password-storage behavior must be refreshed, migrated, or verified after a schema auth change.
---

# Schema Auth Password Refresh

## Goal
Handle password refresh or password-hash migration safely and explicitly.

## Use when
- Updating hashing algorithms.
- Rehashing existing passwords.
- Fixing generated user create/update behavior for password storage.

## Do not use when
- The task is only to verify login/session behavior without touching hashes or password writes.

## Read first
1. `docs/ai/versioning-model.md`
2. `AGENTS.md`
3. `docs/ai/workstreams/schema-operating-system/implementation-plan.md`

## Default behavior
- Identify whether the change is generator/runtime source or tenant-only data migration.
- Verify how passwords are currently written.
- Mark whether tenant regeneration is required.

## Ask first if
- Passwords must be rewritten in-place for real users.
- The change requires live database mutation.
- The hashing contract changes for all tenants.

## Validation
- Confirm new password writes use the expected hashing path.
- Confirm existing users can still authenticate after refresh or migration.

## Definition of done
- Hashing path is explicit.
- Regeneration/data-migration impact is explicit.
- Login verification is queued or completed.
