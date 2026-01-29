# Capability Charter

This document defines **what a capability is** and what we must test for each capability.
Capabilities map directly to graph features (e.g. `crud`, `relations`, `taxonomies`, `subtables`, `resources`).

## Capability Levels
Each capability has test levels:
- **L1 (Smoke)**: does it do the thing at all?
- **L2 (Behavior)**: correct inputs, basic validation, basic edge cases
- **L3 (Strict)**: data type correctness, negative cases, invariants

## Capabilities & Test Intent

### 1) CRUD
**L1**
- Create succeeds with required payload.
- Read/resource returns record.
- Update persists changes.
- Delete removes record.

**L2**
- Create fails when required fields missing.
- Update fails on invalid ID.
- Delete idempotency (delete twice).

**L3**
- Record types normalize to full record IDs.
- Input coercion (string/record id) is stable.

### 2) Relations
**L1**
- Attach relation between two records.
- List returns the relation.
- Detach removes relation.

**L2**
- Attach fails on missing target.
- Duplicate attach is idempotent.

**L3**
- Relation payload fields match schema expectations.

### 3) Taxonomies
**L1**
- Create taxonomy.
- Add term.
- Attach term to record.
- Detach term.
- Remove term.

**L2**
- Hierarchical parent creation.
- Term validation (missing label/key).

**L3**
- Term lookup by id/key/permalink.

### 4) Subtables (single/many)
**L1**
- Create subtable record.
- Get/subtable list works.
- Delete subtable record.

**L2**
- Update subtable record.
- AutoCreate subtables are present.

**L3**
- Parent integrity, edge constraints.

### 5) Resources / Views
**L1**
- Resource view returns a record.

**L2**
- Unsupported resource key errors clearly.

### 6) Typesense
**L1**
- Collection schema accessible.

**L2**
- Record refresh works.

**L3**
- Search correctness (future).

## Naming Convention
We call these **capabilities**. Each test should be tagged like:
- `cap:crud`
- `cap:relations`
- `cap:taxonomies`
- `cap:subtables`

These tags map to generator logic later.
