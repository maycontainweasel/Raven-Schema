# Decision Log

## 2026-04-08

### Program established

- The next-generation redesign is now tracked as `lyric-v2`.
- The current shipping platform is explicitly treated as `Schema v1`.

### Naming direction

- `Lyric` is the intended v2 name.
- Existing `schema-*` release ids, tenant markers, and technical identifiers remain stable for now.

### Workspace strategy

- Lyric v2 should live in a parallel workspace rather than evolving `apps/schema` in place.

### Documentation strategy

- The first major project is a new sibling interactive documentation app rather than reusing the current `schema-docs` app as the final surface.
- The current `schema-docs` app remains a reference and proving ground input for the new documentation experience.

### Architecture direction

- The spec layer is the canonical internal contract for v2.
- Deterministic generation remains the primary engine.
- Agent-assisted generation is additive, not a replacement.
