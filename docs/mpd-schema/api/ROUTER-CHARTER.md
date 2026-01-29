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

### announcement
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `announcement.create` (mutation)
  - fields: id (optional), title (required), message (required), style (required), severity (required), dismissible (required), startsAt (optional), endsAt (optional), active (required), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('announcement.create', {
  "title": "",
  "message": "",
  "style": "",
  "severity": "",
  "dismissible": false,
  "startsAt": "",
  "endsAt": "",
  "active": false,
  "instances": ""
}, { instance: 'test' })
```
- `announcement.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('announcement.update', {}, { instance: 'test' })
```
- `announcement.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('announcement.delete', {}, { instance: 'test' })
```
- `announcement.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('announcement.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `announcement.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `announcement.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `announcement.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `announcement.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `announcement.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### builderFrame
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach
- Other: builderFrame.relations.builderframe.list, builderFrame.relations.builderwidget.list, builderFrame.relations.builderpage.list

Endpoints:
- `builderFrame.create` (mutation)
  - fields: id (optional), page (required), parent (optional), order (required), kind (optional), className (optional), wrapperClass (optional), elementId (optional), createdAt (optional), updatedAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.create', {
  "page": "",
  "parent": "",
  "order": 0,
  "kind": "",
  "className": "",
  "wrapperClass": "",
  "elementId": "",
  "createdAt": "",
  "updatedAt": ""
}, { instance: 'test' })
```
- `builderFrame.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.update', {}, { instance: 'test' })
```
- `builderFrame.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.delete', {}, { instance: 'test' })
```
- `builderFrame.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `builderFrame.relations.builderframe.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderframe.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderframe.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.relations.builderframe.list', {}, { instance: 'test' })
```
- `builderFrame.relations.builderwidget.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderwidget.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderwidget.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.relations.builderwidget.list', {}, { instance: 'test' })
```
- `builderFrame.relations.builderpage.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderpage.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderFrame.relations.builderpage.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderFrame.relations.builderpage.list', {}, { instance: 'test' })
```

### builderPage
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach
- Other: builderPage.relations.builderframe.list, builderPage.relations.exam.list

Endpoints:
- `builderPage.create` (mutation)
  - fields: id (optional), title (optional), createdAt (optional), updatedAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.create', {
  "title": "",
  "createdAt": "",
  "updatedAt": ""
}, { instance: 'test' })
```
- `builderPage.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.update', {}, { instance: 'test' })
```
- `builderPage.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.delete', {}, { instance: 'test' })
```
- `builderPage.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `builderPage.relations.builderframe.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderPage.relations.builderframe.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderPage.relations.builderframe.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.relations.builderframe.list', {}, { instance: 'test' })
```
- `builderPage.relations.exam.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderPage.relations.exam.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderPage.relations.exam.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderPage.relations.exam.list', {}, { instance: 'test' })
```

### builderWidget
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach
- Other: builderWidget.relations.builderframe.list

Endpoints:
- `builderWidget.create` (mutation)
  - fields: id (optional), frame (required), order (required), type (required), data (optional), className (optional), wrapperClass (optional), elementId (optional), createdAt (optional), updatedAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderWidget.create', {
  "frame": "",
  "order": 0,
  "type": "",
  "data": "",
  "className": "",
  "wrapperClass": "",
  "elementId": "",
  "createdAt": "",
  "updatedAt": ""
}, { instance: 'test' })
```
- `builderWidget.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderWidget.update', {}, { instance: 'test' })
```
- `builderWidget.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderWidget.delete', {}, { instance: 'test' })
```
- `builderWidget.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderWidget.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `builderWidget.relations.builderframe.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderWidget.relations.builderframe.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `builderWidget.relations.builderframe.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('builderWidget.relations.builderframe.list', {}, { instance: 'test' })
```

### communicationCategory
- CRUD: create, update, delete
- Views/Resources: resource

Endpoints:
- `communicationCategory.create` (mutation)
  - fields: id (optional), key (required), label (required), description (optional), sourceChannel (required), category (required), defaultTags (optional), order (optional), active (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationCategory.create', {
  "key": "",
  "label": "",
  "description": "",
  "sourceChannel": "",
  "category": "",
  "defaultTags": "",
  "order": 0,
  "active": false
}, { instance: 'test' })
```
- `communicationCategory.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationCategory.update', {}, { instance: 'test' })
```
- `communicationCategory.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationCategory.delete', {}, { instance: 'test' })
```
- `communicationCategory.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationCategory.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```

### communicationEnvironment
- CRUD: create, update, delete
- Views/Resources: resource

Endpoints:
- `communicationEnvironment.create` (mutation)
  - fields: id (optional), key (required), label (required), order (optional), active (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationEnvironment.create', {
  "key": "",
  "label": "",
  "order": 0,
  "active": false
}, { instance: 'test' })
```
- `communicationEnvironment.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationEnvironment.update', {}, { instance: 'test' })
```
- `communicationEnvironment.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationEnvironment.delete', {}, { instance: 'test' })
```
- `communicationEnvironment.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationEnvironment.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```

### communicationMessage
- CRUD: create, update, delete
- Views/Resources: resource

Endpoints:
- `communicationMessage.create` (mutation)
  - fields: id (optional), thread (required), direction (optional), authorProfile (optional), body (required), richBody (optional), metadata (optional), tags (optional), createdAt (optional), readAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationMessage.create', {
  "thread": "",
  "direction": "",
  "authorProfile": "",
  "body": "",
  "richBody": "",
  "metadata": "",
  "tags": "",
  "createdAt": "",
  "readAt": ""
}, { instance: 'test' })
```
- `communicationMessage.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationMessage.update', {}, { instance: 'test' })
```
- `communicationMessage.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationMessage.delete', {}, { instance: 'test' })
```
- `communicationMessage.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationMessage.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```

### communicationThread
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `communicationThread.create` (mutation)
  - fields: id (optional), subject (required), category (required), subcategory (optional), tags (optional), sourceChannel (required), sourceInstance (required), sourceContext (optional), contactProfile (required), status (optional), priority (optional), assignedAdmin (optional), unreadAdminCount (optional), firstMessage (optional), lastMessage (optional), messageIds (optional), createdAt (optional), updatedAt (optional), lastMessageAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationThread.create', {
  "subject": "",
  "category": "",
  "subcategory": "",
  "tags": "",
  "sourceChannel": "",
  "sourceInstance": "",
  "sourceContext": "",
  "contactProfile": "",
  "status": "",
  "priority": "",
  "assignedAdmin": "",
  "unreadAdminCount": 0,
  "firstMessage": "",
  "lastMessage": "",
  "messageIds": "",
  "createdAt": "",
  "updatedAt": "",
  "lastMessageAt": ""
}, { instance: 'test' })
```
- `communicationThread.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationThread.update', {}, { instance: 'test' })
```
- `communicationThread.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationThread.delete', {}, { instance: 'test' })
```
- `communicationThread.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('communicationThread.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `communicationThread.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `communicationThread.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `communicationThread.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `communicationThread.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `communicationThread.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### exam
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: exam.relations.question.list, exam.relations.builderpage.list, exam.relations.product.list, exam.relations.questionattempt.list, exam.relations.session.list

Endpoints:
- `exam.create` (mutation)
  - fields: id (optional), key (required), title (required), titleShort (optional), description (optional), college (optional), sheetId (optional), qidIndex (required), order (optional), instances (optional), colours (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.create', {
  "key": "",
  "title": "",
  "titleShort": "",
  "description": "",
  "college": "",
  "sheetId": "",
  "qidIndex": 0,
  "order": 0,
  "instances": "",
  "colours": ""
}, { instance: 'test' })
```
- `exam.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.update', {}, { instance: 'test' })
```
- `exam.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.delete', {}, { instance: 'test' })
```
- `exam.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `exam.relations.question.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.question.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.question.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.relations.question.list', {}, { instance: 'test' })
```
- `exam.relations.builderpage.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.builderpage.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.builderpage.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.relations.builderpage.list', {}, { instance: 'test' })
```
- `exam.relations.product.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.product.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.product.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.relations.product.list', {}, { instance: 'test' })
```
- `exam.relations.questionattempt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.questionattempt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.questionattempt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.relations.questionattempt.list', {}, { instance: 'test' })
```
- `exam.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `exam.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('exam.relations.session.list', {}, { instance: 'test' })
```
- `exam.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `exam.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `exam.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `exam.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `exam.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### extensionProduct
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach
- Other: extensionProduct.relations.extensionvariant.list, extensionProduct.relations.order.list, extensionProduct.relations.productvariant.list

Endpoints:
- `extensionProduct.create` (mutation)
  - fields: id (optional), productKey (required), examKey (required), product (required), exam (required), productVariant (required), period (required), currency (required), stripePID (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.create', {
  "productKey": "",
  "examKey": "",
  "product": "",
  "exam": "",
  "productVariant": "",
  "period": 0,
  "currency": "",
  "stripePID": ""
}, { instance: 'test' })
```
- `extensionProduct.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.update', {}, { instance: 'test' })
```
- `extensionProduct.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.delete', {}, { instance: 'test' })
```
- `extensionProduct.relations.extensionvariant.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.extensionvariant.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.extensionvariant.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.relations.extensionvariant.list', {}, { instance: 'test' })
```
- `extensionProduct.relations.order.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.order.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.order.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.relations.order.list', {}, { instance: 'test' })
```
- `extensionProduct.relations.productvariant.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.productvariant.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionProduct.relations.productvariant.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionProduct.relations.productvariant.list', {}, { instance: 'test' })
```

### extensionVariant
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach, attach, detach
- Other: extensionVariant.relations.extensionproduct.list, extensionVariant.relations.order.list

Endpoints:
- `extensionVariant.create` (mutation)
  - fields: id (optional), productKey (required), examKey (required), product (required), exam (required), productVariant (required), extensionProduct (required), period (required), currency (required), numberOfDays (required), value (required), stripePriceID (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionVariant.create', {
  "productKey": "",
  "examKey": "",
  "product": "",
  "exam": "",
  "productVariant": "",
  "extensionProduct": "",
  "period": 0,
  "currency": "",
  "numberOfDays": 0,
  "value": 0,
  "stripePriceID": ""
}, { instance: 'test' })
```
- `extensionVariant.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionVariant.update', {}, { instance: 'test' })
```
- `extensionVariant.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionVariant.delete', {}, { instance: 'test' })
```
- `extensionVariant.relations.extensionproduct.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionVariant.relations.extensionproduct.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionVariant.relations.extensionproduct.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionVariant.relations.extensionproduct.list', {}, { instance: 'test' })
```
- `extensionVariant.relations.order.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionVariant.relations.order.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `extensionVariant.relations.order.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('extensionVariant.relations.order.list', {}, { instance: 'test' })
```

### fAQ
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - faqcategory: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `fAQ.create` (mutation)
  - fields: id (optional), question (required), answer (required), category (required), faqCategorys (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('fAQ.create', {
  "question": "",
  "answer": "",
  "category": "",
  "faqCategorys": "",
  "instances": ""
}, { instance: 'test' })
```
- `fAQ.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('fAQ.update', {}, { instance: 'test' })
```
- `fAQ.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('fAQ.delete', {}, { instance: 'test' })
```
- `fAQ.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('fAQ.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `fAQ.faqcategory.createTaxonomy` (mutation)
  - data: taxonomy payload
- `fAQ.faqcategory.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `fAQ.faqcategory.removeTerm` (mutation)
  - data: term key (string)
- `fAQ.faqcategory.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `fAQ.faqcategory.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `fAQ.faqcategory.getTerms` (query)
  - data: {}
- `fAQ.faqcategory.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `fAQ.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `fAQ.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `fAQ.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `fAQ.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `fAQ.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### notification
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `notification.create` (mutation)
  - fields: id (optional), title (required), summary (optional), body (required), image (optional), ctaLabel (optional), ctaUrl (optional), publishAt (optional), order (optional), active (required), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('notification.create', {
  "title": "",
  "summary": "",
  "body": "",
  "image": "",
  "ctaLabel": "",
  "ctaUrl": "",
  "publishAt": "",
  "order": 0,
  "active": false,
  "instances": ""
}, { instance: 'test' })
```
- `notification.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('notification.update', {}, { instance: 'test' })
```
- `notification.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('notification.delete', {}, { instance: 'test' })
```
- `notification.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('notification.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `notification.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `notification.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `notification.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `notification.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `notification.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### order
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: order.relations.product.list, order.relations.productvariant.list, order.relations.extensionproduct.list, order.relations.extensionvariant.list, order.subtables.orderEvent.create, order.subtables.orderEvent.update, order.subtables.orderEvent.delete, order.subtables.orderEvent.get, order.subtables.orderEvent.list, order.subtables.orderItem.create, order.subtables.orderItem.update, order.subtables.orderItem.delete, order.subtables.orderItem.get, order.subtables.orderItem.list

Endpoints:
- `order.create` (mutation)
  - fields: id (optional), u (required), uSubscription (optional), exam (optional), productID (optional), variantID (optional), extensionID (optional), type (optional), status (optional), currency (optional), amountSubtotal (optional), amountTax (optional), amountDiscount (optional), amountTotal (optional), amountRefunded (optional), stripeID (optional), stripeOrderID (optional), paymentIntentID (optional), checkoutSessionID (optional), chargeID (optional), customerID (optional), invoiceID (optional), paymentMethodID (optional), stripePriceID (optional), stripeProductID (optional), subscriptionID (optional), receiptURL (optional), couponApplied (optional), couponCode (optional), items (optional), access (optional), userSnapshot (optional), paymentSnapshot (optional), events (optional), metadata (optional), stripePayload (optional), createdAt (optional), updatedAt (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.create', {
  "u": "",
  "uSubscription": "",
  "exam": "",
  "productID": "",
  "variantID": "",
  "extensionID": "",
  "type": "",
  "status": "",
  "currency": "",
  "amountSubtotal": 0,
  "amountTax": 0,
  "amountDiscount": 0,
  "amountTotal": 0,
  "amountRefunded": 0,
  "stripeID": "",
  "stripeOrderID": "",
  "paymentIntentID": "",
  "checkoutSessionID": "",
  "chargeID": "",
  "customerID": "",
  "invoiceID": "",
  "paymentMethodID": "",
  "stripePriceID": "",
  "stripeProductID": "",
  "subscriptionID": "",
  "receiptURL": "",
  "couponApplied": false,
  "couponCode": "",
  "items": "",
  "access": "",
  "userSnapshot": "",
  "paymentSnapshot": "",
  "events": "",
  "metadata": "",
  "stripePayload": "",
  "createdAt": "",
  "updatedAt": "",
  "instances": ""
}, { instance: 'test' })
```
- `order.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.update', {}, { instance: 'test' })
```
- `order.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.delete', {}, { instance: 'test' })
```
- `order.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `order.relations.product.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.product.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.product.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.relations.product.list', {}, { instance: 'test' })
```
- `order.relations.productvariant.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.productvariant.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.productvariant.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.relations.productvariant.list', {}, { instance: 'test' })
```
- `order.relations.extensionproduct.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.extensionproduct.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.extensionproduct.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.relations.extensionproduct.list', {}, { instance: 'test' })
```
- `order.relations.extensionvariant.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.extensionvariant.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `order.relations.extensionvariant.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.relations.extensionvariant.list', {}, { instance: 'test' })
```
- `order.subtables.orderEvent.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderEvent.create', {
  "payload": ""
}, { instance: 'test' })
```
- `order.subtables.orderEvent.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderEvent.update', {
  "payload": ""
}, { instance: 'test' })
```
- `order.subtables.orderEvent.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderEvent.delete', {}, { instance: 'test' })
```
- `order.subtables.orderEvent.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderEvent.get', {}, { instance: 'test' })
```
- `order.subtables.orderEvent.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderEvent.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `order.subtables.orderItem.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderItem.create', {
  "payload": ""
}, { instance: 'test' })
```
- `order.subtables.orderItem.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderItem.update', {
  "payload": ""
}, { instance: 'test' })
```
- `order.subtables.orderItem.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderItem.delete', {}, { instance: 'test' })
```
- `order.subtables.orderItem.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderItem.get', {}, { instance: 'test' })
```
- `order.subtables.orderItem.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('order.subtables.orderItem.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `order.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `order.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `order.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `order.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `order.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### organisation
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: organisation.relations.user.list

Endpoints:
- `organisation.create` (mutation)
  - fields: id (optional), title (required), slug (required), description (optional), website (optional), email (optional), phone (optional), industry (optional), size (optional), logo (optional), address (optional), instances (optional), active (required), createdAt (optional), updatedAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisation.create', {
  "title": "",
  "slug": "",
  "description": "",
  "website": "",
  "email": "",
  "phone": "",
  "industry": "",
  "size": "",
  "logo": "",
  "address": "",
  "instances": "",
  "active": false,
  "createdAt": "",
  "updatedAt": ""
}, { instance: 'test' })
```
- `organisation.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisation.update', {}, { instance: 'test' })
```
- `organisation.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisation.delete', {}, { instance: 'test' })
```
- `organisation.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisation.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `organisation.relations.user.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `organisation.relations.user.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `organisation.relations.user.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisation.relations.user.list', {}, { instance: 'test' })
```
- `organisation.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `organisation.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `organisation.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `organisation.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `organisation.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### organisationUser
- CRUD: create, update

Endpoints:
- `organisationUser.create` (mutation)
  - fields: id (optional), organisation (required), u (required), role (required), addedAt (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisationUser.create', {
  "organisation": "",
  "u": "",
  "role": "",
  "addedAt": ""
}, { instance: 'test' })
```
- `organisationUser.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('organisationUser.update', {}, { instance: 'test' })
```

### pMInstance
- CRUD: create, update, delete
- Views/Resources: resource

Endpoints:
- `pMInstance.create` (mutation)
  - fields: id (optional), key (required), instance (required), title (required), status (required), active (required), flag (optional), description (optional), domains (optional), primaryDomain (optional), locale (optional), timezone (optional), currency (optional), currencies (optional), pricingOptions (optional), apiKeys (optional), surrealdb (optional), redis (optional), content (optional), createdAt (optional), updatedAt (optional), createdBy (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('pMInstance.create', {
  "key": "",
  "instance": "",
  "title": "",
  "status": "",
  "active": false,
  "flag": "",
  "description": "",
  "domains": "",
  "primaryDomain": "",
  "locale": "",
  "timezone": "",
  "currency": "",
  "currencies": "",
  "pricingOptions": "",
  "apiKeys": "",
  "surrealdb": "",
  "redis": "",
  "content": "",
  "createdAt": "",
  "updatedAt": "",
  "createdBy": "",
  "instances": ""
}, { instance: 'test' })
```
- `pMInstance.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('pMInstance.update', {}, { instance: 'test' })
```
- `pMInstance.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('pMInstance.delete', {}, { instance: 'test' })
```
- `pMInstance.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('pMInstance.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```

### product
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: product.relations.order.list, product.relations.exam.list, product.relations.productvariant.list

Endpoints:
- `product.create` (mutation)
  - fields: id (optional), key (required), slug (optional), title (required), description (optional), stripePID (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.create', {
  "key": "",
  "slug": "",
  "title": "",
  "description": "",
  "stripePID": "",
  "instances": ""
}, { instance: 'test' })
```
- `product.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.update', {}, { instance: 'test' })
```
- `product.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.delete', {}, { instance: 'test' })
```
- `product.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `product.relations.order.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.order.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.order.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.relations.order.list', {}, { instance: 'test' })
```
- `product.relations.exam.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.exam.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.exam.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.relations.exam.list', {}, { instance: 'test' })
```
- `product.relations.productvariant.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.productvariant.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `product.relations.productvariant.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('product.relations.productvariant.list', {}, { instance: 'test' })
```
- `product.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `product.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `product.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `product.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `product.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### productVariant
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach
- Other: productVariant.relations.order.list, productVariant.relations.product.list, productVariant.relations.extensionproduct.list

Endpoints:
- `productVariant.create` (mutation)
  - fields: id (optional), productKey (required), examKey (required), product (required), exam (required), period (required), currency (required), value (required), label (optional), stripePriceID (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.create', {
  "productKey": "",
  "examKey": "",
  "product": "",
  "exam": "",
  "period": 0,
  "currency": "",
  "value": 0,
  "label": "",
  "stripePriceID": ""
}, { instance: 'test' })
```
- `productVariant.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.update', {}, { instance: 'test' })
```
- `productVariant.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.delete', {}, { instance: 'test' })
```
- `productVariant.relations.order.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.order.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.order.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.relations.order.list', {}, { instance: 'test' })
```
- `productVariant.relations.product.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.product.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.product.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.relations.product.list', {}, { instance: 'test' })
```
- `productVariant.relations.extensionproduct.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.extensionproduct.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `productVariant.relations.extensionproduct.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('productVariant.relations.extensionproduct.list', {}, { instance: 'test' })
```

### question
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - qcat: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
  - qtag: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
  - qtopic: createTaxonomy, addTerm, removeTerm, attach, detach, getTerms, getRecordTerms
  - relations: attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: question.relations.exam.list, question.relations.questionattempt.list, question.relations.session.list, question.subtables.questionOption.create, question.subtables.questionOption.update, question.subtables.questionOption.delete, question.subtables.questionOption.get, question.subtables.questionOption.list, question.subtables.questionNote.create, question.subtables.questionNote.update, question.subtables.questionNote.delete, question.subtables.questionNote.get, question.subtables.questionNote.list, question.subtables.questionPerformanceRecord.create, question.subtables.questionPerformanceRecord.update, question.subtables.questionPerformanceRecord.delete, question.subtables.questionPerformanceRecord.get, question.subtables.userQuestionNote.create, question.subtables.userQuestionNote.update, question.subtables.userQuestionNote.delete, question.subtables.userQuestionNote.get, question.subtables.userQuestionNote.list, question.subtables.userQuestionPerformanceRecord.create, question.subtables.userQuestionPerformanceRecord.update, question.subtables.userQuestionPerformanceRecord.delete, question.subtables.userQuestionPerformanceRecord.get, question.subtables.userQuestionPerformanceRecord.list

Endpoints:
- `question.create` (mutation)
  - fields: id (optional), qid (required), qCode (optional), question (required), explanation (optional), explanationRef (optional), source (optional), instances (optional), qcats (optional), qtags (optional), qtopics (optional)
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
  "qcats": "",
  "qtags": "",
  "qtopics": ""
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
- `question.qtopic.createTaxonomy` (mutation)
  - data: taxonomy payload
- `question.qtopic.addTerm` (mutation)
  - data: term payload (label required, key optional)
- `question.qtopic.removeTerm` (mutation)
  - data: term key (string)
- `question.qtopic.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qtopic.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.qtopic.getTerms` (query)
  - data: {}
- `question.qtopic.getRecordTerms` (query)
  - data: { id: <record sub-id> }
- `question.relations.exam.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.exam.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.exam.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.relations.exam.list', {}, { instance: 'test' })
```
- `question.relations.questionattempt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.questionattempt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.questionattempt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.relations.questionattempt.list', {}, { instance: 'test' })
```
- `question.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `question.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.relations.session.list', {}, { instance: 'test' })
```
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
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionOption.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `question.subtables.questionNote.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionNote.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionNote.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionNote.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionNote.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionNote.delete', {}, { instance: 'test' })
```
- `question.subtables.questionNote.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionNote.get', {}, { instance: 'test' })
```
- `question.subtables.questionNote.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionNote.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `question.subtables.questionPerformanceRecord.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionPerformanceRecord.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionPerformanceRecord.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionPerformanceRecord.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.questionPerformanceRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionPerformanceRecord.delete', {}, { instance: 'test' })
```
- `question.subtables.questionPerformanceRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.questionPerformanceRecord.get', {}, { instance: 'test' })
```
- `question.subtables.userQuestionNote.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionNote.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.userQuestionNote.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionNote.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.userQuestionNote.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionNote.delete', {}, { instance: 'test' })
```
- `question.subtables.userQuestionNote.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionNote.get', {}, { instance: 'test' })
```
- `question.subtables.userQuestionNote.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionNote.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `question.subtables.userQuestionPerformanceRecord.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionPerformanceRecord.create', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.userQuestionPerformanceRecord.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionPerformanceRecord.update', {
  "payload": ""
}, { instance: 'test' })
```
- `question.subtables.userQuestionPerformanceRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionPerformanceRecord.delete', {}, { instance: 'test' })
```
- `question.subtables.userQuestionPerformanceRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionPerformanceRecord.get', {}, { instance: 'test' })
```
- `question.subtables.userQuestionPerformanceRecord.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('question.subtables.userQuestionPerformanceRecord.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `question.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `question.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `question.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `question.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `question.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

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
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.list', {
  "start": 0,
  "limit": 0
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
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionOption.subtables.userQuestionOptionRecord.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```

### questionNote
- CRUD: create, update, delete
- Views/Resources: get, list

Endpoints:
- `questionNote.create` (mutation)
  - fields: id (optional), q (required), note (optional), order (optional), createdAt (required), createdBy (required), createdByName (required), updatedAt (optional), updatedBy (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionNote.create', {
  "q": "",
  "note": "",
  "order": 0,
  "createdAt": "",
  "createdBy": "",
  "createdByName": "",
  "updatedAt": "",
  "updatedBy": "",
  "parentId": ""
}, { instance: 'test' })
```
- `questionNote.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionNote.update', {}, { instance: 'test' })
```
- `questionNote.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionNote.delete', {}, { instance: 'test' })
```
- `questionNote.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionNote.get', {}, { instance: 'test' })
```
- `questionNote.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionNote.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
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

### questionPerformanceRecord
- CRUD: create, update, delete
- Views/Resources: get

Endpoints:
- `questionPerformanceRecord.create` (mutation)
  - fields: id (optional), attempts (optional), noCorrect (optional), noIncorrect (optional), percCorrect (optional), totalTime (optional), averageTime (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionPerformanceRecord.create', {
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "percCorrect": 0,
  "totalTime": 0,
  "averageTime": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `questionPerformanceRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionPerformanceRecord.update', {}, { instance: 'test' })
```
- `questionPerformanceRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionPerformanceRecord.delete', {}, { instance: 'test' })
```
- `questionPerformanceRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionPerformanceRecord.get', {}, { instance: 'test' })
```

### userQuestionNote
- CRUD: create, update, delete
- Views/Resources: get, list

Endpoints:
- `userQuestionNote.create` (mutation)
  - fields: id (optional), u (required), q (required), note (optional), order (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionNote.create', {
  "u": "",
  "q": "",
  "note": "",
  "order": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `userQuestionNote.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionNote.update', {}, { instance: 'test' })
```
- `userQuestionNote.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionNote.delete', {}, { instance: 'test' })
```
- `userQuestionNote.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionNote.get', {}, { instance: 'test' })
```
- `userQuestionNote.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionNote.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
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
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionOptionRecord.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```

### userQuestionPerformanceRecord
- CRUD: create, update, delete
- Views/Resources: get, list

Endpoints:
- `userQuestionPerformanceRecord.create` (mutation)
  - fields: id (optional), attempts (optional), noCorrect (optional), noIncorrect (optional), percCorrect (optional), totalTime (optional), averageTime (optional), order (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionPerformanceRecord.create', {
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "percCorrect": 0,
  "totalTime": 0,
  "averageTime": 0,
  "order": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `userQuestionPerformanceRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionPerformanceRecord.update', {}, { instance: 'test' })
```
- `userQuestionPerformanceRecord.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionPerformanceRecord.delete', {}, { instance: 'test' })
```
- `userQuestionPerformanceRecord.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionPerformanceRecord.get', {}, { instance: 'test' })
```
- `userQuestionPerformanceRecord.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userQuestionPerformanceRecord.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```

### questionAttempt
- CRUD: create, update, delete
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach, attach, detach, attach, detach
- Other: questionAttempt.relations.user.list, questionAttempt.relations.question.list, questionAttempt.relations.session.list, questionAttempt.relations.exam.list, questionAttempt.relations.qt.list

Endpoints:
- `questionAttempt.create` (mutation)
  - fields: id (optional), s (optional), q (required), u (required), selectedOptionID (required), correct (optional), order (optional), startTS (optional), answerTS (optional), totalTime (optional), create_at (optional), exams (optional), examsTerms (optional), categories (optional), categoryIds (optional), _reconciliationKey (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.create', {
  "s": "",
  "q": "",
  "u": "",
  "selectedOptionID": "",
  "correct": false,
  "order": 0,
  "startTS": "",
  "answerTS": "",
  "totalTime": 0,
  "create_at": "",
  "exams": "",
  "examsTerms": "",
  "categories": "",
  "categoryIds": "",
  "_reconciliationKey": ""
}, { instance: 'test' })
```
- `questionAttempt.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.update', {}, { instance: 'test' })
```
- `questionAttempt.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.delete', {}, { instance: 'test' })
```
- `questionAttempt.relations.user.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.user.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.user.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.relations.user.list', {}, { instance: 'test' })
```
- `questionAttempt.relations.question.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.question.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.question.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.relations.question.list', {}, { instance: 'test' })
```
- `questionAttempt.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.relations.session.list', {}, { instance: 'test' })
```
- `questionAttempt.relations.exam.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.exam.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.exam.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.relations.exam.list', {}, { instance: 'test' })
```
- `questionAttempt.relations.qt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.qt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `questionAttempt.relations.qt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('questionAttempt.relations.qt.list', {}, { instance: 'test' })
```

### session
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach, attach, detach, attach, detach, attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: session.relations.questionattempt.list, session.relations.question.list, session.relations.sessionperformancerecord.list, session.relations.sessionlog.list, session.relations.qt.list, session.relations.sessioncategoryrecord.list, session.relations.user.list, session.relations.exam.list

Endpoints:
- `session.create` (mutation)
  - fields: id (optional), uuid (required), title (required), mode (required), state (required), active (required), dateCreated (required), dateLastActive (optional), dateLastTouch (optional), dateCompleted (optional), index (optional), qTotal (required), familiarity (required), u (required), exams (optional), categories (optional), timing (optional), qids (optional), qidsInit (optional), qActiveID (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.create', {
  "uuid": "",
  "title": "",
  "mode": "",
  "state": "",
  "active": false,
  "dateCreated": "",
  "dateLastActive": "",
  "dateLastTouch": "",
  "dateCompleted": "",
  "index": 0,
  "qTotal": 0,
  "familiarity": "",
  "u": "",
  "exams": "",
  "categories": "",
  "timing": "",
  "qids": "",
  "qidsInit": false,
  "qActiveID": ""
}, { instance: 'test' })
```
- `session.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.update', {}, { instance: 'test' })
```
- `session.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.delete', {}, { instance: 'test' })
```
- `session.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `session.relations.questionattempt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.questionattempt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.questionattempt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.questionattempt.list', {}, { instance: 'test' })
```
- `session.relations.question.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.question.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.question.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.question.list', {}, { instance: 'test' })
```
- `session.relations.sessionperformancerecord.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessionperformancerecord.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessionperformancerecord.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.sessionperformancerecord.list', {}, { instance: 'test' })
```
- `session.relations.sessionlog.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessionlog.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessionlog.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.sessionlog.list', {}, { instance: 'test' })
```
- `session.relations.qt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.qt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.qt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.qt.list', {}, { instance: 'test' })
```
- `session.relations.sessioncategoryrecord.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessioncategoryrecord.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.sessioncategoryrecord.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.sessioncategoryrecord.list', {}, { instance: 'test' })
```
- `session.relations.user.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.user.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.user.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.user.list', {}, { instance: 'test' })
```
- `session.relations.exam.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.exam.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `session.relations.exam.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('session.relations.exam.list', {}, { instance: 'test' })
```
- `session.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `session.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `session.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `session.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `session.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### sessionCategoryRecord
- CRUD: create, update
- Taxonomies:
  - relations: attach, detach
- Other: sessionCategoryRecord.relations.session.list

Endpoints:
- `sessionCategoryRecord.create` (mutation)
  - fields: id (optional), s (required), qt (required), attempts (optional), noCorrect (optional), noIncorrect (optional), percCorrect (optional), averageTime (optional), totalTime (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionCategoryRecord.create', {
  "s": "",
  "qt": "",
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "percCorrect": 0,
  "averageTime": 0,
  "totalTime": 0
}, { instance: 'test' })
```
- `sessionCategoryRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionCategoryRecord.update', {}, { instance: 'test' })
```
- `sessionCategoryRecord.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionCategoryRecord.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionCategoryRecord.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionCategoryRecord.relations.session.list', {}, { instance: 'test' })
```

### sessionEvent
- CRUD: create, update, delete

Endpoints:
- `sessionEvent.create` (mutation)
  - fields: id (optional), action (required), time (required), payload (optional), q (optional), sq (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionEvent.create', {
  "action": "",
  "time": "",
  "payload": "",
  "q": "",
  "sq": ""
}, { instance: 'test' })
```
- `sessionEvent.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionEvent.update', {}, { instance: 'test' })
```
- `sessionEvent.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionEvent.delete', {}, { instance: 'test' })
```

### sessionLog
- CRUD: create, update
- Taxonomies:
  - relations: attach, detach
- Other: sessionLog.relations.session.list

Endpoints:
- `sessionLog.create` (mutation)
  - fields: id (optional), s (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionLog.create', {
  "s": ""
}, { instance: 'test' })
```
- `sessionLog.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionLog.update', {}, { instance: 'test' })
```
- `sessionLog.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionLog.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionLog.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionLog.relations.session.list', {}, { instance: 'test' })
```

### sessionPerformanceRecord
- CRUD: create, update
- Taxonomies:
  - relations: attach, detach
- Other: sessionPerformanceRecord.relations.session.list

Endpoints:
- `sessionPerformanceRecord.create` (mutation)
  - fields: id (optional), s (required), u (required), qTotal (required), attempts (optional), noCorrect (optional), noIncorrect (optional), noComplete (optional), noIncomplete (optional), percComplete (optional), percCorrect (optional), percCorrectAttempted (optional), totalSessionTime (optional), averageTimePerQ (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionPerformanceRecord.create', {
  "s": "",
  "u": "",
  "qTotal": 0,
  "attempts": 0,
  "noCorrect": 0,
  "noIncorrect": 0,
  "noComplete": 0,
  "noIncomplete": 0,
  "percComplete": 0,
  "percCorrect": 0,
  "percCorrectAttempted": 0,
  "totalSessionTime": 0,
  "averageTimePerQ": 0
}, { instance: 'test' })
```
- `sessionPerformanceRecord.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionPerformanceRecord.update', {}, { instance: 'test' })
```
- `sessionPerformanceRecord.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionPerformanceRecord.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `sessionPerformanceRecord.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionPerformanceRecord.relations.session.list', {}, { instance: 'test' })
```

### sessionQuestion
- CRUD: create, update

Endpoints:
- `sessionQuestion.create` (mutation)
  - fields: id (optional), s (required), q (required), order (required), flagged (optional), complete (optional), startTS (optional), answerTS (optional), totalTime (optional), lastUpdated (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionQuestion.create', {
  "s": "",
  "q": "",
  "order": 0,
  "flagged": false,
  "complete": false,
  "startTS": "",
  "answerTS": "",
  "totalTime": 0,
  "lastUpdated": ""
}, { instance: 'test' })
```
- `sessionQuestion.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('sessionQuestion.update', {}, { instance: 'test' })
```

### testimonial
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection

Endpoints:
- `testimonial.create` (mutation)
  - fields: id (optional), name (required), role (optional), organisation (optional), quote (required), avatar (optional), rating (optional), order (optional), active (required), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('testimonial.create', {
  "name": "",
  "role": "",
  "organisation": "",
  "quote": "",
  "avatar": "",
  "rating": 0,
  "order": 0,
  "active": false,
  "instances": ""
}, { instance: 'test' })
```
- `testimonial.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('testimonial.update', {}, { instance: 'test' })
```
- `testimonial.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('testimonial.delete', {}, { instance: 'test' })
```
- `testimonial.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('testimonial.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```
- `testimonial.typesense.resource` (query)
  - input: RequestSchema<typesense payload>
- `testimonial.typesense.list` (query)
  - input: RequestSchema<typesense payload>
- `testimonial.typesense.refresh` (mutation)
  - input: RequestSchema<typesense payload>
- `testimonial.typesense.count` (query)
  - input: RequestSchema<typesense payload>
- `testimonial.typesense.collection` (query)
  - input: RequestSchema<typesense payload>

### user
- CRUD: create, update, delete
- Views/Resources: resource
- Taxonomies:
  - relations: attach, detach, attach, detach, attach, detach
- Typesense: resource, list, refresh, count, collection
- Other: user.relations.organisation.list, user.relations.questionattempt.list, user.relations.session.list, user.subtables.userExamDate.create, user.subtables.userExamDate.update, user.subtables.userExamDate.delete, user.subtables.userExamDate.get, user.subtables.userExamDate.list, user.subtables.userProfile.create, user.subtables.userProfile.update, user.subtables.userProfile.delete, user.subtables.userProfile.get

Endpoints:
- `user.create` (mutation)
  - fields: id (optional), email (required), password (required), firstName (required), surname (required), role (optional), uniqueId (optional), customerId (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.create', {
  "email": "",
  "password": "",
  "firstName": "",
  "surname": "",
  "role": "",
  "uniqueId": "",
  "customerId": "",
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
- `user.relations.organisation.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.organisation.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.organisation.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.relations.organisation.list', {}, { instance: 'test' })
```
- `user.relations.questionattempt.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.questionattempt.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.questionattempt.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.relations.questionattempt.list', {}, { instance: 'test' })
```
- `user.relations.session.attach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.session.detach` (mutation)
  - data: { id: <record sub-id>, term: <term key> }
- `user.relations.session.list` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.relations.session.list', {}, { instance: 'test' })
```
- `user.subtables.userExamDate.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userExamDate.create', {
  "payload": ""
}, { instance: 'test' })
```
- `user.subtables.userExamDate.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userExamDate.update', {
  "payload": ""
}, { instance: 'test' })
```
- `user.subtables.userExamDate.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userExamDate.delete', {}, { instance: 'test' })
```
- `user.subtables.userExamDate.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userExamDate.get', {}, { instance: 'test' })
```
- `user.subtables.userExamDate.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userExamDate.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `user.subtables.userProfile.create` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userProfile.create', {
  "payload": ""
}, { instance: 'test' })
```
- `user.subtables.userProfile.update` (mutation)
  - fields: id (required), payload (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userProfile.update', {
  "payload": ""
}, { instance: 'test' })
```
- `user.subtables.userProfile.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userProfile.delete', {}, { instance: 'test' })
```
- `user.subtables.userProfile.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('user.subtables.userProfile.get', {}, { instance: 'test' })
```
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

### userExamDate
- CRUD: create, update, delete
- Views/Resources: get, list, resource

Endpoints:
- `userExamDate.create` (mutation)
  - fields: id (optional), u (required), exam (required), examDate (required), createdAt (optional), updatedAt (optional), order (optional), parentId (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.create', {
  "u": "",
  "exam": "",
  "examDate": "",
  "createdAt": "",
  "updatedAt": "",
  "order": 0,
  "parentId": ""
}, { instance: 'test' })
```
- `userExamDate.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.update', {}, { instance: 'test' })
```
- `userExamDate.delete` (mutation)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.delete', {}, { instance: 'test' })
```
- `userExamDate.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.get', {}, { instance: 'test' })
```
- `userExamDate.list` (query)
  - fields: id (required), start (optional), limit (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.list', {
  "start": 0,
  "limit": 0
}, { instance: 'test' })
```
- `userExamDate.resource` (query)
  - fields: id (required), key (optional), resource (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('userExamDate.resource', {
  "key": "",
  "resource": ""
}, { instance: 'test' })
```

### userProfile
- CRUD: update
- Views/Resources: get

Endpoints:
- `userProfile.update` (mutation)
  ```ts
const { $process } = useCRUD()
const record = await $process('userProfile.update', {}, { instance: 'test' })
```
- `userProfile.get` (query)
  - fields: id (required)
  ```ts
const { $process } = useCRUD()
const record = await $process('userProfile.get', {}, { instance: 'test' })
```

### instance
- CRUD: create, update, delete
- Views/Resources: resource
- Typesense: resource, list, refresh, count, collection
- Other: instance.subtables.settings.create, instance.subtables.settings.update, instance.subtables.settings.delete, instance.subtables.settings.get

Endpoints:
- `instance.create` (mutation)
  - fields: id (optional), key (required), instance (required), title (required), status (required), active (required), flag (optional), description (optional), domains (optional), primaryDomain (optional), locale (optional), timezone (optional), currency (optional), currencies (optional), pricingOptions (optional), apiKeys (optional), surrealdb (optional), redis (optional), content (optional), createdAt (optional), updatedAt (optional), createdBy (optional), instances (optional)
  ```ts
const { $process } = useCRUD()
const record = await $process('instance.create', {
  "key": "",
  "instance": "",
  "title": "",
  "status": "",
  "active": false,
  "flag": "",
  "description": "",
  "domains": "",
  "primaryDomain": "",
  "locale": "",
  "timezone": "",
  "currency": "",
  "currencies": "",
  "pricingOptions": "",
  "apiKeys": "",
  "surrealdb": "",
  "redis": "",
  "content": "",
  "createdAt": "",
  "updatedAt": "",
  "createdBy": "",
  "instances": ""
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
