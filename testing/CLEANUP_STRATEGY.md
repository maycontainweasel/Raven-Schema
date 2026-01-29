# Cleanup Strategy

Cleanup is mandatory. Delete tests come **first**, and every run begins by
cleaning prior artifacts.

## Principles
- All test data is tagged with a **prefix marker**.
- Cleanup queries are **safe** by matching the prefix.
- If tests fail mid‑run, the next run cleans up before starting.

## Current Markers
- Email: `schema-test-<token>@example.com`
- Exam key: `schema-test-<token>`
- Question text: `[schema-test] ...`

## Cleanup Queries (Surreal)
```
DELETE u WHERE string::startsWith(email, $prefix);
DELETE exam WHERE string::startsWith(key, $prefix);
DELETE q WHERE string::startsWith(question, $marker);
```

## Future
- Optional `testRun` table to track created records.
- Optional edges from `testRun` → records for 1‑query cleanup.
