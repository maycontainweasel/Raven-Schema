# Lyric V2

This workstream tracks the deliberate redesign of the current schema system into a cleaner next-generation platform.

Use this workstream when the task is about:
- the future architecture beyond Schema v1
- the Lyric naming transition
- redesigning the authoring model, spec boundary, or generation pipeline
- separating deterministic generation from agent-assisted generation
- simplifying runtime contracts, plugins, and validation expectations

## Program stance

- The current platform remains **Schema v1**.
- The future platform is **Lyric v2**.
- Schema v1 continues to ship and support tenants.
- Lyric v2 is allowed to rethink the architecture without forcing immediate tenant migration.

## Primary goals

1. Make the system feel lighter, clearer, and more reliable to use.
2. Re-center the architecture around a stable spec layer.
3. Separate core schema concerns from plugins and integrations.
4. Keep deterministic generation as the primary engine.
5. Add an agent-assisted lane that extends the canon instead of bypassing it.
6. Use interactive documentation and capability tests to force architectural honesty.

## Canonical references

- `vision.md`
- `user-intent-summary.md`
- `capability-inventory.md`
- `decision-log.md`
- `validation-checklist.md`
- `../schema-operating-system/README.md`
- `../lyric-docs/README.md`

## Working rule

If a decision changes what the next-generation platform is supposed to be, record it here instead of leaving it in chat context.
