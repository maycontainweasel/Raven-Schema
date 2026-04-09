# Validation Checklist

## Contract clarity

- Shared helper functions have a narrow, explicit responsibility.
- Record-id and request-shape rules are documented clearly enough for agents.

## Capture and reuse

- Important debugging lessons are captured as design dumps.
- Recurring bad patterns are recorded as anti-patterns.

## Verification

- Router-flow changes are validated beyond raw Surreal function behavior.
- Important generated flows have tests or a clear test plan at helper, router, and end-to-end layers.
