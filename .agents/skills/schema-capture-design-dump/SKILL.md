---
name: schema-capture-design-dump
description: Use when a schema debugging round reveals a problem, nuance, bad pattern, or design idea that should be captured quickly in the v1.5/v2 workstreams before it gets lost.
---

# Schema Capture Design Dump

## Goal
Capture an important schema lesson quickly and route it into the right long-term docs.

## Use when
- A debugging round reveals a reusable lesson.
- A tenant fix exposes a design weakness.
- An agent or generator used a bad pattern.
- A good idea should be recorded before the final architecture decision exists.

## Do not use when
- The change is already fully settled and belongs directly in final canon docs only.

## Read first
1. `docs/ai/workstreams/schema-v1-5/design-dumps/README.md`
2. `docs/ai/workstreams/schema-v1-5/anti-patterns/README.md`
3. `docs/ai/workstreams/lyric-v2/README.md`

## Default behavior
- Capture the lesson in a design-dump note first.
- If it is clearly a bad pattern, add or update an anti-pattern note too.
- State whether it belongs in Schema v1.5, Lyric v2, or both.
- Add a short follow-up note in the relevant workstream ledger if the lesson changes priorities.

## Ask first if
- The note would expose sensitive production data.
- The note implies a breaking runtime contract change that has not been agreed yet.

## Rules
- Keep the dump concrete.
- Name the bad pattern explicitly when one exists.
- Do not leave important debugging lessons only in chat.

## Definition of done
- The lesson is captured in the right workstream docs.
- Future agents can discover it without chat history.
- The note makes the next action clearer, not vaguer.
