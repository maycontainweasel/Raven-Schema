# UI Spec Examples (Admin UI Generator)

This folder contains UI specs (`*.ui.yaml`) that generate admin pages.  
Use this document as a quick reference for **layouts**, **cards**, **fields**, and **targets**.

---

## Create Dialog Fields (Important)

Create dialogs are configured under `dialogs.create` in each `*.ui.yaml` spec.
The generator builds:
- the overview page create dialog UI
- the required field list
- the default form values
- the create payload mapping

### Structure

```yaml
dialogs:
  create:
    required: [key, title]
    fields:
      - key: title
        label: Title
        type: text
        placeholder: Exam title
        required: true
      - key: key
        label: Key
        type: text
        format: slug
        autoFrom: title
        placeholder: e.g. plab1
        required: true
      - key: instances
        label: Instances
        type: instances
        multiple: true
        message: "Leave blank to remain unallocated."
    defaults:
      exams: []
```

### Field options

Each `dialogs.create.fields[]` entry supports:
- `type`: `text`, `number`, `textarea`, `select`, `instances`
- `multiple`: enable multi-select (used by `instances`)
- `format: slug`: lowercases and replaces spaces with dashes
- `autoFrom: <fieldKey>`: auto-populate this field from another field (e.g. `key` from `title`)
- `message`: small helper text rendered under the field
- `options`: for `select` (label/value pairs)

### Instances field behavior

If `type: instances` **or** `key: instances` is used:
- the UI renders a multi-select combobox
- options come from `@schema/db` **active** instances
- **root instances (e.g. `pm`) are hidden** so leaving blank means “unallocated”

### Required + defaults

- `required` is enforced on the form (empty strings or empty arrays count as missing)
- defaults are applied first; empty form values do **not** override defaults
- if `instances` is omitted, create will run on the mothership only (local model behavior)

---

## Minimal single-page example

```yaml
version: 1
kind: ui
name: Exam
model: exam
table: exam
namespace: exams

route:
  base: /exams
  single: /exams/<key>

meta:
  title: "Exams"
  subtitle: "Manage exams and their metadata"

single:
  layout: navigation-primary
  store:
    key: exam
    resolver: key
  targets:
    base:
      model: exam
      endpoint: exam.update
    postStatus:
      endpoint: admin.updatePostStatus
      payloadMap:
        recordId: $recordId
        status: $field:post.status
  header:
    label: "Exam"
    back: true
    instances: true
    status: true
    refresh: true
    delete: true
    statusTarget: postStatus
    statusOptions:
      - label: Draft
        value: draft
      - label: Publish
        value: publish
  tabs:
    - label: General
      slug: general
      content:
        - id: exam-general-row
          primary:
            - id: exam-general-col-main
              class: "flex-[2]"
              widgets:
                - type: fields-card
                  id: exam-general
                  title: "Exam Information"
                  subtitle: "Core details"
                  fields:
                    - field: title
                      type: text
                      label: "Title"
                    - field: titleShort
                      type: text
                      label: "Short title"
                    - field: slug
                      type: text
                      label: "Exam Key"
                      props:
                        readonly: true
                        disabled: true
            - id: exam-general-col-side
              class: "flex-1"
              widgets:
                - type: fields-card
                  id: exam-post-status
                  title: "Post Status"
                  saveLabel: "Update"
                  fields:
                    - key: postStatus
                      field: post.status
                      type: select
                      label: "Status"
                      target: postStatus
                      options:
                        - label: Draft
                          value: draft
                        - label: Publish
                          value: publish
```

---

## Overview filter layout (Typesense)

`overview.typesense.filters` controls which filter fields are available.  
`overview.filters.layout` controls **how they are arranged**.

```yaml
overview:
  type: typesense
  filters:
    layout:
      - id: exam-filters-primary
        class: "flex flex-wrap items-end justify-between gap-4"
        fields:
          - key: search
            class: "flex-1 min-w-[240px] max-w-xl"
          - key: instances
            class: "min-w-[220px]"
      - id: exam-filters-secondary
        class: "flex flex-wrap gap-3"
        fields:
          - key: status
          - key: college
  typesense:
    filters: [instances, status, college]
```

Notes:
- `search` is a special key for the search input.
- Use `label: ""` to hide a field label (e.g., instances).
- Any filter fields **not** mentioned in the layout are rendered in a fallback row.

---

## Layout rules (page)

`single.tabs[].content` describes **rows** and **columns**:

```yaml
content:
  - class: "tm:flex-row"
    primary:
      - class: "flex-[2]"
        widgets: [...]
      - class: "flex-1"
        widgets: [...]
```

Defaults:
- Rows: `flex flex-col gap-6 tm:flex-row`
- Columns: `flex-1 flex flex-col gap-6 min-w-0`

You can override or extend with `class`.

---

## Fields in a card (simple)

```yaml
fields:
  - field: title
    type: text
    label: "Title"
  - field: qidIndex
    type: number
    label: "QID Index"
```

---

## Fields in a card (layout + helpers)

Cards can define a `content` layout to arrange fields/messages:

```yaml
content:
  - columns:
      - items:
          - field: title
            type: text
            label: "Title"
          - field: titleShort
            type: text
            label: "Short title"
      - items:
          - type: message
            text: "Use a short title for tight layouts."
            class: "text-xs text-muted"
  - columns:
      - items:
          - field: description
            type: textarea
            label: "Description"
            rows: 4
  - columns:
      - items:
          - type: divider
  - columns:
      - items:
          - type: spacer
            size: sm
          - field: sheetId
            type: text
            label: "Sheet ID"
```

Supported inline items:
- `field` entries (same as in `fields:`)
- `type: message` → small text block
- `type: divider` → horizontal rule
- `type: spacer` → vertical space (`size: sm|md|lg`)

---

## Targets and updates

Use `targets` to route updates from a card:

```yaml
targets:
  base:
    model: exam
    endpoint: exam.update
  postStatus:
    endpoint: admin.updatePostStatus
    payloadMap:
      recordId: $recordId
      status: $field:post.status
```

Field options:
- `target`: which target group to use
- `path`: dot-path when field is nested (e.g. `post.status`)
- `key`: unique form key when multiple fields share a name

---

## Header options

```yaml
header:
  label: "Question"
  back: true
  instances: true
  status: true
  refresh: true
  delete: true
  statusTarget: postStatus
```

---

## Notes
- `field: post.status` requires a target that points to the post-status endpoint.
- Use `props` to pass-through props to the underlying input.
- `content` inside a card overrides simple `fields` layout but both can be used together.
