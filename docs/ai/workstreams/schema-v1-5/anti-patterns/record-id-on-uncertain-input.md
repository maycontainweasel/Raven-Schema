# Anti-Pattern: Calling `record::id(...)` On Uncertain Input

## Problem

Code calls `record::id(...)` before proving the value is actually a record.

This is fragile because:
- malformed id payloads can travel too far
- helpers start compensating for unclear contracts
- runtime failures become hard to diagnose
- a single bad value can break the whole request path

## Why it is bad

This pattern usually means the surrounding contract is unclear:
- the router is accepting the wrong shape
- the frontend is sending the wrong shape
- the helper is trying to do too much

## Safer rule

Use this discipline instead:

1. normalize the incoming value
2. prove whether it is a record
3. check existence or business rules separately

Example contract:
- `fn::ridParam(...)` normalizes only
- `type::is_record(...)` proves the normalized output shape
- `record::exists(...)` checks presence only when needed

## Impact

This anti-pattern applies to:
- bootstrap utility helpers
- generated Surreal functions
- router input handling
- frontend request construction

## Follow-up expectation

Any generated function that depends on ids should have tests for:
- helper normalization
- router input validation
- end-to-end request success/failure behavior
