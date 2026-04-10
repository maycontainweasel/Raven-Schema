---
name: schema-guardian-auth-flow
description: Use before changing auth, passwords, sessions, or login assumptions so the AI follows the schema auth defaults and asks before risky contract changes.
---

# Schema Guardian Auth Flow

## Goal
Protect shared auth behavior from casual or inconsistent changes.

## Use when
- A task touches passwords, hashing, login, auth cookies, refresh, or session behavior.
- A tenant discovered an auth-related generator/runtime bug.

## Do not use when
- The task is unrelated to auth or session behavior.

## Read first
1. `docs/ai/architecture.md`
2. `docs/ai/runtime/authority-routing.md`
3. `docs/ai/versioning-model.md`
4. `docs/ai/workstreams/schema-operating-system/implementation-plan.md`

## Default behavior
- Inspect existing auth assumptions first.
- Prefer shared fixes in generator/runtime source over tenant-only emitted output hacks.
- Verify password, login, and session flows after any shared auth change.

## Ask first if
- Changing cookie names or cookie-domain rules.
- Changing hashing algorithms or password storage conventions.
- Changing shared auth service behavior in ways that could affect multiple tenants.

## Rules
- Treat auth changes as `requires-manual-review` unless proven otherwise.
- Do not claim auth is fixed only because generation succeeded.
- Route to operational verification skills after the change.

## Definition of done
- Shared auth assumptions were identified before coding.
- Any risky contract changes were surfaced explicitly.
- Follow-up verification skills were selected or run.
