Title: Schema Capability Testing Charter (Phase 1)
Owner: schema tooling
Status: active

Goal
Build a capability-driven test framework that validates core SurrealDB functionality
generated from MPDG specs. Phase 1 focuses on function-layer correctness (no TRPC
or controller tests yet). Tests must produce deterministic JSONL logs and always
clean up test data.

Scope (Phase 1)
- CRUD L1 (create/read/update/delete) against generated Surreal functions
- Taxonomy L1 (required + storeOnModel + alias)
- Relations L1 (exists + attach/list/detach, required behavior)
- Subtable L1 (single + many + composite IDs)
- Type correctness for key primitives: string/number/boolean/datetime/object/array/record

Out of scope (Phase 1)
- TRPC/controller layer tests (Phase 2)
- UI Test Lab (Phase 3)
- Typesense API integration (only mapper output shape checks later)

Success criteria (Phase 1)
1) User Step 1 circuit passes (base CRUD + types + view)
2) User Step 2 circuit passes (taxonomy Role required + storeOnModel + aliases)
3) User Step 3 circuit passes (subtables UserProfile + UserExamDate)
4) Question Step 1 circuit passes (CRUD + array/object type correctness + view)
5) JSONL reports + cleanup ledger are reliable and deterministic

Canonical stanzas (current Phase 1)
These live in `apps/schema/config/graph.mpdg` and should remain minimal.

User Step 1 (base)
User, u | A basic user table {
  id: $email,
  email!: "", <email>
  password!: "", <password> <assign>
  firstName!: "",
  surname!: "",
  uniqueId?: "", <md5<$email>> <assign>
  customerId: "",
} [
  crud,
  router,
  views: Admin[*],
  post,
  instance
] () {}

Question Step 1 (base types)
Question, q | A basic question table {
  id: $qid,
  qid!: 0,
  qCode: "",
  question!: "",
  explanation: "",
  explanationRef: "",
  source: "",
  instances!: [], <array<string>>
  testobject: {
    testobjectnumber!: 0,
    testobjectstring: "",
    testobjectdarray: [], <array<string>>
    testobjectobject: {
      testobjectobjectnumber!: 0,
      testobjectobjectstring: "",
      testobjectobjectarray: [], <array<string>>
    }
  }
} [
  crud,
  router,
  views: Admin::fn[*],
  instance,
  post
] () {}

Test strategy
- Use one round-trip scenario per model ("ModelCircuit") that exercises:
  create -> read -> update -> view -> delete, plus required relations/taxonomies/subtables.
- Derive payloads from specs (required fields only), not hardcoded.
- Log every external action (DB query, function call) to JSONL.
- Maintain a cleanup ledger of created records and delete them even on failure.

Reporting (JSONL)
Each line must include:
{
  time: ISO8601,
  runId: string,
  model: string,
  capability: string,
  step: string,
  input?: any,
  output?: any,
  assertions?: any,
  error?: string
}

Environment
- Use SCHEMA_TEST_INSTANCE to pick DB; fallback to default instance.
- Test data must be prefixed with SCHEMA_TEST_PREFIX and marker SCHEMA_TEST_MARKER.

Next actions
1) Audit current schema-docs tests and align to Phase 1 scope.
2) Implement function-layer ModelCircuit runner and helpers.
3) Run and stabilize User Step 1 tests until green.
4) Add User Step 2 (taxonomy) + Step 3 (subtables).
5) Add Question Step 1 type tests.

