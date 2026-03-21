# MPDG Table DSL (profile v1)  

Goal: author tables quickly in one collapsible stanza that later expands into full Surreal schema specs (`*.primary.yaml`, `*.st.yaml`, `*.st.many.yaml`, legacy `*.table.yaml`), views, CRUD, routers, edges, and subtables.

Top‑level shape (per table)
```
Label, model {
  /* fields block (defaults + hints) */
} [
  /* capabilities block */
] (
  /* connections block: subtables + edges */
) {
  /* extras / overrides (optional) */
}
```

Block 1 — Fields `{ … }`
- Each entry: `name!?: defaultValue [: type] tags…`
  - `!` required.
  - `?` **computed/ignore payload** — field is stripped from incoming payload and created server‑side.
  - Omit suffix for normal optional fields.
- Default infers type: `""`→string, `0`→number, `false`→boolean, `{}`→object, `[]`→array. Append `: type` to override (e.g., `role!: "" : record<role>`).
- **Raw defaults:** wrap multi‑line Surreal expressions in `{ ... }` (inside YAML `|-`). The contents are emitted raw (no quotes), while `$field` references still rewrite to `$payload.field`.
  - Tags (order‑free) after the value: `index`, `unique`, `fulltext(analyzer=*,bm25=*,highlights)`, `count`, `comment("...")`.
  - `<assign>` marks the field as a computed assignment after payload merge. It does **not** imply required.
    - For `record<model>` fields:
      - If `assign` is **true** and a default exists, defaults use `""` (empty) and the assign step uses:
        `type::record("model", if ($payload.field) { $payload.field } else { <default> })`.
      - If `assign` is **false** and a non‑empty default exists, defaults use:
        `type::record("model", <default>)`.
      - If the default is empty (`""` / `null`), defaults stay empty (no `type::record("model","")`).
- Special field `id:` (still lives in the fields block):
  - `id: $field` → PK source field (`id.source = field`).
  - `id: default` → Surreal default id.
  - `id: $parent` → parent/structure PK.
  - `id: S($parent, $exam)` → composite string id (emits `id.source: stringID<parent, exam>`; create uses `fn::stringID([...])`).
  - `id: {template `*AId.id-*BId.id`}` → templated PK.
  - Optional `as Type` to force TS type.
  - Export name defaults to `<Label>Id` (Pascal label + “Id”) unless `idName:` tag is later added.

Block 2 — Capabilities `[ … ]`
- Keywords (unordered):
  - `crud` or `crud(CUD)` (subset of C/U/D).
  - `crud<slug>` shorthand sets admin slug policy (e.g. `crud<key>`).
  - `crud { ... }` inline CRUD options (deep‑merged into the generated `crud` block).
  - `router(parent=foo,name=bar,embed=true?)`
  - `router<CUD>` shorthand for standard CRUD endpoints (`C`=create, `U`=update, `D`=delete, `V`=views)
    - `router` alone implies the CRUD endpoints defined by `crud(...)` (defaults to `CUD`).
  - `views: admin, public, typesense` (authoring keyword “views”; generator maps to views in specs).
  - `typesense:` (dedicated Typesense resource + schema; see below).
  - `taxonomies:` (inline taxonomy definitions; see below).
  - `relations:` (record‑to‑record relationships; see below).
  - Flags: `instance`, `post`, `refreshViews`, `events`, `indexes`.
- Defaults: `crud` → enable create/update/delete with standard params; no implicit views.
  - `refreshViews` defaults to **on** for all tables; use `refreshViews: false` to disable.
  - `mods:` is deprecated; use `instance` / `post` / `refreshViews` directly.

Block 3 — Connections `( … )`
- Subtables: same header + `{fields}` syntax. Being inside `()` marks it as a subtable (inherits parent PK unless overridden).
  ```
  UserProfile, uProfile {
    id: $parent
    country?: ""
  }
  ```
- Prefix the subtable label with `*` to mark a has‑many subtable:
  ```
  *UserExamDate, uExamDate { ... }
  ```
  This emits `tableType: submany` on the child table spec (and `subsingle` otherwise).
- Edges:
  - Outgoing: `->EdgeName->targetModel { options }`
  - Incoming: `<-sourceModel<-EdgeName { options }`
  - `options` allow: `table`, `unique`, `in`, `out`, `comment`.
- Comments: `// comment` on its own line above any connection.

Block 4 — Extras `{ … }` (optional)
- Raw overrides or advanced tweaks not expressible in the three primary blocks (e.g., custom events, delete‑cascade rules, router endpoint overrides).

Defaults & conventions
- Exported ID name: `<Label>Id` unless overridden.

Example (CRUD options):
```
Exam(exam) [crud<key> { delete: { options: { allowMissing: false } } }, router] {
  title: string
}
```
- `tableType` in specs: `primary` for top-level tables, `subsingle` for subtables, `submany` for `*` subtables.
- Edge uniqueness: default unique; edge table name defaults to `rel_<in>_<out>` unless set in options.
- Subtables: default `autoCreate: true` if nested unless tagged otherwise.
- Router: `router` with no params uses the table label in camelCase for `router.name` (falls back to model if missing); if inside a subtable and `parent` missing, parent table’s router name is used.
- Views: keyword maps to view generation; canned presets can be expanded later.
- `instance<remote>` sets admin data source to remote (legacy shorthand; prefer explicit model settings authority).
- When `instance` is enabled and no `instances` is provided, the generator defaults to `fn::defaultInstance({ returnArray: true })`.

Local vs remote data (instance flag)
------------------------------------
The older `instance<local|remote>` capability controls **where writes happen** when using the generated admin UI and the `useCRUD` composable.
The preferred modern form is an explicit model settings block after the fields block:

```mpdg
Exam, exam | Primary exam entity {
  key!: ""
} & {
  authority: "source"
} [
  crud<key>
  router
  instance
]
```

Canonical authority values:
- `source`
- `tenant`

Legacy aliases still normalize:
- `local` -> `source`
- `remote` -> `tenant`

**Local (default)**
- Source of truth is the **mothership** (root instance, usually `pm`).
- `useCRUD` will:
  1) **Attempt the mutation on the mothership first**.
  2) If it succeeds, it will **then apply the same mutation** to the target instance(s).
  3) If it fails on mothership, it **does not** proceed to remote instances.
- Retries happen **only on the mothership attempt**. Remote attempts only happen after success.

**Remote**
- Source of truth is the **target instance(s)** only.
- `useCRUD` will **skip mothership**, and apply the mutation directly to the provided instances.
- If no instances are provided for a remote model, the call errors.

**Where the value comes from**
- The generator writes this to the **models manifest** (`@schema/models`).
- `useCRUD` / `useApiProcess` read the manifest to determine whether a model is `source` or `tenant`.
- If the app has `instance.active: false`, the runtime treats the app as single-database and uses `defaultDbInstance`.

**Instances used**
- The instances list comes from:
  - explicit `useCRUD(..., { instances })` options, **or**
  - the record’s `instances` field for single‑record pages.

This is why local/remote is critical: it decides whether the mothership is required first, and whether remote updates should occur at all.

Admin manifest (models)
-----------------------
The generator emits a models manifest per app (for admin UI routing/data policy):
```
export const models = {
  exam: { table: "exam", data: "local", slugPolicy: "key" },
  user: { table: "u", data: "remote" }
}
```
Source mapping:
- `crud<slug>` → `slugPolicy`
- `& { authority: "source" | "tenant" }` → `authority`
- `instance<remote|local>` still maps through legacy normalization

Tags cheat‑sheet (fields)
- `index` → DEFINE INDEX (non‑unique).
- `unique` → UNIQUE index.
- `fulltext(analyzer=*,bm25=*,highlights)` → FULLTEXT options.
- `count` → COUNT index.
- `comment("text")` → attaches index comment.

Example (concise)
```
User, u {
  id: $email
  email!: "", <email> unique
  firstName!: ""
  surname!: ""
  password!: "", <password {hash: argon2}>
  role: student, <record<role>> <assign>
}[
  crud<key>
  router
  instance<local>
  post
  views: admin, public, typesense
](
  // subtables
  UserSettings, uSettings { id: $parent }
  UserProfile, uProfile  { id: $parent }
  // edges
  ->UserSettings->uSettings {}
  <-uProfile<-UserProfile {}
){
  // extras go here
}
```

Expansion targets (what the generator will write)
- `config/specs/<PrimaryLabel>/*.(primary|st|st.many).yaml` with: name/description/tags, table config, id/structure, fields, edges, subTables, crud, views, router, indexes, events/post, delete cascade flags.
- `config/graph.ts` & `config/graph.mmd` still generated via `pnpm run graph` for visualization (Mermaid).

Editing aids (planned)
- VS Code snippets for `*.mpdg` to drop the 4-block skeleton with tabstops.
- Grammar updates in `extension/mpd-graph-dsl` to highlight `{fields}[caps](connections){extras}` and common tags.

Workflow (staging → live)
- Treat `config/graph.mpdg` as the sketchpad.
- Generate specs to staging (non-destructive):  
  `pnpm run schema:spec:mpdg` (writes to `config/specs_stage`, skips existing files unless `--force` or `--only-new`).
- Promote/overwrite live specs when ready:  
  `pnpm run schema:spec:mpdg:live` (outputs to `config/specs`, forces overwrite).
- Flags (via `scripts/mpdg-to-spec.ts`):  
  - `--mode staging|live` (default staging; changes default out dir)  
  - `--out <dir>` (override)  
  - `--force` / `--overwrite` (replace existing files)  
  - `--only-new` (write only when file does not exist)  
  - `--input <file>` (alternate mpdg source)
- Keep manual edits safe: run staging first, review diffs, then overwrite live intentionally.
- Output layout: specs are grouped into a folder named after the primary table label + model (PascalCase + `(model)`), with one file per model (e.g., `config/specs_stage/User(u)/u.primary.yaml`, `config/specs_stage/User(u)/uSettings.st.yaml`).

Snippets (VS Code)
- `mpdg` → full four-block skeleton.  
- `mpdg-lite` → minimal table (id + one field + CRUD).  
- `mpdg-edge` → `->Edge->target {}`.  
- `mpdg-sub` → subtable stub with parent id.

Tag reference
- See `docs/mpdg-tag-glossary.md` for the current “type program” tags and options.

Views syntax (rich)
- You can define views inline in the caps block:
  ```
  [
    crud
    router
    views:
      Admin[*](as: ""),
      Public![](post: select * from only type::record("p", $this.id), as: ""),
      Typesense[](as: "")
    mods: instance, post, refreshViews
  ]
  ```
- Function-backed views (no generated V_ view; router calls the function):
  ```
  [
    views:
      Typesense::initUserResourceTypesense,
      Typesense::initUserResourceTypesense(<ID>),
      Admin[*]
  ]
  ```
  - `Name::FunctionName(<ID>)` maps to `views: [{ name: Name, function: FunctionName }]` in the spec.
  - `<ID>` (or `ID`) is a placeholder for the current record id; the router always passes `$rid`.
  - Omitting params (`Name::FunctionName`) is equivalent to `Name::FunctionName(<ID>)`.
- Generated view function (builds a function from the projection instead of a V_ view table):
  ```
  [
    views:
      Typesense::fn[id, title, instances](
        post: PID|p(ID), [status, createdAt, updatedAt], {}
      )
  ]
  ```
  - `Name::fn[...]` generates `fn::view<Table><Name>()` in `F_view<Table><Name>.surql`.
  - Router calls that function; no `V_` view table is emitted.
- Parsing rules:
  - Name is the first token (`Admin`, `Public`, `Typesense`).
  - `[]` is the include list:
    - `[*]` → include all fields.
    - `[]` with entries → include only those fields.
    - `![]` → exclude the listed fields (if none listed, it still resolves to all).
    - `[]` empty without `!` also resolves to all; `id` is always included.
    - If no `[]` is provided, the view defaults to `id` only.
  - `( … )` holds key/value pairs that become `as` entries; the text after `:` is used verbatim.
    - Example: `post: select * from only type::record("p", $this.id)` becomes `as: [ "post: select * from only type::record(\"p\", $this.id)" ]`.
  - `post` is always explicit: no auto-injection of `post:` entries.
  - Lines beginning with `#` or `//` inside a view block are ignored (commented out).

Typesense capability (dedicated)
-------------------------------
Use a dedicated `typesense:` block in the caps section to define the Typesense resource **and** schema from one source of truth.

Example:
```
[
  typesense:
    question::fn[id, qid, question, instances](
      id: <RID>
      post: PID|p(ID), [status, createdAt, updatedAt], {}
      exams: (select value ->ProductExams.out from only $this.id) <facet>
    ) {
      collection: question
      defaultSortingField: qid
      queryBy: ["question", "explanation", "optionsString"]
      queryByWeights: [6, 1, 1]
    }
]
```

Rules:
- `Name::fn[...]` generates `fn::view<Table><Name>` and **does not** emit a `V_` view table.
- `Name[...]` emits a `V_<Table><Name>` view table (no function).
- If `Name` is omitted or `Typesense`, the collection name defaults to the table label in lowercase.
- Custom collection names are normalized to lowercase.
- Collection names must be at least 3 chars; shorter names are skipped with a warning.
- Fields in the `[]` list are also used to build the Typesense schema.
- Lines in `( ... )` become view `as:` entries; tags on these lines are used for Typesense schema metadata.
- `{ ... }` is a settings block, but it is **split** between Typesense schema settings and generator metadata:
  - schema-side: `collection`, `fields`, `sortableFields`, `defaultSortingField`, `nestedFields`, `symbolsToIndex`, `tokenSeparators`
  - meta-side: `queryBy`, `queryByWeights`, `filters`, and any unrecognized keys
- Lines inside `( ... )` are **always treated as part of the as‑block**, even if they start with
  capability keywords like `post:` or `instance:`. This allows program lines such as
  `post: PID, [status, createdAt, updatedAt], <{...}>` inside Typesense/view blocks.
- The graph block defines the **document shape** and generated collection schema. It does **not**
  automatically invent relationship payloads. If you declare `categories`, `tags`, `topics`, or
  `exams` as `object[]` fields, the generated or overridden `view...Typesense` function must return
  objects that match that declared shape.

Generated TRPC endpoints
- When `typesense` is present, a nested router is emitted:
  - `api.<table>.typesense.resource`
  - `api.<table>.typesense.list`
  - `api.<table>.typesense.count`
  - `api.<table>.typesense.refresh`
  - `api.<table>.typesense.collection`

Typesense tags (initial):
- `<facet>` → `facet: true` on the Typesense field.
- `<RID>` → force id to string (view uses `record::id($this.id)`).
  - `mode` and `type` are implied and omitted in the generated spec.
- `?` suffix → **computed/ignore payload** (stripped from payload; created server‑side).
- `<object { ... }>` → `type: object` with nested `fields` in the Typesense schema.
- `<array<object { ... }>>` or `<array<{ ... }>>` or `{ ... }[]` → `type: object[]` with nested `fields`.
  - Field names inside `{ ... }` are preserved as-is (no auto‑lowercasing).
- Multiline `<{ ... }>` tags are supported (they are collapsed into a single tag block).
- `<infix>` / `<infix: always|fallback|off>` → stored in `collectionsMeta` for query defaults.
- `<sort>` / `<sort: asc|desc>` → stored in `collectionsMeta` for query defaults.
  - This is **not** the same thing as making a field sortable in the Typesense collection.
  - Collection sortability comes from `sortableFields: [...]` in the settings block.
- `<highlight>` / `<highlight: full|snippet>` → stored in `collectionsMeta` for query defaults.
- Legacy short form still works: `views: admin, public` (defaults to id‑only; no implicit `post` injection).

Typesense settings (block)
- Shorthand keys are normalized:
  - `defaultSortingField` → `default_sorting_field`
  - `enableNestedFields` → `enable_nested_fields`
  - `enableSynonyms` → `enable_synonyms`
  - `enableSearchAsYouType` → `enable_search_as_you_type`
  - `enablePerDocumentSynonyms` → `enable_per_document_synonyms`
  - `enablePerDocumentSearchAsYouType` → `enable_per_document_search_as_you_type`
- `default_sorting_field: id` is **removed** (Typesense disallows it).
- `queryBy` / `queryByWeights` are validated and stored in `collectionsMeta`:
  - `queryBy` must be an array of strings
  - `queryByWeights` must be an array of numbers
  - mismatches throw during graph → spec generation
- `filters` is stored in `collectionsMeta` and is also used by the Typesense bundle generator to mark
  matching schema fields as `facet: true`.
- `sortableFields` must list actual schema field names. The bundle generator applies `sort: true`
  to those fields in the emitted collection schema.
- If you need a fully custom collection schema, `fields: [...]` in the settings block overrides the
  schema field inference from the view.

Question Typesense pattern
--------------------------
For relationship-heavy models like `Question`, use two layers:

1. Graph DSL defines the durable collection contract:
   - searchable strings like `question`, `explanation`, `optionsString`
   - facetable string arrays like `examTitles`, `categoryLabels`, `tagLabels`, `topicLabels`
   - optional nested `object[]` fields for richer payloads such as `exams`, `categories`, `tags`, `topics`

2. `fn::viewQuestionTypesense(...)` returns the actual values for those fields:
   - joins option labels into `optionsString`
   - resolves `ExamQuestions`
   - resolves taxonomy edges into both nested objects and flat facet arrays

This separation is intentional:
- the graph controls what the collection should look like after regeneration
- the SURQL function controls how to compute the document from live relational data

Relations capability (record-to-record)
--------------------------------------
Use `relations:` to define record-backed relationships (like taxonomies, but terms are *existing records*).

Example:
```
[
  relations:
    exam -> ExamQuestions -> q {
      cardinality: many
      storeOnModel: false
      payloadField: exams
      processor: functions
      required: false
    }
]
```

Rules:
- Syntax: `leftModel -> EdgeTable -> rightModel`
- `leftModel` is treated as the owner (edge IN); `rightModel` is the child (edge OUT).
- Relations can be declared on either table. If the same relation is defined on multiple tables,
  each definition is treated as **side-specific** (settings apply to the declaring table).
  Edge tables and attach/detach helpers are still generated once per `edge + left + right`.

Options (defaults in parentheses):
- `cardinality`: `one` | `many` (many)
- `storeOnModel`: boolean (true)
- `payloadField`: string (defaults to left model, pluralized if `many`)
- `linkOnCreate`: boolean (true)
- `required`: boolean (false)
- `processor`: `functions` | `events` | `none` (functions)
- `hook`: `left` | `right` | model name (defaults to the table where the relation is declared)
- `functions`: boolean or object of function name overrides
  - `functions: false` skips generation of `attach*/detach*/get*` relation helper functions.
  - CRUD relation processing still works and uses direct `fn::createEdge(...)` / edge deletes.

Generated helpers (default names):
- `attach<Right><Left>()` / `detach<Right><Left>()`
- `get<Right><Left>s()` / `get<Left><Right>s()`

Attach/detach inputs:
- `attach*` / `detach*` accept a single record, a string ID, or an array of either.
- Inputs are normalized via `fn::toRecordArray(model, values)` before relating.

If `processor: functions`, CRUD functions on the hook model will:
- create: attach all provided IDs when `linkOnCreate` is `true`
- update: delete existing edges, then reattach (if payload provided)
- delete: remove all edges for the record

Edge helper utilities
---------------------
Generated relation helpers now rely on the dynamic edge utilities:
- `fn::createEdge(in, edgeTable, out, options)`
- `fn::updateEdge(in, edgeTable, out, payload, options)`
- `fn::deleteEdge(in, edgeTable, out, options)`

These helpers:
- Use `INSERT RELATION` for relation tables (required by SurrealDB).
- Support dynamic edge table names via `type::table($edgeTable)`.
- Support bound IDs (`fn::stringID([in, out])`) for fast lookup.
- Accept optional payload data for edge properties (`options.data`).

Recommended defaults:
- `boundId: true` for deterministic edge IDs.
- `overwrite: false` for create (use `true` when you want to replace).
- `createOnMissing: true` for update when you want “upsert‑like” behavior.
- `from: "in"` for `fn::clearEdgesForRecord` (omit the options object when using the default).

Notes:
- If `storeOnModel: false`, the payload field is treated as transient:
  - removed before insert/update,
  - excluded from generated Zod table schema,
  - not included in create/update inputs (use attach/detach helpers instead).
- Relations are side‑specific: declare different settings on each table if needed (e.g., one side stores ids, the other doesn’t).

ID structure expressions
- `id.structure` can be a literal field name (e.g. `qid`) or an explicit expression.
- If the structure contains `$`, it is treated as an expression and `$field` expands to `$payload.field`.
- Example:
  - `structure: fn::stringID([record::tb($id), record::id($id)])`
  - Generates: `type::record('p', fn::stringID([record::tb($payload.id), record::id($payload.id)]))`

Views syntax (programs, draft)
- You can add a program list in the view parentheses to build complex projections. Each line is:
  `alias: PROGRAM<model>, [fields], {options}`
- For now, keep one entry per line (commas inside the line are the program arguments).

View expression helpers
- In `as:` expressions, `$field` expands to `$this.field` when used inside a larger expression.
  - Example: `instances: $instances || []` → `($this.instances || []) AS instances`
- If the expression is **only** `$field`, it becomes a plain field projection:
  - `instances: $instances` → `instances`
- You can use `||` to supply defaults for missing values (e.g. empty arrays or objects).
- `PID` helper (post ids):
  - `post: PID, [status, createdAt, updatedAt], {}` →
    `(select status, createdAt, updatedAt from only fn::PID($this.id)) AS post`
  - `PID|p(ID)` still works for custom record-id construction.
- First program implemented: `ST<model>` (subtable single).
  - Uses the parent record id to select the subtable record.
  - Example:
    ```
    views:
      Test[id, title, role<fetch>](
        profile: ST<uProfile>, [*], {}
      )
    ```
  - Emits a view projection like:
    - `profile: (select * from only type::record('uProfile', $this.id))`
- Field selectors inside the program:
  - `[*]` -> select all
  - `[id, city]` -> select only these
  - `![country,city]` -> select all except these
  - Optional `([as pairs])` after the `[]` to inject inline aliases:
    - `[*](rid: $this.id)` -> `select *, ($this.id) as rid ...`
- `<fetch>` tag on top-level view fields:
  - `role<fetch>` -> replaces `role` with `(select * from only $this.role) as role` in the view projection.

Taxonomies (caps block)
-----------------------
Taxonomies live inside the capabilities block and are parsed separately from fields.

Minimal form (default fields + ids):
```
[
  taxonomies:
    Department/s, department | The department of a user,
    Team/s, team | The team of a user
]
```
- `Department/s` → `labels.singular = Department`, `labels.plural = Departments`.
- If you omit `/s` or the plural segment, plural defaults to the singular.
- The `|` comment becomes the taxonomy description.
- Defaults for taxonomy + term fields come from `config/app.config.yaml`:
  - `taxonomies.taxonomies.fields`
  - `taxonomies.terms.fields`

Full form (override fields + nested term definition):
```
[
  taxonomies:
    Department/s, department | The department of a user {
      id: $key,
      key!: "",
      label!: "",
      description!: "",
      permalink: <permalink<$key>>,
    } [] (
      Term/s, term | The term of a user {
        id: $key,
        key!: "",
        label!: "",
        description!: "",
        permalink: <permalink<$key>>,
      } [] {}
    ) {}
]
```
- The taxonomy block behaves like a normal table `{fields}[caps](connections){extras}`.
- The nested subtable is the term definition (only one is expected).
- `id: $key` is normalized to the taxonomy/term id structure:
  - taxonomy → `stringID<parentModel, key>`
  - term → `stringID<parentModel, key, <field:key>>`
- Custom fields override defaults by key (the defaults are still merged in).

Taxonomy settings (relation-style)
----------------------------------
You can add a trailing settings block to control how terms attach to records (similar to `relations`):
```
[
  taxonomies:
    Category/ies, category | Question categories {
      id: $key,
      key!: "",
      label!: "",
      permalink: <permalink<$key>>,
    } [] (
      Term/s, term | Category term {
        id: $key,
        key!: "",
        label!: "",
        permalink: <permalink<$key>>,
      } [] {}
    ) {
      hierarchical: true
      cardinality: many
      storeOnModel: false
      payloadField: categories
      processor: functions
      required: false
      hooks:
        postAttach:
          - "fn::refreshQuestionCategoryStats(<TERM_ID>)"
        postDetach:
          - "fn::refreshQuestionCategoryStats(<TERM_ID>)"
    }
]
```
- `hierarchical: true` → term records gain a `parent` field (unless overridden).
- `cardinality: one|many` → payload expects a single term or an array.
- `storeOnModel: true|false` → whether term ids are persisted on the record.
- `payloadField` → name of the input field on create/update.
- `processor: functions|events|none` → how term linking is applied (defaults to `functions`).
- `required` → throw on create if payload field is missing or empty.
- `hooks.postAttach/postDetach` → injected into `attach...Term` / `detach...Term`.
  - Tokens available: `<TERM_ID>`, `<RID>`.

Generated TRPC endpoints
------------------------
When a table has `taxonomies`, a nested router is generated under the table router:
```
api.question.qcat.createTaxonomy(...)
api.question.qcat.addTerm(...)
api.question.qcat.removeTerm(...)
api.question.qcat.attach(...)
api.question.qcat.detach(...)
api.question.qcat.getTerms(...)
api.question.qcat.getRecordTerms(...)
```
The router key defaults to the taxonomy key (camel‑cased).

Generic taxonomy helpers (SurrealQL)
------------------------------------
All per‑taxonomy SURQL helpers are now thin wrappers around the generic taxonomy
API defined in `config/bootstrap/functions/utility/taxonomyTerms.surql`:
- `fn::createTerm(model, taxonomy, payload)`
- `fn::updateTerm(model, taxonomy, term, payload)`
- `fn::removeTerm(model, taxonomy, term)`
- `fn::attachTerm(model, taxonomy, record, term, options)`
- `fn::detachTerm(model, taxonomy, record, term, options)`
- `fn::getTerms(model, taxonomy)`
- `fn::getRecordTerms(model, taxonomy, record)`

This means every taxonomy uses the same attach/detach semantics, edge creation,
and store‑on‑model logic. The generated `add...Term`, `remove...Term`,
`attach...Term`, `detach...Term`, `get...Terms`, and `get...RecordTerms`
functions simply call the generic versions.

`attachTerm` / `detachTerm` options:
- `skipExists: true` bypasses the record existence check (useful immediately after create).

Convenience inputs
- `remove...Term` functions accept either a term record id **or** a string key.
  - If a string is provided, the term id is built via `fn::stringID([model, taxonomy, key])`.
