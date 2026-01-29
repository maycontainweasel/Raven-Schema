# Question Model Tests

## Current Coverage
- CRUD L1 (TRPC + controller)
- Relations: exam attach/list/detach (L1)
- Taxonomy: qtag (L1)
- Subtable: questionOption (L1)

## Required Fields
- qid
- question
- relations: `exams` (required)

## Known Nuances
- Create requires exams relation.
- Questions use marker `[schema-test]` in question text for cleanup.

## Cleanup
- Uses question text prefix `[schema-test]`.
