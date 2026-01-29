# Test Levels

We evolve tests in stages. Each test file should say which level it covers.

## L1 — Smoke
- Does the function exist?
- Can we create a record with required fields?
- Can we delete and clean up?

## L2 — Behavior
- Required fields rejected when missing.
- Basic invalid input tests.
- Basic list/attach/detach flows.

## L3 — Strict
- Data type normalization (record IDs, arrays, enums).
- Edge cases (duplicates, empty payloads, invalid IDs).
- Data consistency across relations.

## L4 — Integration (future)
- Cross‑app/instance flows.
- Sync pipelines.
- Typesense search correctness.
