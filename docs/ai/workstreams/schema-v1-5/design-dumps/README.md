# Design Dumps

Design dumps are structured captures of:
- problems
- nuances
- bad patterns
- design ideas
- lessons learned in tenant repos or debugging rounds

They are intentionally quick to write.

The rule is:
- capture first
- consolidate into vision/architecture later

## Purpose

Use a design dump when something important is discovered but the final architecture decision is not ready yet.

Good candidates:
- a helper function doing too much
- a route/request contract agents keep getting wrong
- a generator output pattern that feels fragile
- a debugging lesson that should shape future design

## Working rule

Each dump should answer:
- what happened
- why it is bad or risky
- what contract should exist instead
- whether the lesson belongs in v1.5, v2, or both
