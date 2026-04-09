---
name: schema-anti-pattern-review
description: Use when reviewing schema generator, bootstrap, router, or runtime changes against known bad patterns so fragile code does not land unnoticed.
---

# Schema Anti-Pattern Review

## Goal
Check schema-side work against the known bad-pattern library before treating it as safe.

## Use when
- Reviewing generator changes.
- Reviewing helper-function changes.
- Reviewing router or request-shape work.
- Reviewing a tenant-discovered fix before promotion.

## Do not use when
- The task is purely descriptive and no code or contracts are being evaluated.

## Read first
1. `docs/ai/workstreams/schema-v1-5/anti-patterns/README.md`
2. The relevant anti-pattern note(s) in `docs/ai/workstreams/schema-v1-5/anti-patterns/`
3. `docs/ai/runtime/authority-routing.md`

## Default behavior
- Identify which known anti-patterns are relevant.
- Check the changed code or generated output against them.
- Report findings before summaries.
- If a new anti-pattern is discovered, route to `schema-capture-design-dump`.

## Ask first if
- Avoiding the anti-pattern would require a major breaking contract change.

## Rules
- Prefer concrete findings over broad style commentary.
- If the code is acceptable, state why it avoids the anti-pattern.
- If the anti-pattern is present, say where and what safer contract should replace it.

## Definition of done
- The review is anchored to explicit anti-patterns.
- Any serious bad pattern is documented with file references.
- New anti-patterns are captured instead of disappearing.
