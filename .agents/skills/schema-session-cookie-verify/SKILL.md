---
name: schema-session-cookie-verify
description: Use when a schema auth or runtime change needs proof that session cookies and refresh behavior still work correctly.
---

# Schema Session Cookie Verify

## Goal
Prove that session-cookie behavior still matches the intended contract.

## Use when
- Cookie handling changed.
- Refresh/session runtime behavior changed.
- Login works but session persistence is uncertain.

## Do not use when
- The task does not touch auth/session/cookie behavior.

## Read first
1. `docs/ai/workstreams/schema-operating-system/validation-checklist.md`
2. `docs/ai/versioning-model.md`

## Default behavior
- Identify expected cookie names and refresh behavior first.
- Verify creation, persistence, and refresh explicitly.
- Report environment and route/path coverage used for verification.

## Ask first if
- Verification requires changing cookie-domain or cross-origin assumptions.
- The environment uses special proxy/nginx behavior that is not documented.

## Validation
- Session cookie is set.
- Session cookie is usable on the expected app path.
- Refresh behavior matches expectation after the chosen interval or trigger.

## Definition of done
- Cookie/session behavior is proven or the exact failure point is reported.
