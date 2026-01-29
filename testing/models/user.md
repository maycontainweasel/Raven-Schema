# User Model Tests

## Current Coverage
- CRUD L1 (TRPC + controller)
- Subtable: userProfile (L1)

## Required Fields
- email
- password
- firstName
- surname

## Known Nuances
- `role` is a record type; tests pass `role:student`.

## Cleanup
- Uses email prefix `schema-test-`.
