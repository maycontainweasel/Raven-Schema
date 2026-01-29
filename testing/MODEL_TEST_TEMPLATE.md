# Model Test Template

Use this file as a checklist for each model’s capability tests.

## Model
- Model key: `user`
- Table: `u`
- Data location: `remote | local`

## Capabilities
- CRUD: L1/L2/L3
- Relations: L1/L2/L3
- Taxonomies: L1/L2/L3
- Subtables: L1/L2/L3
- Resources: L1/L2/L3
- Typesense: L1/L2/L3

## Required Fields
- Required fields list:
  - `email` (string)
  - `password` (string)
  - ...

## Required Relations
- Relation payload fields required:
  - `exams`

## Smoke Recipe (L1)
1) Check functions exist
2) Create with required payload
3) Read/resource
4) Update
5) Delete

## Cleanup
- Query patterns used for cleanup:
  - `email startsWith schema-test-`

## Known Nuances
- Note special defaults or record types here
