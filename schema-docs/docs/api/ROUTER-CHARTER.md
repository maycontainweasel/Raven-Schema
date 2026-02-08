Title: Generated TRPC Router Charter
Scope: Generated routers only
Applies to: schema-docs /api, all generated apps that include schema-kit

This is the canonical, high‑level reference for **what methods exist on every generated TRPC router**, what they do, and how to call them.

If you are unsure which method to call for a task, start here and then consult:
- `docs/api/ROUTER-PRIMER.md`
- `docs/primer/USECRUD.md`
- `docs/primer/RECORD-IDS.md`

---

## Standard endpoint families

- CRUD: `create`, `update`, `delete`
- Views/Resources: `resource`, `list`, `count`, `get`, `fetch`
- Taxonomies (per taxonomy key):
  - `createTaxonomy`
  - `addTerm`
  - `removeTerm`
  - `attach`
  - `detach`
  - `getTerms`
  - `getRecordTerms`
- Typesense (when enabled): `refresh`, `collection`, `list`, `count`, `resource`

Term notes:
- Term tables are **per‑taxonomy**: `t_<table>_<taxonomy>`
- Term ID is **term key** (not `stringID`)
- `addTerm` accepts **label** (key optional; slug derived when missing)

---

## Generated endpoint summary (from router manifest)

### admin

Endpoints:

### apiAttempt
- CRUD: create, update, delete
- Views/Resources: finalize, list

Endpoints:
- `apiAttempt.create` (mutation)
  - fields: endpoint (required), method (optional), data (optional), instances (optional), rootInstance (optional), bypassMothership (optional), dataLocation (optional), status (optional), results (optional), startedAt (optional), endedAt (optional), options (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('apiAttempt.create', {
  "endpoint": "",
  "method": "",
  "data": "",
  "instances": "",
  "rootInstance": "",
  "bypassMothership": false,
  "dataLocation": "",
  "status": "",
  "results": "",
  "startedAt": "",
  "endedAt": "",
  "options": ""
}, { instance: 'test' })
```
- `apiAttempt.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('apiAttempt.update', {
  "payload": ""
}, { instance: 'test' })
```
- `apiAttempt.finalize` (mutation)
  - fields: id (required), payload (optional), results (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('apiAttempt.finalize', {
  "payload": "",
  "results": ""
}, { instance: 'test' })
```
- `apiAttempt.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('apiAttempt.delete', {}, { instance: 'test' })
```
- `apiAttempt.list` (query)
  ```ts
const { $process } = useCRUD()
const record = await $process('apiAttempt.list', {}, { instance: 'test' })
```

### car
- CRUD: create, update, delete

Endpoints:
- `car.create` (mutation)
  - fields: id (optional), name (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('car.create', {
  "name": ""
}, { instance: 'test' })
```
- `car.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('car.update', {}, { instance: 'test' })
```
- `car.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('car.delete', {}, { instance: 'test' })
```

### test
- CRUD: create, update, delete

Endpoints:
- `test.create` (mutation)
  - fields: id (optional), name (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('test.create', {
  "name": ""
}, { instance: 'test' })
```
- `test.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('test.update', {}, { instance: 'test' })
```
- `test.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('test.delete', {}, { instance: 'test' })
```

### instance
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection
- Other: instance.subtables.settings.create, instance.subtables.settings.update, instance.subtables.settings.delete, instance.subtables.settings.get

Endpoints:
- `instance.create` (mutation)
  - fields: id (optional), key (required), instance (optional), title (required), status (optional), active (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.create', {
  "key": "",
  "instance": "",
  "title": "",
  "status": "",
  "active": false
}, { instance: 'test' })
```
- `instance.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.update', {}, { instance: 'test' })
```
- `instance.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.delete', {}, { instance: 'test' })
```
- `instance.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `instance.subtables.settings.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.subtables.settings.create', {
  "payload": ""
}, { instance: 'test' })
```
- `instance.subtables.settings.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.subtables.settings.update', {
  "payload": ""
}, { instance: 'test' })
```
- `instance.subtables.settings.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.subtables.settings.delete', {}, { instance: 'test' })
```
- `instance.subtables.settings.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.subtables.settings.get', {}, { instance: 'test' })
```
- `instance.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `instance.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `instance.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `instance.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `instance.typesense.collection` (query)
  - input: RequestSchema<typesense payload>
