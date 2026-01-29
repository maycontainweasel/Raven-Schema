# Admin UI Generation + Overrides (Full Guide)

This document explains **exactly** how UI specs generate admin pages and how overrides work at every level.
It is written so any AI can pick up the system and make safe changes without breaking generation.

---

## 0) Quick Start (Given model X)

Example: **model = `exam`**, namespace = `/exams`

1) Create or update the spec:
```
apps/tools/passmed-schema/config/ui/exam.ui.yaml
```

2) Generate pages:
```
pnpm --filter mpdschema schema:ui:generate --spec exam
```

3) Resulting outputs:
```
apps/pmv2-admin/layers/generated/app/pages/exams/index.vue
apps/pmv2-admin/layers/generated/app/pages/exams/[id].vue
apps/pmv2-admin/app/config/ui.generated.ts
```

4) Nuxt hooks map generated pages to routes:
- `/exams` → generated overview (unless manual page exists)
- `/exams/:id` → generated single page (unless manual page exists)

5) Override at any level (page / row / column / card) using override folders.

---

## 1) Big Picture

We generate admin pages from **UI spec YAML files**.

- Specs live in `apps/tools/passmed-schema/config/ui`
- Generated pages are written to `apps/pmv2-admin/layers/generated/app/pages/<namespace>/`
- Nuxt hooks mount those generated pages under the real routes (e.g. `/exams`)
- If a manual page exists in `app/pages/<namespace>`, it **always wins**

This gives us:
- **repeatable generation**
- **safe overrides** (manual pages never get clobbered)
- **ability to iterate** per model and later generalize across all models

---

## 2) Generation Commands

From repo root:

```
pnpm --filter mpdschema schema:ui:generate
```

Filter to a single spec (e.g. exam):

```
pnpm --filter mpdschema schema:ui:generate --spec exam
```

Convenience scripts:

```
pnpm --filter mpdschema schema:ui:generate:exam
pnpm --filter mpdschema schema:ui:generate:question
pnpm --filter mpdschema schema:ui:generate:users
```

---

## 3) What gets generated

Given a spec like `exam.ui.yaml` (model = `exam`, namespace = `exams`), we generate:

**Overview page**
```
apps/pmv2-admin/layers/generated/app/pages/exams/index.vue
```

**Single management page**
```
apps/pmv2-admin/layers/generated/app/pages/exams/[<slug>].vue
```

The `<slug>` is derived from `route.single` in the spec (see below).

---

## 4) Routing Map (ui.generated.ts)

The generator writes a routing map at:
```
apps/pmv2-admin/app/config/ui.generated.ts
```

Each entry includes:
- `namespace` (e.g. `exams`)
- `basePath` (e.g. `/exams`)
- `singlePath` (e.g. `/exams/:id`)
- `param` (e.g. `id`)

`nuxt.config.ts` reads this file and wires up pages using the `pages:extend` hook.

---

## 5) How Nuxt mounts generated pages

`apps/pmv2-admin/nuxt.config.ts` uses a **pages hook** to mount generated pages:

- If a manual page exists in `app/pages/exams/index.vue`, that wins.
- Otherwise, the generated file is mounted at `/exams`.
- Same rule for single pages (`/exams/:slug`).

This is what enables **safe overrides**:

```
app/pages/exams/index.vue     # overrides generated overview
app/pages/exams/[id].vue      # overrides generated single page
```

---

## 6) Spec → Route → Slug logic

In the spec:

```yaml
route:
  base: /exams
  single: /exams/<id.id>
```

The `<id.id>` token means:

- Use the `id` field returned from Surreal (which is `{ tb, id }`)
- Extract the `.id` property
- Use that as the slug in the URL

If you set:

```
single: /exams/<key>
```

then the slug uses `record.key`.

---

## 7) Overview page generation (Typesense)

The `overview` block controls the directory page:

```yaml
overview:
  type: typesense
  meta:
    title: "Exams Overview"
    subtitle: "Typesense directory for the Exam model."
  actions:
    - create
    - refresh
  table:
    columns: [key, title]
  typesense:
    queryBy: [title, key]
    sortableFields: [title, key]
    filters: [instances]
```

Generated overview includes:
- search input
- filters (facets)
- sortable dropdown
- create dialog
- refresh button

**Important:** the page will only send `sort_by` if the field is actually sortable in the Typesense schema.

---

## 8) Single management page generation

The `single` block drives the edit UI:

```yaml
single:
  layout: navigation-primary
  store:
    key: exam
    resolver: id.id
  tabs:
    - label: Overview
      slug: overview
      content:
        - id: exam-overview-row-primary
          primary:
            - id: exam-overview-col-left
              widgets:
                - type: fields-card
                  id: exam-metadata
                  title: "Metadata"
                  fields: [...]
```

Each tab yields:
- **rows**
- each row has **columns**
- each column has **widgets** (usually `fields-card`)

The generated single page renders these using:
```
PrimaryContainer → WidgetRenderer → FieldsCard → FieldRenderer
```

### Required IDs (mandatory)
Every layout node must have an explicit `id`:
- Row: `id`
- Column: `id`
- Widget/Card: `id`

Generation **fails** if any of these are missing. This ensures:
- consistent override paths
- stable references over time

If you see generation errors, add the missing `id` to the spec.

---

## 9) Overrides (the most important part)

Overrides let you replace just one part of the generated UI.

**Override levels (highest → lowest):**

### Page override (entire tab)
```
app/components/models/<model>/overrides/pages/<tab-slug>.vue
```

Example:
```
app/components/models/exam/overrides/pages/content.vue
```

### Row override
```
app/components/models/<model>/overrides/rows/<row-id>.vue
```

Example:
```
app/components/models/exam/overrides/rows/exam-overview-row-secondary.vue
```

### Column override
```
app/components/models/<model>/overrides/columns/<column-id>.vue
```

Example:
```
app/components/models/exam/overrides/columns/exam-overview-col-right.vue
```

### Card override
```
app/components/models/<model>/overrides/cards/<card-id>.vue
```

Example:
```
app/components/models/exam/overrides/cards/exam-metadata.vue
```

If an override exists at that level, the generator output is **skipped** at that level only.

---

## 10) Override precedence

**Page override wins over everything** in that tab.  
If a page override exists, rows/columns/cards are not rendered at all.

If no page override:
- Row override replaces only that row
- Column override replaces only that column
- Card override replaces only that card

---

## 11) Prebuilt components → gradual refactor strategy

This system is designed to let us:

1) **Drop in prebuilt UI components** to move fast  
2) **Keep generated baselines** for consistency  
3) **Slowly refactor** by replacing individual cards/columns/rows/pages

Example refactor flow:

1. Start with generated `fields-card` for metadata
2. Override just the card with a custom component
3. Later remove the override and move its logic back into baseline if it becomes canonical

---

## 12) Create Dialog Overrides (per model)

The generated overview uses the shared create dialog host:
```
<AdminCreateDialog ... />
```

To override the inner content for a model:
```
app/components/admin/overrides/<model>/CreateDialog.vue
```

Scaffold a new override:
```
pnpm --filter mpdschema ui:override:create exam
```

See: `apps/tools/passmed-schema/docs/ui/create-dialog-overrides.md`

---

## 13) Layout Override Scaffold (page / row / column / card)

Generate a stub override file for a specific layer:
```
pnpm --filter mpdschema ui:override:layer exam page overview
pnpm --filter mpdschema ui:override:layer exam row exam-overview-row-primary
pnpm --filter mpdschema ui:override:layer exam column exam-overview-col-left
pnpm --filter mpdschema ui:override:layer exam card exam-metadata
```

This writes to:
```
app/components/models/<model>/overrides/<layer>/<name>.vue
```

---

## 14) Key files to know

**Specs**
```
apps/tools/passmed-schema/config/ui/*.ui.yaml
```

**Generated pages**
```
apps/pmv2-admin/layers/generated/app/pages/<namespace>/
```

**Override folders**
```
app/components/models/<model>/overrides/pages/
app/components/models/<model>/overrides/rows/
app/components/models/<model>/overrides/columns/
app/components/models/<model>/overrides/cards/
```

---

## 15) Quick example (Exam)

Spec defines `exam-overview-col-right` → we drop:

```
app/components/models/exam/overrides/columns/exam-overview-col-right.vue
```

That column is replaced, while the rest of the generated page still renders.
