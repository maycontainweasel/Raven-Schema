# UI Specs (Schema Tools)

This folder documents the UI spec system used to generate admin UI pages and navigation for target apps (e.g. `pmv2-admin`).

## Why
We want a consistent, repeatable admin UI that mirrors the schema. Specs let us:
- Define overview pages (Typesense directory) per model
- Define create dialog fields + defaults
- Define global app navigation in one place
- Generate opinionated pages that can still be overridden locally

## Specs Location
Specs live in:
```
apps/tools/passmed-schema/config/ui
```

### Current spec files
- `app.ui.yaml` — global app navigation
- `question.ui.yaml` — questions overview
- `exam.ui.yaml` — exams overview
- `u.ui.yaml` — users overview

## Generation Command
From repo root:
```
pnpm --filter mpdschema schema:ui:generate
```

This uses defaults from `app.config.yaml`:
```yaml
ui:
  specsPath: ./config/ui
  projects:
    - pmv2-admin
```

### Optional filters
```
# only one spec
pnpm --filter mpdschema schema:ui:generate --spec question

# target a specific app
pnpm --filter mpdschema schema:ui:generate --project pmv2-admin
```

## Output Targets (current)
Generated assets go into safe locations in each target app:
- Overview pages: `layers/generated/app/pages/<namespace>/index.vue`
- Nav config: `app/config/admin-nav.generated.ts`
- Route list: `app/config/ui.generated.ts` (used by Nuxt to add aliases)

Local overrides live in the app and are never generated:
- `app/pages/<namespace>/index.vue` (overrides generated route)
- `app/config/admin-nav.custom.ts`
- `app/components/admin/overrides/<model>/CreateDialog.vue`

## Global App Menu Spec (app.ui.yaml)
Structure:
```yaml
version: 1
kind: ui-app
app:
  name: pmv2-admin
  menu:
    sections:
      - id: application
        label: Application
        items:
          - id: questions
            label: Questions
            icon: questions
            to: /questions
```

### Hide/disable items
Use either `hidden: true` or `enabled: false` on sections or items.

## Model Spec (example)
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

dialogs:
  create:
    required: [key, title, qidIndex]
    fields:
      - key: key
        label: Key
        type: text
        format: slug
        autoFrom: title
      - key: qidIndex
        label: QID Index
        type: number
    defaults:
      instances:
        - $rootInstance
      exams: []

overview:
  type: typesense
  table:
    columns: [key, title, qidIndex, college]
  typesense:
    queryBy: [title, key, college]
    refreshMode: upsert # or clear
    sortableFields: [title, key]

### Create field options
Each `dialogs.create.fields[]` entry supports:
- `type`: `text`, `number`, `textarea`, `select`, `instances`
- `multiple`: enable multi-select (used by `instances`)
- `format: slug`: lowercases and replaces spaces with dashes
- `autoFrom: <fieldKey>`: auto-populate this field from another field (e.g. `key` from `title`)
- `message`: small helper text rendered under the field

For `type: instances`, the admin UI will render a multi-select combobox using **active** instances from `@schema/db`.
```

## Create Dialog Override (per model)
By default, generated pages render the shared create dialog host:
```
<AdminCreateDialog ... />
```

To override the dialog for a model, create:
```
app/components/admin/overrides/<model>/CreateDialog.vue
```

This component receives:
- `open`, `form`, `fields`, `title`, `subtitle`, `loading`
- emits: `update:open`, `update:form`, `submit`, `cancel`

### Scaffold an override
```
pnpm --filter mpdschema ui:override:create exam
```

Optional:
```
pnpm --filter mpdschema ui:override:create exam --project pmv2-admin --force
```

## Layout Override Scaffold (page / row / column / card)
Generate an override stub for a specific layer:
```
pnpm --filter mpdschema ui:override:layer exam page overview
pnpm --filter mpdschema ui:override:layer exam row exam-overview-row-primary
pnpm --filter mpdschema ui:override:layer exam column exam-overview-col-left
pnpm --filter mpdschema ui:override:layer exam card exam-metadata
```

## Required IDs (important)
Every layout item in `single.tabs[].content` **must** include an explicit `id`:
- row `id`
- column `id`
- widget/card `id`

UI generation fails if any are missing (this is required for overrides).

## Single Page Overrides (page / row / column / card)
Generated single-management pages resolve overrides by convention:

**Page override (entire tab):**
```
app/components/models/<model>/overrides/pages/<tab-slug>.vue
```

**Row override:**
```
app/components/models/<model>/overrides/rows/<row-id>.vue
```

**Column override:**
```
app/components/models/<model>/overrides/columns/<column-id>.vue
```

**Card override:**
```
app/components/models/<model>/overrides/cards/<card-id>.vue
```

If an override exists, it replaces the generated content at that level.

### Example (exam)
```
app/components/models/exam/overrides/pages/content.vue
app/components/models/exam/overrides/rows/exam-overview-row-secondary.vue
app/components/models/exam/overrides/columns/exam-overview-col-right.vue
app/components/models/exam/overrides/cards/exam-metadata.vue
```

## Roadmap
- Generate single-record pages (tabs + cards + fields)
- Add safe “generated output” folder with override strategy (done for overview pages)
- Expand spec to include filters, facets, table cell formatting, action buttons
