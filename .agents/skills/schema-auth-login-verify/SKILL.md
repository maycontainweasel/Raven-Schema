---
name: schema-auth-login-verify
description: Use when an auth change needs proof that a user can still log in using the intended schema auth path.
---

# Schema Auth Login Verify

## Goal
Prove that login still works after an auth-related change.

## Use when
- Password handling changed.
- Login controllers/services changed.
- Shared auth runtime code changed.

## Do not use when
- The task is only a static/doc change.

## Read first
1. `docs/ai/versioning-model.md`
2. `docs/ai/workstreams/schema-operating-system/validation-checklist.md`

## Default behavior
- Identify the exact login path being verified.
- Use the narrowest reproducible check that proves success.
- Report which user, environment, and auth path were tested.

## Ask first if
- Verification requires production credentials or live-user access.
- The intended login path is unclear.

## Validation
- Login succeeds with the expected user.
- The expected token/cookie/session artifacts are created.
- Any failure includes the exact stage that failed.

## Definition of done
- A real login path was exercised or explicitly blocked.
- Success/failure is concrete, not assumed.
