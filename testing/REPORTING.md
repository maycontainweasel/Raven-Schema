# Reporting

Every test run produces a **JSONL report** with step‑by‑step context.

Report path:
- `schema-docs/test/capabilities/reports/run-<timestamp>.jsonl`

Each line contains:
```
{ "time": "...", "message": "...", "data": { ... } }
```

This log is AI‑ready: you can paste it into another AI to diagnose failures.

## Required Minimum Logs
- Payload sent to create
- Required relation resolution
- Cleanup actions

## Extending
- Add `logStep()` around attach/detach, update, delete
- Add payload dumps for failed steps
