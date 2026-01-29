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

### question
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - qcat: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
  - qtag: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
- Other: question.subtables.questionOption.create, question.subtables.questionOption.update, question.subtables.questionOption.delete, question.subtables.questionOption.get, question.subtables.questionOption.list, question.subtables.questionRecord.create, question.subtables.questionRecord.update, question.subtables.questionRecord.delete, question.subtables.questionRecord.get

Endpoints:
- `question.create` (mutation)
  - fields: id (optional), qid (required), qCode (optional), question (required), explanation (optional), explanationRef (optional), source (optional), instances (optional), testobject (optional), tags (optional), categories (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.create', {
  "qid": 0,
  "qCode": "",
  "question": "",
  "explanation": "",
  "explanationRef": "",
  "source": "",
  "instances": "",
  "testobject": "",
  "tags": "",
  "categories": ""
}, { instance: 'test' })
```
- `question.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.update', {}, { instance: 'test' })
```
- `question.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.delete', {}, { instance: 'test' })
```
- `question.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `question.qcat.createTaxonomy` (mutation)
  - data: taxonomy payload
- `question.qcat.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `question.qcat.removeTerm` (mutation)
  - data: term key (string)
- `question.qcat.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qcat.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qcat.getTerms` (query)
  - data: {}
- `question.qcat.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `question.qtag.createTaxonomy` (mutation)
  - data: taxonomy payload
- `question.qtag.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `question.qtag.removeTerm` (mutation)
  - data: term key (string)
- `question.qtag.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qtag.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qtag.getTerms` (query)
  - data: {}
- `question.qtag.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `question.subtables.questionOption.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionOption.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionOption.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.delete', {}, { instance: 'test' })
```
- `question.subtables.questionOption.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.get', {}, { instance: 'test' })
```
- `question.subtables.questionOption.list` (query)
  - fields: id (required), start (optional), limit (optional), sortBy (optional), sortDir (optional), filters (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.list', {
  "start": 0,
  "limit": 0,
  "sortBy": "",
  "sortDir": "",
  "filters": ""
}, { instance: 'test' })
```
- `question.subtables.questionRecord.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionRecord.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionRecord.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionRecord.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionRecord.delete', {}, { instance: 'test' })
```
- `question.subtables.questionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionRecord.get', {}, { instance: 'test' })
```

### questionOption
- CRUD: create, update, delete
- Views/Resources: get, list
- Other: questionOption.subtables.questionOptionRecord.create, questionOption.subtables.questionOptionRecord.update, questionOption.subtables.questionOptionRecord.delete, questionOption.subtables.questionOptionRecord.get, questionOption.subtables.userQuestionOptionRecord.create, questionOption.subtables.userQuestionOptionRecord.update, questionOption.subtables.userQuestionOptionRecord.delete, questionOption.subtables.userQuestionOptionRecord.get, questionOption.subtables.userQuestionOptionRecord.list

Endpoints:
- `questionOption.create` (mutation)
  - fields: id (optional), optionKey (optional), label (required), correct (optional), order (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.create', {
  "optionKey": "",
  "label": "",
  "correct": false,
  "order": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `questionOption.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.update', {}, { instance: 'test' })
```
- `questionOption.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.delete', {}, { instance: 'test' })
```
- `questionOption.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.get', {}, { instance: 'test' })
```
- `questionOption.list` (query)
  - fields: id (required), start (optional), limit (optional), sortBy (optional), sortDir (optional), filters (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.list', {
  "start": 0,
  "limit": 0,
  "sortBy": "",
  "sortDir": "",
  "filters": ""
}, { instance: 'test' })
```
- `questionOption.subtables.questionOptionRecord.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.questionOptionRecord.create', {
  "payload": ""
}, { instance: 'test' })
```
- `questionOption.subtables.questionOptionRecord.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.questionOptionRecord.update', {
  "payload": ""
}, { instance: 'test' })
```
- `questionOption.subtables.questionOptionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.questionOptionRecord.delete', {}, { instance: 'test' })
```
- `questionOption.subtables.questionOptionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.questionOptionRecord.get', {}, { instance: 'test' })
```
- `questionOption.subtables.userQuestionOptionRecord.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.create', {
  "payload": ""
}, { instance: 'test' })
```
- `questionOption.subtables.userQuestionOptionRecord.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.update', {
  "payload": ""
}, { instance: 'test' })
```
- `questionOption.subtables.userQuestionOptionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.delete', {}, { instance: 'test' })
```
- `questionOption.subtables.userQuestionOptionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.get', {}, { instance: 'test' })
```
- `questionOption.subtables.userQuestionOptionRecord.list` (query)
  - fields: id (required), start (optional), limit (optional), sortBy (optional), sortDir (optional), filters (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.list', {
  "start": 0,
  "limit": 0,
  "sortBy": "",
  "sortDir": "",
  "filters": ""
}, { instance: 'test' })
```

### questionRecord
- CRUD: create, update, delete
- Views/Resources: get

Endpoints:
- `questionRecord.create` (mutation)
  - fields: id (optional), q (optional), attempts (optional), noCorrect (optional), noIncorrect (optional), percCorrect (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionRecord.create', {
  "q": "",
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "percCorrect": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `questionRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionRecord.update', {}, { instance: 'test' })
```
- `questionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionRecord.delete', {}, { instance: 'test' })
```
- `questionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionRecord.get', {}, { instance: 'test' })
```

### questionOptionRecord
- CRUD: create, update, delete
- Views/Resources: get

Endpoints:
- `questionOptionRecord.create` (mutation)
  - fields: id (optional), q (required), qOption (required), attempts (optional), noCorrect (optional), noIncorrect (optional), percCorrect (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOptionRecord.create', {
  "q": "",
  "qOption": "",
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "percCorrect": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `questionOptionRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOptionRecord.update', {}, { instance: 'test' })
```
- `questionOptionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOptionRecord.delete', {}, { instance: 'test' })
```
- `questionOptionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOptionRecord.get', {}, { instance: 'test' })
```

### userQuestionOptionRecord
- CRUD: create, update, delete
- Views/Resources: get, list

Endpoints:
- `userQuestionOptionRecord.create` (mutation)
  - fields: id (optional), u (required), qOption (required), attempts (optional), correct (optional), incorrect (optional), percCorrect (optional), order (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.create', {
  "u": "",
  "qOption": "",
  "attempts": 0,
  "correct": 0,
  "incorrect": 0,
  "percCorrect": 0,
  "order": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `userQuestionOptionRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.update', {}, { instance: 'test' })
```
- `userQuestionOptionRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.delete', {}, { instance: 'test' })
```
- `userQuestionOptionRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.get', {}, { instance: 'test' })
```
- `userQuestionOptionRecord.list` (query)
  - fields: id (required), start (optional), limit (optional), sortBy (optional), sortDir (optional), filters (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.list', {
  "start": 0,
  "limit": 0,
  "sortBy": "",
  "sortDir": "",
  "filters": ""
}, { instance: 'test' })
```

### user
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - role: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `user.create` (mutation)
  - fields: id (optional), email (required), password (required), firstName (required), surname (required), uniqueId (optional), role (required), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.create', {
  "email": "",
  "password": "",
  "firstName": "",
  "surname": "",
  "uniqueId": "",
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
