# Capability Inventory

This inventory is the starting point for decomposing Schema v1 into atomic, testable capabilities that can harden v1 and define Lyric v2.

## Core authoring pipeline

1. Source authoring input
2. Validation of the authoring input
3. Compilation into canonical specs
4. Generation of migrations and runtime assets
5. Import/bootstrap into the target database
6. Runtime contract exposure to Nuxt apps

## Capability groups

### Model definition
- model identity and table naming
- scalar fields
- required/default handling
- field type changes
- enum-like constraints

### Record identity and references
- record id normalization
- record field assignment
- string vs object id boundaries
- instance-aware record targeting
- frontend request-shape policy for ids
- router input normalization rules
- minimal shared helper contracts

### Generated CRUD behavior
- create
- update
- delete
- get/list
- error branches

### Relations and edges
- single relations
- many relations
- create-time linking
- attach/detach/list helpers
- edge ownership semantics

### Taxonomies and terms
- taxonomy definition
- term management
- taxonomy assignment
- taxonomy filtering/query behavior

### Subtables and nested structures
- single child records
- many child records
- lifecycle and delete behavior

### Views and resources
- public/admin/resource views
- computed projections
- function-backed views
- resource contract exposure

### Runtime exposure
- generated request schema
- generated routers
- controller/composable expectations
- generated manifests and docs

### UI and management surfaces
- generated admin scaffolds
- field rendering
- directory and record patterns
- documentation/demo surfaces

### Plugins and layers
- search/indexing
- multi-instance behavior
- auth/session features
- MCP/export tooling

## Working rule

Every capability that remains important should eventually have:
- a canonical description
- a generated output expectation
- a runtime verification path
- a place in interactive documentation
