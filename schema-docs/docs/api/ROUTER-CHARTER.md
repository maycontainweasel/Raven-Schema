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
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `car.create` (mutation)
  - fields: id (optional), carid (required), name (required), color (optional), taste (optional), price (required), quantity (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('car.create', {
  "carid": "",
  "name": "",
  "color": "",
  "taste": "",
  "price": 0,
  "quantity": 0
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
- `car.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `car.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `car.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `car.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `car.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### catapult
- CRUD: create, update, delete
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `catapult.create` (mutation)
  - fields: id (optional), catapultid (required), name (required), description (optional), price (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('catapult.create', {
  "catapultid": "",
  "name": "",
  "description": "",
  "price": 0
}, { instance: 'test' })
```
- `catapult.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('catapult.update', {}, { instance: 'test' })
```
- `catapult.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('catapult.delete', {}, { instance: 'test' })
```
- `catapult.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `catapult.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `catapult.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `catapult.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `catapult.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### frame
- CRUD: create, update, delete

Endpoints:
- `frame.create` (mutation)
  - fields: id (optional), label (optional), page (required), parent (optional), order (optional), styles (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('frame.create', {
  "label": "",
  "page": "",
  "parent": "",
  "order": 0,
  "styles": ""
}, { instance: 'test' })
```
- `frame.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('frame.update', {}, { instance: 'test' })
```
- `frame.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('frame.delete', {}, { instance: 'test' })
```

### fruit
- CRUD: create, update, delete
- Taxonomies:
  - category: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
- Typesense: resource, list, refresh, count, collection
- Other: fruit.subtables.fruitMeta.create, fruit.subtables.fruitMeta.update, fruit.subtables.fruitMeta.delete, fruit.subtables.fruitMeta.get

Endpoints:
- `fruit.create` (mutation)
  - fields: id (optional), fruitId (required), name (required), description (optional), price (optional), category (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.create', {
  "fruitId": "",
  "name": "",
  "description": "",
  "price": 0,
  "category": ""
}, { instance: 'test' })
```
- `fruit.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.update', {}, { instance: 'test' })
```
- `fruit.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.delete', {}, { instance: 'test' })
```
- `fruit.category.createTaxonomy` (mutation)
  - data: taxonomy payload
- `fruit.category.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `fruit.category.removeTerm` (mutation)
  - data: term key (string)
- `fruit.category.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `fruit.category.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `fruit.category.getTerms` (query)
  - data: {}
- `fruit.category.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `fruit.subtables.fruitMeta.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.subtables.fruitMeta.create', {
  "payload": ""
}, { instance: 'test' })
```
- `fruit.subtables.fruitMeta.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.subtables.fruitMeta.update', {
  "payload": ""
}, { instance: 'test' })
```
- `fruit.subtables.fruitMeta.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.subtables.fruitMeta.delete', {}, { instance: 'test' })
```
- `fruit.subtables.fruitMeta.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fruit.subtables.fruitMeta.get', {}, { instance: 'test' })
```
- `fruit.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `fruit.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `fruit.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `fruit.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `fruit.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### page
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach
- Other: page.relations.site.list

Endpoints:
- `page.create` (mutation)
  - fields: id (optional), title (optional), permalink (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('page.create', {
  "title": "",
  "permalink": ""
}, { instance: 'test' })
```
- `page.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('page.update', {}, { instance: 'test' })
```
- `page.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('page.delete', {}, { instance: 'test' })
```
- `page.relations.site.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `page.relations.site.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `page.relations.site.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('page.relations.site.list', {}, { instance: 'test' })
```

### site
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach
- Other: site.relations.page.list

Endpoints:
- `site.create` (mutation)
  - fields: id (optional), key (required), name (required), description (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('site.create', {
  "key": "",
  "name": "",
  "description": ""
}, { instance: 'test' })
```
- `site.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('site.update', {}, { instance: 'test' })
```
- `site.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('site.delete', {}, { instance: 'test' })
```
- `site.relations.page.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `site.relations.page.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `site.relations.page.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('site.relations.page.list', {}, { instance: 'test' })
```

### user
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - role: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `user.create` (mutation)
  - fields: id (optional), email (required), firstName (required), surname (required), password (required), uniqueId (optional), customerId (optional), profile (optional), state (optional), settings (optional), role (required), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.create', {
  "email": "",
  "firstName": "",
  "surname": "",
  "password": "",
  "uniqueId": "",
  "customerId": "",
  "profile": "",
  "state": "",
  "settings": "",
  "role": "",
  "instances": ""
}, { instance: 'test' })
```
- `user.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.update', {}, { instance: 'test' })
```
- `user.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.delete', {}, { instance: 'test' })
```
- `user.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `user.role.createTaxonomy` (mutation)
  - data: taxonomy payload
- `user.role.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `user.role.removeTerm` (mutation)
  - data: term key (string)
- `user.role.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.role.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.role.getTerms` (query)
  - data: {}
- `user.role.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `user.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `user.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `user.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `user.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `user.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

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
