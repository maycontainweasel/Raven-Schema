import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export type ModelManagerModel = {
  modelKey: string
  routerKey: string
  table: string
  label: string
  directoryRoute: string
  dataMode: ModelDataMode
  capabilities: string[]
  hasTypesense: boolean
  typesenseCollection: string | null
  typesenseFields: string[]
  taxonomyKeys: string[]
  subtableKeys: string[]
  taxonomies: Array<{
    key: string
    actions: {
      getTerms: string
      getRecordTerms: string
      attach: string
      detach: string
      addTerm?: string
    }
  }>
  subtables: Array<{
    key: string
    actions: {
      create: string
      update: string
      delete: string
      get: string
      list: string
    }
  }>
  fields: string[]
  requiredFields: string[]
  canManage: boolean
  hasFragment: boolean
  hasGenerated: boolean
}

export type ModelDataMode = 'local' | 'remote'

export type ModelUIComponentSpec = {
  name: string
  options: Record<string, any>
  action?: string
  modelKey?: string
}

export type ModelUIFieldBindingModel = {
  kind: 'model'
  action: string
  payloadKey: string
}

export type ModelUIFieldBindingSubtable = {
  kind: 'subtable'
  subtableKey: string
  action: string
  payloadKey: string
}

export type ModelUIFieldBindingTaxonomy = {
  kind: 'taxonomy'
  taxonomyKey: string
  valueMode: 'termIds'
  actions: {
    getTerms: string
    getRecordTerms: string
    attach: string
    detach: string
    addTerm?: string
  }
}

export type ModelUIFieldBindingCustom = {
  kind: 'custom'
  handler: string
}

export type ModelUIFieldBinding =
  | ModelUIFieldBindingModel
  | ModelUIFieldBindingSubtable
  | ModelUIFieldBindingTaxonomy
  | ModelUIFieldBindingCustom

export type ModelUIFieldSpec = {
  id: string
  field: string
  label: string
  component: ModelUIComponentSpec
  binding?: ModelUIFieldBinding
  action?: string
  modelKey?: string
  validation?: Record<string, any>
  class?: string
  meta?: Record<string, any>
}

export type ModelUIFieldLayoutColumnSpec = {
  id: string
  class?: string
  fieldIds: string[]
}

export type ModelUIFieldLayoutRowSpec = {
  id: string
  name?: string
  class?: string
  columns: ModelUIFieldLayoutColumnSpec[]
}

export type ModelUIFieldLayoutSpec = {
  rows: ModelUIFieldLayoutRowSpec[]
}

export type ModelUIWidgetSpec = {
  id: string
  type: 'fields-card' | 'widget'
  name: string
  label: string
  subtitle?: string
  class?: string
  saveLabel?: string
  action?: string
  fields: ModelUIFieldSpec[]
  layout?: ModelUIFieldLayoutSpec
  meta?: Record<string, any>
}

export type ModelUIColumnSpec = {
  id: string
  name: string
  class?: string
  primary: ModelUIWidgetSpec[]
  meta?: Record<string, any>
}

export type ModelUIRowSpec = {
  id: string
  name: string
  class?: string
  columns: ModelUIColumnSpec[]
  meta?: Record<string, any>
}

export type ModelUITabSpec = {
  id: string
  slug: string
  label: string
  primary: ModelUIRowSpec[]
  meta?: Record<string, any>
}

export type DirectoryListingFieldSpec = {
  key: string
  label: string
  class?: string
}

export type DirectoryFilterSpec = {
  key: string
  label: string
  component: ModelUIComponentSpec
}

export type DirectoryCreateDialogSpec = {
  enabled: boolean
  action: string
  title: string
  submitLabel: string
  required: string[]
  fields: ModelUIFieldSpec[]
}

export type ModelLayoutSpec = {
  version: 2 | 3
  kind: 'helios-model-ui'
  model: string
  table: string
  label: string
  updatedAt: string
  directory: {
    enabled: boolean
    route: string
    slugPolicy: 'rid' | 'slug' | 'id' | 'custom'
    title: string
    description: string
    typesense: {
      enabled: boolean
      collection: string
      queryBy: string[]
      sortableFields: string[]
      filters: string[]
    }
    listing: {
      fields: DirectoryListingFieldSpec[]
      filters: DirectoryFilterSpec[]
    }
    createDialog: DirectoryCreateDialogSpec
  }
  single: {
    global: {
      enablePostStatus: boolean
      enableInstanceManagement: boolean
      showHeader: boolean
    }
    tabs: ModelUITabSpec[]
  }
}

type InternalModel = Omit<ModelManagerModel, 'hasFragment' | 'hasGenerated'>

const MODEL_HEADER_RE = /^\s*([A-Za-z][\w]*)\s*,\s*([A-Za-z][\w-]*)\b/
const FIELD_RE = /^\s*([A-Za-z_][\w.]*)(!?)\??\s*:\s*/
const TYPESENSE_RE = /^\s*typesense\s*:\s*$/
const TYPESENSE_FN_RE = /^\s*([A-Za-z_][\w-]*)::fn\[(.*?)\]/
const CAPABILITY_TOKEN_RE = /^[a-z][a-z0-9_-]*$/
const GENERATED_ROUTE_MARKER = '@helios-generated-model-route'
const GENERATED_MODELS_BLOCK_RE = /export const models\s*=\s*\{([\s\S]*?)\}\s*as const;/
const GENERATED_MODELS_ENTRY_RE = /"([^"]+)"\s*:\s*\{\s*table:\s*"([^"]+)"(?:\s*,\s*data:\s*"(local|remote)")?/g
const SUBTABLE_FIELD_RE = /<\s*(subsingle|submany|subtable\*?)\s*<\s*([^>]+)\s*>\s*>/i
const GENERATED_ADMIN_MANIFEST_FILES = [
  'modules/schema-kit/runtime/generated/admin-models.json',
  './modules/schema-kit/runtime/generated/admin-models.json',
]

const ensureUnique = <T>(values: T[]) => Array.from(new Set(values))

const safeText = (value: unknown, fallback: string) => {
  const next = String(value ?? fallback).trim()
  return next.length > 0 ? next : fallback
}

const safeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const mapped = value
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
  return ensureUnique(mapped)
}

const safeMetaObject = (value: unknown): Record<string, any> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, any>
  }
  catch {
    return undefined
  }
}

const startsWithSlash = (value: string) => {
  if (value.startsWith('/')) return value
  return `/${value}`
}

const titleCase = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

const slugify = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

const normalizeModelKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

const toCamelCase = (value: string) => {
  const source = String(value || '').trim()
  if (!source.length) return ''
  const normalized = source
    .replace(/[_\-\s]+([A-Za-z0-9])/g, (_, token: string) => token.toUpperCase())
    .replace(/^[A-Z]/, token => token.toLowerCase())
  return normalized
}

const normalizeCreateDialogAction = (
  value: unknown,
  modelKey: string,
  fallbackProcedure = 'create',
) => {
  const normalizedModel = normalizeModelKey(modelKey)
  const fallbackAction = `${normalizedModel}.${fallbackProcedure}`
  const raw = String(value ?? '').trim()
  if (!raw) return fallbackAction

  const segments = raw
    .split('.')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)

  if (!segments.length || segments.length > 2) return fallbackAction

  const procedure = segments.length === 1 ? segments[0]! : segments[1]!
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(procedure)) return fallbackAction

  if (segments.length === 2) {
    const targetModel = normalizeModelKey(segments[0]!)
    if (targetModel !== normalizedModel) return fallbackAction
  }

  return `${normalizedModel}.${procedure}`
}

const normalizeRoutePath = (value: string, fallback: string) => {
  const normalized = startsWithSlash(safeText(value, fallback))
    .split('?')[0]!
    .split('#')[0]!
    .replace(/\/{2,}/g, '/')

  if (normalized === '/') return normalized
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

const routeSegmentsFromPath = (value: string) => {
  const normalized = normalizeRoutePath(value, '/')
  if (normalized === '/') return []
  return normalized
    .slice(1)
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
}

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  }
  catch {
    return null
  }
}

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  const source = await readTextFile(filePath)
  if (!source) return null
  try {
    return JSON.parse(source) as T
  }
  catch {
    return null
  }
}

const isManagedRouteFile = (source: string | null) =>
  Boolean(source && source.includes(GENERATED_ROUTE_MARKER))

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

const isIgnorableField = (field: string) => {
  const normalized = field.trim().toLowerCase()
  return (
    normalized.length === 0 ||
    normalized.startsWith('$') ||
    normalized === 'id' ||
    normalized === 'rid'
  )
}

const resolveFieldKey = (field: Pick<ModelUIFieldSpec, 'modelKey' | 'field' | 'id'>) => {
  return String(field.modelKey || field.field || field.id || '').trim()
}

const componentFromField = (modelKey: string, field: string): ModelUIComponentSpec => {
  const normalized = field.toLowerCase()
  const base = {
    action: `${modelKey}.update`,
    modelKey: field,
  }

  if (normalized.includes('color')) {
    return {
      ...base,
      name: 'AColorPicker',
      options: {},
    }
  }

  if (normalized.includes('status')) {
    return {
      ...base,
      name: 'ACombobox',
      options: {
        grouped: false,
        highlightMatch: false,
        multiple: false,
        clearable: true,
        showIndicator: true,
        placeholder: 'Select status',
      },
    }
  }

  if (normalized.includes('email')) {
    return {
      ...base,
      name: 'AInput',
      options: {
        type: 'email',
        placeholder: 'name@example.com',
      },
    }
  }

  if (['price', 'quantity', 'count', 'amount', 'total', 'score', 'year', 'age'].some(token => normalized.includes(token))) {
    return {
      ...base,
      name: 'AInput',
      options: {
        type: 'number',
        placeholder: `Enter ${titleCase(field).toLowerCase()}`,
      },
    }
  }

  return {
    ...base,
    name: 'AInput',
    options: {
      type: 'text',
      placeholder: `Enter ${titleCase(field).toLowerCase()}`,
    },
  }
}

const normalizeListingFields = (
  value: unknown,
  fallback: DirectoryListingFieldSpec[],
): DirectoryListingFieldSpec[] => {
  if (!Array.isArray(value)) return fallback
  const mapped = value
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const key = entry.trim()
        if (!key) return null
        return {
          key,
          label: titleCase(key),
          class: '',
        }
      }

      if (!entry || typeof entry !== 'object') return null
      const key = safeText((entry as any).key, `field-${index + 1}`)
      const label = safeText((entry as any).label, titleCase(key))
      const klass = String((entry as any).class ?? '').trim()
      return {
        key,
        label,
        class: klass || undefined,
      }
    })
    .filter(Boolean) as DirectoryListingFieldSpec[]

  if (!mapped.length) return fallback

  const deduped = new Map<string, DirectoryListingFieldSpec>()
  for (const field of mapped) {
    if (!deduped.has(field.key)) deduped.set(field.key, field)
  }

  return Array.from(deduped.values())
}

const normalizeFilterSpec = (
  value: unknown,
  fallback: DirectoryFilterSpec[],
): DirectoryFilterSpec[] => {
  if (!Array.isArray(value)) return fallback

  const mapped = value
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const key = entry.trim()
        if (!key) return null
        return {
          key,
          label: titleCase(key),
          component: {
            name: 'ACombobox',
            options: {
              grouped: false,
              highlightMatch: false,
              multiple: false,
              clearable: true,
              showIndicator: true,
            },
          },
        } satisfies DirectoryFilterSpec
      }

      if (!entry || typeof entry !== 'object') return null
      const key = safeText((entry as any).key, `filter-${index + 1}`)
      const label = safeText((entry as any).label, titleCase(key))
      const componentName = safeText((entry as any)?.component?.name, 'ACombobox')
      const componentOptions =
        (entry as any)?.component?.options && typeof (entry as any)?.component?.options === 'object'
          ? (entry as any).component.options
          : {}

      return {
        key,
        label,
        component: {
          name: componentName,
          options: componentOptions,
        },
      } satisfies DirectoryFilterSpec
    })
    .filter(Boolean) as DirectoryFilterSpec[]

  if (!mapped.length) return fallback

  const deduped = new Map<string, DirectoryFilterSpec>()
  for (const filter of mapped) {
    if (!deduped.has(filter.key)) deduped.set(filter.key, filter)
  }

  return Array.from(deduped.values())
}

const normalizeComponent = (
  value: unknown,
  fallback: ModelUIComponentSpec,
): ModelUIComponentSpec => {
  if (!value || typeof value !== 'object') return fallback

  const name = safeText((value as any).name, fallback.name)
  const options = (value as any).options && typeof (value as any).options === 'object'
    ? (value as any).options
    : fallback.options
  const action = String((value as any).action ?? fallback.action ?? '').trim() || undefined
  const modelKey = String((value as any).modelKey ?? fallback.modelKey ?? '').trim() || undefined

  return {
    name,
    options,
    action,
    modelKey,
  }
}

const resolveTaxonomyActions = (model: ModelManagerModel, taxonomyKey: string) => {
  const fallbackPrefix = `${model.modelKey}.${taxonomyKey}`
  const fromModel = model.taxonomies.find(entry => normalizeModelKey(entry.key) === normalizeModelKey(taxonomyKey))
  if (fromModel) return fromModel.actions
  return {
    getTerms: `${fallbackPrefix}.getTerms`,
    getRecordTerms: `${fallbackPrefix}.getRecordTerms`,
    attach: `${fallbackPrefix}.attach`,
    detach: `${fallbackPrefix}.detach`,
    addTerm: `${fallbackPrefix}.addTerm`,
  }
}

const resolveSubtableActions = (model: ModelManagerModel, subtableKey: string) => {
  const fallbackPrefix = `${model.modelKey}.subtables.${subtableKey}`
  const fromModel = model.subtables.find(entry => normalizeModelKey(entry.key) === normalizeModelKey(subtableKey))
  if (fromModel) return fromModel.actions
  return {
    create: `${fallbackPrefix}.create`,
    update: `${fallbackPrefix}.update`,
    delete: `${fallbackPrefix}.delete`,
    get: `${fallbackPrefix}.get`,
    list: `${fallbackPrefix}.list`,
  }
}

const defaultBindingForField = (
  model: ModelManagerModel,
  fieldName: string,
  action: string,
): ModelUIFieldBindingModel => {
  return {
    kind: 'model',
    action: action || `${model.modelKey}.update`,
    payloadKey: fieldName,
  }
}

const normalizeBinding = (
  value: unknown,
  model: ModelManagerModel,
  fieldName: string,
  action: string,
): ModelUIFieldBinding => {
  const fallback = defaultBindingForField(model, fieldName, action)
  if (!value || typeof value !== 'object') return fallback

  const kind = String((value as any).kind ?? '').trim().toLowerCase()
  if (kind === 'taxonomy') {
    const taxonomyKey = normalizeModelKey(String((value as any).taxonomyKey ?? fieldName).trim()) || fieldName
    const actionsRaw = (value as any).actions
    const inferredActions = resolveTaxonomyActions(model, taxonomyKey)
    const actions = {
      getTerms: String(actionsRaw?.getTerms ?? inferredActions.getTerms).trim(),
      getRecordTerms: String(actionsRaw?.getRecordTerms ?? inferredActions.getRecordTerms).trim(),
      attach: String(actionsRaw?.attach ?? inferredActions.attach).trim(),
      detach: String(actionsRaw?.detach ?? inferredActions.detach).trim(),
      addTerm: String(actionsRaw?.addTerm ?? inferredActions.addTerm ?? '').trim() || undefined,
    }
    return {
      kind: 'taxonomy',
      taxonomyKey,
      valueMode: 'termIds',
      actions,
    }
  }

  if (kind === 'subtable') {
    const subtableKeyRaw = String((value as any).subtableKey ?? '').trim()
    const subtableKey = subtableKeyRaw || fieldName
    const actionFromValue = String((value as any).action ?? '').trim()
    const payloadKey = String((value as any).payloadKey ?? fieldName).trim() || fieldName
    const inferred = resolveSubtableActions(model, subtableKey)
    return {
      kind: 'subtable',
      subtableKey,
      action: actionFromValue || inferred.update,
      payloadKey,
    }
  }

  if (kind === 'custom') {
    const handler = String((value as any).handler ?? '').trim()
    return {
      kind: 'custom',
      handler: handler || `${model.modelKey}.custom.${fieldName}`,
    }
  }

  return {
    kind: 'model',
    action: String((value as any).action ?? action).trim() || `${model.modelKey}.update`,
    payloadKey: String((value as any).payloadKey ?? fieldName).trim() || fieldName,
  }
}

const normalizeFieldSpec = (
  value: unknown,
  model: ModelManagerModel,
  index: number,
): ModelUIFieldSpec => {
  const fallbackField = model.fields.find((field) => !isIgnorableField(field)) ?? `field-${index + 1}`
  const fallbackFieldId = slugify(fallbackField, `field-${index + 1}`)
  const fallbackComponent = componentFromField(model.modelKey, fallbackField)
  const fallbackAction = String(fallbackComponent.action ?? `${model.modelKey}.update`).trim()

  if (!value || typeof value !== 'object') {
    return {
      id: fallbackFieldId,
      field: fallbackField,
      label: titleCase(fallbackField),
      component: fallbackComponent,
      action: fallbackAction,
      binding: defaultBindingForField(model, fallbackField, fallbackAction),
      modelKey: fallbackField,
      validation: {},
    }
  }

  const fieldName = safeText((value as any).field, fallbackField)
  const id = slugify(safeText((value as any).id, fieldName), fallbackFieldId)
  const label = safeText((value as any).label, titleCase(fieldName))
  const baseComponent = componentFromField(model.modelKey, fieldName)
  const resolvedAction = String((value as any).action ?? baseComponent.action ?? '').trim() || `${model.modelKey}.update`

  return {
    id,
    field: fieldName,
    label,
    component: normalizeComponent((value as any).component, baseComponent),
    action: resolvedAction,
    binding: normalizeBinding((value as any).binding, model, fieldName, resolvedAction),
    modelKey: String((value as any).modelKey ?? fieldName).trim(),
    validation: (value as any).validation && typeof (value as any).validation === 'object'
      ? (value as any).validation
      : {},
    class: String((value as any).class ?? '').trim() || undefined,
    meta: safeMetaObject((value as any).meta),
  }
}

const defaultWidgetLayout = (fields: ModelUIFieldSpec[]): ModelUIFieldLayoutSpec => {
  return {
    rows: [
      {
        id: 'row-1',
        name: 'Row 1',
        class: '',
        columns: [
          {
            id: 'col-1',
            class: '',
            fieldIds: fields.map((field) => field.id),
          },
        ],
      },
    ],
  }
}

const normalizeWidgetLayout = (
  value: unknown,
  fields: ModelUIFieldSpec[],
): ModelUIFieldLayoutSpec => {
  const fallback = defaultWidgetLayout(fields)
  const fieldIds = new Set(fields.map((field) => field.id))
  const rawRows = Array.isArray((value as any)?.rows)
    ? (value as any).rows
    : Array.isArray(value)
      ? value
      : []

  if (!rawRows.length) return fallback

  const rows: ModelUIFieldLayoutRowSpec[] = rawRows.map((rawRow: any, rowIndex: number) => {
    const rowId = slugify(
      safeText(rawRow?.id, `row-${rowIndex + 1}`),
      `row-${rowIndex + 1}`,
    )
    const rawColumns = Array.isArray(rawRow?.columns) ? rawRow.columns : []
    const columns: ModelUIFieldLayoutColumnSpec[] = rawColumns.map((rawColumn: any, colIndex: number) => {
      const columnId = slugify(
        safeText(rawColumn?.id, `${rowId}-col-${colIndex + 1}`),
        `${rowId}-col-${colIndex + 1}`,
      )
      const fieldIdValues = Array.isArray(rawColumn?.fieldIds)
        ? rawColumn.fieldIds
        : Array.isArray(rawColumn?.fields)
          ? rawColumn.fields.map((entry: any) => entry?.id ?? entry)
          : []
      const fieldIdList = fieldIdValues
        .map((entry: any) => String(entry ?? '').trim())
        .filter((id: string) => id.length > 0 && fieldIds.has(id))
      return {
        id: columnId,
        class: String(rawColumn?.class ?? '').trim() || undefined,
        fieldIds: ensureUnique(fieldIdList),
      }
    })

    return {
      id: rowId,
      name: String(rawRow?.name ?? '').trim() || undefined,
      class: String(rawRow?.class ?? '').trim() || undefined,
      columns: columns.length
        ? columns
        : [{
            id: `${rowId}-col-1`,
            class: '',
            fieldIds: [],
          }],
    }
  })

  const consumed = new Set<string>()
  for (const row of rows) {
    for (const col of row.columns) {
      col.fieldIds = col.fieldIds.filter((id) => {
        if (consumed.has(id)) return false
        consumed.add(id)
        return true
      })
    }
  }

  const missing = fields
    .map((field) => field.id)
    .filter((id) => !consumed.has(id))
  if (missing.length) {
    rows[0]!.columns[0]!.fieldIds.push(...missing)
  }

  return {
    rows,
  }
}

const normalizeWidgetSpec = (
  value: unknown,
  model: ModelManagerModel,
  index: number,
): ModelUIWidgetSpec => {
  const fallbackId = `widget-${index + 1}`

  if (!value || typeof value !== 'object') {
    return {
      id: fallbackId,
      type: 'fields-card',
      name: `card-${index + 1}`,
      label: `Card ${index + 1}`,
      fields: [],
    }
  }

  const id = slugify(safeText((value as any).id, fallbackId), fallbackId)
  const type = safeText((value as any).type, 'fields-card') === 'widget' ? 'widget' : 'fields-card'
  const label = safeText((value as any).label ?? (value as any).title, `Card ${index + 1}`)
  const name = slugify(safeText((value as any).name, label), `card-${index + 1}`)
  const fieldsRaw = Array.isArray((value as any).fields) ? (value as any).fields : []
  const fields = fieldsRaw.map((field, fieldIndex) => normalizeFieldSpec(field, model, fieldIndex))
  const layout = type === 'fields-card'
    ? normalizeWidgetLayout((value as any).layout, fields)
    : undefined

  return {
    id,
    type,
    name,
    label,
    subtitle: String((value as any).subtitle ?? '').trim() || undefined,
    class: String((value as any).class ?? '').trim() || undefined,
    saveLabel: String((value as any).saveLabel ?? '').trim() || undefined,
    action: String((value as any).action ?? `${model.modelKey}.update`).trim() || undefined,
    fields,
    layout,
    meta: safeMetaObject((value as any).meta),
  }
}

const normalizeColumnSpec = (
  value: unknown,
  model: ModelManagerModel,
  index: number,
): ModelUIColumnSpec => {
  const fallbackId = `column-${index + 1}`

  if (!value || typeof value !== 'object') {
    return {
      id: fallbackId,
      name: `Column ${index + 1}`,
      class: '',
      primary: [],
    }
  }

  const id = slugify(safeText((value as any).id, fallbackId), fallbackId)
  const name = safeText((value as any).name, `Column ${index + 1}`)
  const primaryRaw = Array.isArray((value as any).primary)
    ? (value as any).primary
    : Array.isArray((value as any).widgets)
      ? (value as any).widgets
      : []

  return {
    id,
    name,
    class: String((value as any).class ?? '').trim() || undefined,
    primary: primaryRaw.map((widget, widgetIndex) => normalizeWidgetSpec(widget, model, widgetIndex)),
    meta: safeMetaObject((value as any).meta),
  }
}

const normalizeRowSpec = (
  value: unknown,
  model: ModelManagerModel,
  index: number,
): ModelUIRowSpec => {
  const fallbackId = `row-${index + 1}`

  if (!value || typeof value !== 'object') {
    return {
      id: fallbackId,
      name: `Row ${index + 1}`,
      class: '',
      columns: [],
    }
  }

  const id = slugify(safeText((value as any).id, fallbackId), fallbackId)
  const name = safeText((value as any).name, `Row ${index + 1}`)
  const columnsRaw = Array.isArray((value as any).columns)
    ? (value as any).columns
    : Array.isArray((value as any).primary)
      ? (value as any).primary
      : []

  return {
    id,
    name,
    class: String((value as any).class ?? '').trim() || undefined,
    columns: columnsRaw.map((column, colIndex) => normalizeColumnSpec(column, model, colIndex)),
    meta: safeMetaObject((value as any).meta),
  }
}

const normalizeTabSpec = (
  value: unknown,
  model: ModelManagerModel,
  index: number,
): ModelUITabSpec => {
  const fallbackLabel = `Tab ${index + 1}`

  if (!value || typeof value !== 'object') {
    const id = `tab-${index + 1}`
    return {
      id,
      slug: id,
      label: fallbackLabel,
      primary: [],
    }
  }

  const rawLabel = safeText((value as any).label, fallbackLabel)
  const id = slugify(safeText((value as any).id, rawLabel), `tab-${index + 1}`)
  const slug = slugify(safeText((value as any).slug, id), id)
  const rowsRaw = Array.isArray((value as any).primary)
    ? (value as any).primary
    : Array.isArray((value as any).content)
      ? (value as any).content
      : []

  return {
    id,
    slug,
    label: rawLabel,
    primary: rowsRaw.map((row, rowIndex) => normalizeRowSpec(row, model, rowIndex)),
    meta: safeMetaObject((value as any).meta),
  }
}

const defaultDirectoryListingFields = (model: ModelManagerModel): DirectoryListingFieldSpec[] => {
  const fieldSet = new Set<string>()
  const fields: DirectoryListingFieldSpec[] = []

  const pushField = (key: string, label?: string) => {
    const normalized = String(key || '').trim()
    if (!normalized || fieldSet.has(normalized)) return
    fieldSet.add(normalized)
    fields.push({
      key: normalized,
      label: safeText(label, titleCase(normalized)),
    })
  }

  pushField('rid', 'Record ID')

  const titleField = model.fields.find((field) => ['title', 'name', 'label', 'headline'].includes(field.toLowerCase()))
  if (titleField) pushField(titleField, titleCase(titleField))

  const statusField = model.fields.find((field) => field.toLowerCase().includes('status'))
  if (statusField) pushField(statusField, titleCase(statusField))

  const ownerField = model.fields.find((field) => ['owner', 'user', 'author'].some((key) => field.toLowerCase().includes(key)))
  if (ownerField) pushField(ownerField, titleCase(ownerField))

  const updatedField = model.fields.find((field) => field.toLowerCase().includes('updated'))
  if (updatedField) pushField(updatedField, titleCase(updatedField))

  if (fields.length < 4) {
    for (const field of model.fields) {
      if (isIgnorableField(field)) continue
      pushField(field, titleCase(field))
      if (fields.length >= 6) break
    }
  }

  return fields
}

const defaultDirectoryFilters = (model: ModelManagerModel): DirectoryFilterSpec[] => {
  const fallbackFilterFields = model.typesenseFields.length
    ? model.typesenseFields
    : model.fields.filter((field) => !isIgnorableField(field)).slice(0, 3)

  return fallbackFilterFields.slice(0, 4).map((field) => ({
    key: field,
    label: titleCase(field),
    component: {
      name: 'ACombobox',
      options: {
        grouped: false,
        highlightMatch: false,
        multiple: false,
        clearable: true,
        showIndicator: true,
      },
    },
  }))
}

const defaultCreateFields = (model: ModelManagerModel): ModelUIFieldSpec[] => {
  const editable = model.fields.filter((field) => !isIgnorableField(field))
  const required = model.requiredFields.filter((field) => !isIgnorableField(field))
  const ordered = ensureUnique([...required, ...editable])
  const minimumCount = Math.max(required.length, 5)
  const selected = ordered.slice(0, minimumCount)

  return selected.map((field, index) => ({
    id: slugify(field, `create-${index + 1}`),
    field,
    label: titleCase(field),
    component: componentFromField(model.modelKey, field),
    action: `${model.modelKey}.create`,
    binding: defaultBindingForField(model, field, `${model.modelKey}.create`),
    modelKey: field,
    validation: {},
  }))
}

const defaultSingleFields = (model: ModelManagerModel): ModelUIFieldSpec[] => {
  const editable = model.fields.filter((field) => !isIgnorableField(field))
  const selected = editable.slice(0, 8)

  return selected.map((field, index) => ({
    id: slugify(field, `field-${index + 1}`),
    field,
    label: titleCase(field),
    component: componentFromField(model.modelKey, field),
    action: `${model.modelKey}.update`,
    binding: defaultBindingForField(model, field, `${model.modelKey}.update`),
    modelKey: field,
    validation: {},
  }))
}

export const resolveModelManagerPaths = (cwd = process.cwd()) => {
  const graphCandidates = ensureUnique([
    resolve(cwd, 'apps/schema/config/graph.mpdg'),
    resolve(cwd, '../schema/config/graph.mpdg'),
    resolve(cwd, '../apps/schema/config/graph.mpdg'),
    resolve(cwd, '../../apps/schema/config/graph.mpdg'),
  ])

  const fragmentsDir = resolve(cwd, 'app/helios/fragments/models')
  const generatedDir = resolve(cwd, 'app/helios/generated/models')
  const pagesDir = resolve(cwd, 'app/pages')

  return {
    graphCandidates,
    fragmentsDir,
    generatedDir,
    pagesDir,
    fragmentFile: (modelKey: string) => resolve(fragmentsDir, `${modelKey}.ui.yaml`),
    generatedFile: (modelKey: string) => resolve(generatedDir, `${modelKey}.ui.json`),
  }
}

type GeneratedModelManifestEntry = {
  key: string
  table: string
  dataMode: ModelDataMode
  normalizedKey: string
  normalizedTable: string
}

type GeneratedAdminManifestEntry = {
  key: string
  table: string
  dataMode: ModelDataMode
  capabilities: string[]
  hasTypesense: boolean
  typesenseCollection: string | null
  typesenseFields: string[]
  taxonomyKeys: string[]
  subtableKeys: string[]
  taxonomies: Array<{
    key: string
    actions: ModelManagerModel['taxonomies'][number]['actions']
  }>
  subtables: Array<{
    key: string
    actions: ModelManagerModel['subtables'][number]['actions']
  }>
  fields: string[]
  requiredFields: string[]
  normalizedKey: string
  normalizedTable: string
}

type GeneratedAdminManifestDocument = {
  version?: number
  generatedAt?: string
  models?: Record<string, any>
}

const resolveGeneratedAdminManifestFile = async (cwd = process.cwd()) => {
  const candidates = ensureUnique(
    GENERATED_ADMIN_MANIFEST_FILES.map(candidate => resolve(cwd, candidate)),
  )

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }

  return null
}

const normalizeGeneratedTaxonomyActions = (
  value: unknown,
  modelKey: string,
  taxonomyKey: string,
): ModelManagerModel['taxonomies'][number]['actions'] => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const fallbackPrefix = `${modelKey}.${taxonomyKey}`

  return {
    getTerms: String(source.getTerms ?? `${fallbackPrefix}.getTerms`).trim() || `${fallbackPrefix}.getTerms`,
    getRecordTerms: String(source.getRecordTerms ?? `${fallbackPrefix}.getRecordTerms`).trim() || `${fallbackPrefix}.getRecordTerms`,
    attach: String(source.attach ?? `${fallbackPrefix}.attach`).trim() || `${fallbackPrefix}.attach`,
    detach: String(source.detach ?? `${fallbackPrefix}.detach`).trim() || `${fallbackPrefix}.detach`,
    addTerm: String(source.addTerm ?? `${fallbackPrefix}.addTerm`).trim() || `${fallbackPrefix}.addTerm`,
  }
}

const normalizeGeneratedSubtableActions = (
  value: unknown,
  modelKey: string,
  subtableKey: string,
): ModelManagerModel['subtables'][number]['actions'] => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const fallbackPrefix = `${modelKey}.subtables.${subtableKey}`

  return {
    create: String(source.create ?? `${fallbackPrefix}.create`).trim() || `${fallbackPrefix}.create`,
    update: String(source.update ?? `${fallbackPrefix}.update`).trim() || `${fallbackPrefix}.update`,
    delete: String(source.delete ?? `${fallbackPrefix}.delete`).trim() || `${fallbackPrefix}.delete`,
    get: String(source.get ?? `${fallbackPrefix}.get`).trim() || `${fallbackPrefix}.get`,
    list: String(source.list ?? `${fallbackPrefix}.list`).trim() || `${fallbackPrefix}.list`,
  }
}

const loadGeneratedAdminManifest = async (
  cwd = process.cwd(),
): Promise<GeneratedAdminManifestEntry[]> => {
  const manifestFile = await resolveGeneratedAdminManifestFile(cwd)
  if (!manifestFile) return []

  const source = await readJsonFile<GeneratedAdminManifestDocument>(manifestFile)
  if (!source || !source.models || typeof source.models !== 'object' || Array.isArray(source.models)) {
    return []
  }

  const entries: GeneratedAdminManifestEntry[] = []

  for (const [entryKey, value] of Object.entries(source.models)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const modelValue = value as Record<string, any>
    const key = normalizeModelKey(String(modelValue.key ?? entryKey))
    const table = normalizeModelKey(String(modelValue.table ?? ''))
    if (!key || !table) continue

    const dataModeRaw = String(modelValue.data ?? modelValue.dataMode ?? '').trim().toLowerCase()
    const dataMode: ModelDataMode = dataModeRaw === 'remote' ? 'remote' : 'local'

    const fields = ensureUnique(safeArray(modelValue.fields).map(normalizeModelKey).filter(Boolean))
    const requiredFields = ensureUnique(safeArray(modelValue.requiredFields).map(normalizeModelKey).filter(Boolean))
    const capabilities = ensureUnique(safeArray(modelValue.capabilities).map(normalizeModelKey).filter(Boolean))

    const typesenseRaw = modelValue.typesense && typeof modelValue.typesense === 'object'
      ? modelValue.typesense as Record<string, any>
      : {}
    const hasTypesense = Boolean(typesenseRaw.enabled ?? modelValue.hasTypesense)
    const typesenseCollectionRaw = String(
      typesenseRaw.collection ?? modelValue.typesenseCollection ?? '',
    ).trim()
    const typesenseCollection = hasTypesense ? (typesenseCollectionRaw || table) : null
    const typesenseFields = ensureUnique(
      safeArray(typesenseRaw.fields ?? modelValue.typesenseFields)
        .map(normalizeModelKey)
        .filter(Boolean),
    )

    const taxonomyKeys = ensureUnique(
      safeArray(modelValue.taxonomyKeys).map(normalizeModelKey).filter(Boolean),
    )
    const subtableKeys = ensureUnique(
      safeArray(modelValue.subtableKeys).map(toCamelCase).filter(Boolean),
    )

    const taxonomyMap = new Map<string, {
      key: string
      actions: ModelManagerModel['taxonomies'][number]['actions']
    }>()
    const taxonomiesRaw = Array.isArray(modelValue.taxonomies) ? modelValue.taxonomies : []
    for (const entry of taxonomiesRaw) {
      if (!entry || typeof entry !== 'object') continue
      const taxonomyKey = normalizeModelKey(String((entry as any).key ?? ''))
      if (!taxonomyKey) continue
      taxonomyMap.set(taxonomyKey, {
        key: taxonomyKey,
        actions: normalizeGeneratedTaxonomyActions((entry as any).actions, key, taxonomyKey),
      })
    }
    for (const taxonomyKey of taxonomyKeys) {
      if (taxonomyMap.has(taxonomyKey)) continue
      taxonomyMap.set(taxonomyKey, {
        key: taxonomyKey,
        actions: normalizeGeneratedTaxonomyActions(undefined, key, taxonomyKey),
      })
    }

    const subtableMap = new Map<string, {
      key: string
      actions: ModelManagerModel['subtables'][number]['actions']
    }>()
    const subtablesRaw = Array.isArray(modelValue.subtables) ? modelValue.subtables : []
    for (const entry of subtablesRaw) {
      if (!entry || typeof entry !== 'object') continue
      const subtableKey = toCamelCase((entry as any).key ?? '')
      if (!subtableKey) continue
      subtableMap.set(subtableKey, {
        key: subtableKey,
        actions: normalizeGeneratedSubtableActions((entry as any).actions, key, subtableKey),
      })
    }
    for (const subtableKey of subtableKeys) {
      if (subtableMap.has(subtableKey)) continue
      subtableMap.set(subtableKey, {
        key: subtableKey,
        actions: normalizeGeneratedSubtableActions(undefined, key, subtableKey),
      })
    }

    entries.push({
      key,
      table,
      dataMode,
      capabilities,
      hasTypesense,
      typesenseCollection,
      typesenseFields,
      taxonomyKeys: ensureUnique([
        ...taxonomyKeys,
        ...Array.from(taxonomyMap.keys()),
      ]),
      subtableKeys: ensureUnique([
        ...subtableKeys,
        ...Array.from(subtableMap.keys()),
      ]),
      taxonomies: Array.from(taxonomyMap.values()),
      subtables: Array.from(subtableMap.values()),
      fields,
      requiredFields,
      normalizedKey: normalizeModelKey(key),
      normalizedTable: normalizeModelKey(table),
    })
  }

  return entries
}

const resolveGeneratedModelsManifestFile = async (cwd = process.cwd()) => {
  const candidates = ensureUnique([
    resolve(cwd, 'modules/schema-kit/runtime/generated/models.ts'),
    resolve(cwd, './modules/schema-kit/runtime/generated/models.ts'),
  ])

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate
  }

  return null
}

const loadGeneratedModelManifest = async (
  cwd = process.cwd(),
): Promise<GeneratedModelManifestEntry[]> => {
  const manifestFile = await resolveGeneratedModelsManifestFile(cwd)
  if (!manifestFile) return []

  const source = await readTextFile(manifestFile)
  if (!source) return []

  const blockMatch = source.match(GENERATED_MODELS_BLOCK_RE)
  if (!blockMatch) return []

  const entries: GeneratedModelManifestEntry[] = []
  const block = blockMatch[1]
  let match: RegExpExecArray | null

  while ((match = GENERATED_MODELS_ENTRY_RE.exec(block))) {
    const key = String(match[1] ?? '').trim()
    const table = String(match[2] ?? '').trim()
    const dataModeRaw = String(match[3] ?? '').trim().toLowerCase()
    if (!key || !table) continue

    entries.push({
      key,
      table,
      dataMode: dataModeRaw === 'remote' ? 'remote' : 'local',
      normalizedKey: normalizeModelKey(key),
      normalizedTable: normalizeModelKey(table),
    })
  }

  return entries
}

const resolveGraphFile = async (cwd = process.cwd()) => {
  const { graphCandidates } = resolveModelManagerPaths(cwd)

  for (const candidate of graphCandidates) {
    if (await fileExists(candidate)) return candidate
  }

  throw new Error(
    `Could not find schema graph.mpdg. Checked: ${graphCandidates.join(', ')}`,
  )
}

const parseCapabilityTokens = (line: string): string[] => {
  const withoutComments = line.split('#')[0] ?? ''

  return withoutComments
    .split(',')
    .map((token) =>
      token
        .replace(/[\[\]{}()]/g, '')
        .replace(/:+$/g, '')
        .trim()
        .toLowerCase(),
    )
    .filter((token) => token.length > 0)
    .filter((token) => token !== 'typesense')
    .filter((token) => CAPABILITY_TOKEN_RE.test(token))
}

const parseGraphModels = (source: string): InternalModel[] => {
  const lines = source.split(/\r?\n/)
  const parsed: InternalModel[] = []

  let current: InternalModel | null = null
  let inFields = false
  let inCapabilities = false
  let inTypesense = false
  let inTaxonomies = false

  const flushCurrent = () => {
    if (!current) return
    current.fields = ensureUnique(current.fields)
    current.requiredFields = ensureUnique(current.requiredFields)
    current.capabilities = ensureUnique(current.capabilities)
    current.typesenseFields = ensureUnique(current.typesenseFields)
    current.taxonomyKeys = ensureUnique(current.taxonomyKeys)
    current.subtableKeys = ensureUnique(current.subtableKeys)
    current.taxonomies = ensureUnique(current.taxonomyKeys).map((key) => {
      const prefix = `${current!.modelKey}.${key}`
      return {
        key,
        actions: {
          getTerms: `${prefix}.getTerms`,
          getRecordTerms: `${prefix}.getRecordTerms`,
          attach: `${prefix}.attach`,
          detach: `${prefix}.detach`,
          addTerm: `${prefix}.addTerm`,
        },
      }
    })
    current.subtables = ensureUnique(current.subtableKeys).map((key) => {
      const prefix = `${current!.modelKey}.subtables.${key}`
      return {
        key,
        actions: {
          create: `${prefix}.create`,
          update: `${prefix}.update`,
          delete: `${prefix}.delete`,
          get: `${prefix}.get`,
          list: `${prefix}.list`,
        },
      }
    })
    current.canManage = true
    parsed.push(current)
    current = null
    inFields = false
    inCapabilities = false
    inTypesense = false
    inTaxonomies = false
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // A model header is the top stanza line, which always includes a fields `{` block.
    // This prevents capability rows like `crud, router` from being mis-read as models.
    const headerMatch = line.includes('{') ? line.match(MODEL_HEADER_RE) : null
    if (headerMatch) {
      flushCurrent()

      const [, modelNameRaw = '', tableRaw = ''] = headerMatch
      const modelKey = normalizeModelKey(tableRaw || modelNameRaw)
      const table = normalizeModelKey(tableRaw || modelNameRaw)
      const label = titleCase(modelNameRaw || tableRaw || 'Model')

      current = {
        modelKey,
        routerKey: modelKey,
        table,
        label,
        directoryRoute: `/admin/${table}`,
        dataMode: 'local',
        capabilities: [],
        hasTypesense: false,
        typesenseCollection: null,
        typesenseFields: [],
        taxonomyKeys: [],
        subtableKeys: [],
        taxonomies: [],
        subtables: [],
        fields: [],
        requiredFields: [],
        canManage: false,
      }

      inFields = line.includes('{')
      inCapabilities = false
      inTypesense = false
      inTaxonomies = false
      continue
    }

    if (!current) continue

    if (inFields) {
      if (trimmed.includes('}')) {
        inFields = false
      }
      const fieldMatch = line.match(FIELD_RE)
      if (fieldMatch) {
        const field = normalizeModelKey(fieldMatch[1] ?? '')
        if (field) {
          current.fields.push(field)
          if (fieldMatch[2] === '!') current.requiredFields.push(field)
        }
      }
      const subtableMatch = line.match(SUBTABLE_FIELD_RE)
      if (subtableMatch?.[2]) {
        const subtableModel = normalizeModelKey(String(subtableMatch[2] ?? ''))
        if (subtableModel) {
          current.subtableKeys.push(toCamelCase(subtableModel))
        }
      }
      if (trimmed.includes('[')) {
        inCapabilities = true
      }
      continue
    }

    if (!inCapabilities && trimmed.includes('[')) {
      inCapabilities = true
    }

    if (inCapabilities) {
      const fnMatch = line.match(TYPESENSE_FN_RE)
      const modeMatch = line.match(/instance\s*<\s*(local|remote)\s*>/i)
      if (modeMatch?.[1]) {
        current.dataMode = String(modeMatch[1]).toLowerCase() === 'remote' ? 'remote' : 'local'
      }

      const taxonomyStart = /^\s*taxonomies\s*:?\s*$/i.test(trimmed)
      if (taxonomyStart) {
        inTaxonomies = true
      }

      if (inTaxonomies) {
        const taxonomyEntryMatch = line.match(/,\s*([A-Za-z_][\w-]*)/)
        if (taxonomyEntryMatch?.[1]) {
          const taxonomyKey = normalizeModelKey(taxonomyEntryMatch[1])
          if (taxonomyKey) current.taxonomyKeys.push(taxonomyKey)
        }

        const taxonomyExit =
          TYPESENSE_RE.test(line)
          || trimmed.startsWith(']')
          || /^[a-z][a-z0-9_-]*,?\s*$/i.test(trimmed)
        if (taxonomyExit) {
          inTaxonomies = false
        }
      }

      if (TYPESENSE_RE.test(line)) {
        inTypesense = true
        current.hasTypesense = true
      }
      else if (fnMatch) {
        inTypesense = true
        current.hasTypesense = true
        current.typesenseCollection = normalizeModelKey(fnMatch[1] ?? current.table)
        const args = String(fnMatch[2] ?? '')
          .split(',')
          .map((entry) => normalizeModelKey(entry))
          .filter(Boolean)
        current.typesenseFields.push(...args)
      }
      else if (!inTypesense) {
        current.capabilities.push(...parseCapabilityTokens(line))
      }

      if (trimmed.startsWith(']')) {
        inCapabilities = false
        inTypesense = false
        inTaxonomies = false
      }
      continue
    }
  }

  flushCurrent()

  const deduped = new Map<string, InternalModel>()
  for (const model of parsed) {
    if (!model.modelKey) continue
    if (!deduped.has(model.modelKey)) deduped.set(model.modelKey, model)
  }

  return Array.from(deduped.values()).sort((a, b) => a.modelKey.localeCompare(b.modelKey))
}

export const listModelManagerModels = async (cwd = process.cwd()): Promise<ModelManagerModel[]> => {
  const generatedAdminManifest = await loadGeneratedAdminManifest(cwd)
  const baseModels: InternalModel[] = generatedAdminManifest.length
    ? generatedAdminManifest.map((entry) => {
        const modelKey = normalizeModelKey(entry.table)
        const routerKey = normalizeModelKey(entry.key || modelKey) || modelKey
        const label = titleCase(entry.key || entry.table)

        return {
          modelKey,
          routerKey,
          table: modelKey,
          label,
          directoryRoute: `/admin/${modelKey}`,
          dataMode: entry.dataMode,
          capabilities: ensureUnique(entry.capabilities),
          hasTypesense: Boolean(entry.hasTypesense),
          typesenseCollection: entry.typesenseCollection,
          typesenseFields: ensureUnique(entry.typesenseFields),
          taxonomyKeys: ensureUnique(entry.taxonomyKeys),
          subtableKeys: ensureUnique(entry.subtableKeys),
          taxonomies: entry.taxonomies,
          subtables: entry.subtables,
          fields: ensureUnique(entry.fields),
          requiredFields: ensureUnique(entry.requiredFields),
          canManage: true,
        }
      })
    : await (async () => {
        const graphFile = await resolveGraphFile(cwd)
        const source = await fs.readFile(graphFile, 'utf-8')
        return parseGraphModels(source)
      })()
  const { fragmentFile, generatedFile } = resolveModelManagerPaths(cwd)
  const generatedManifest = generatedAdminManifest.length
    ? []
    : await loadGeneratedModelManifest(cwd)
  const generatedByTable = new Map(
    generatedManifest.map(entry => [entry.normalizedTable, entry]),
  )
  const manifestIsAvailable = generatedManifest.length > 0

  const enriched = await Promise.all(
    baseModels.map(async (model) => {
      const generatedEntry = generatedByTable.get(model.table)
      if (manifestIsAvailable && !generatedEntry) return null

      const routerKey = generatedEntry?.key || model.routerKey || model.modelKey
      const fragmentPath = fragmentFile(model.modelKey)
      const hasFragment = await fileExists(fragmentPath)
      const rawSpec = hasFragment
        ? await readYamlFile<ModelLayoutSpec>(fragmentPath)
        : null

      const routeFromSpec = String(rawSpec?.directory?.route ?? '').trim()
      const directoryRoute = normalizeRoutePath(
        routeFromSpec || model.directoryRoute || `/admin/${model.table}`,
        `/admin/${model.table}`,
      )

      return {
        ...model,
        routerKey,
        dataMode: generatedEntry?.dataMode ?? model.dataMode ?? 'local',
        canManage: true,
        directoryRoute,
        hasFragment,
        hasGenerated: await fileExists(generatedFile(model.modelKey)),
      }
    }),
  )

  return enriched
    .filter((entry): entry is ModelManagerModel => Boolean(entry))
    .sort((a, b) => a.modelKey.localeCompare(b.modelKey))
}

export const findModelManagerModel = (
  models: ModelManagerModel[],
  modelParam: string,
) => {
  const normalized = normalizeModelKey(modelParam)
  return models.find((entry) => {
    return (
      entry.modelKey === normalized ||
      entry.table === normalized ||
      normalizeModelKey(entry.routerKey) === normalized
    )
  }) ?? null
}

export const createDefaultModelSpec = (model: ModelManagerModel): ModelLayoutSpec => {
  const directoryFields = defaultDirectoryListingFields(model)
  const directoryFilters = defaultDirectoryFilters(model)
  const createFields = defaultCreateFields(model)
  const singleFields = defaultSingleFields(model)

  const title = `${model.label} Overview`
  const description = `Search, filter and manage ${model.label.toLowerCase()} records.`

  return {
    version: 3,
    kind: 'helios-model-ui',
    model: model.modelKey,
    table: model.table,
    label: model.label,
    updatedAt: new Date().toISOString(),
    directory: {
      enabled: true,
      route: normalizeRoutePath(model.directoryRoute || `/admin/${model.table}`, `/admin/${model.table}`),
      slugPolicy: 'rid',
      title,
      description,
      typesense: {
        enabled: model.hasTypesense,
        collection: model.typesenseCollection ?? model.table,
        queryBy: model.typesenseFields.length ? model.typesenseFields.slice(0, 4) : directoryFields.map((field) => field.key).slice(0, 3),
        sortableFields: model.typesenseFields.filter((field) => field.includes('updated') || field.includes('created')).slice(0, 4),
        filters: directoryFilters.map((entry) => entry.key),
      },
      listing: {
        fields: directoryFields,
        filters: directoryFilters,
      },
      createDialog: {
        enabled: true,
        action: `${model.modelKey}.create`,
        title: `Create ${model.label}`,
        submitLabel: `Create ${model.label}`,
        required: model.requiredFields.length
          ? model.requiredFields.filter((field) => createFields.some((entry) => entry.field === field))
          : createFields.map((field) => field.field).slice(0, 2),
        fields: createFields,
      },
    },
    single: {
      global: {
        enablePostStatus: false,
        enableInstanceManagement: false,
        showHeader: true,
      },
      tabs: [
        {
          id: 'general',
          slug: 'general',
          label: 'General',
          primary: [
            {
              id: `${model.modelKey}-row-1`,
              name: 'Row 1',
              class: '',
              columns: [
                {
                  id: `${model.modelKey}-col-main`,
                  name: 'Main',
                  class: 'flex-[2]',
                  primary: [
                    {
                      id: `${model.modelKey}-card-general`,
                      type: 'fields-card',
                      name: 'general',
                      label: `${model.label} Details`,
                      subtitle: 'Primary model fields.',
                      action: `${model.modelKey}.update`,
                      saveLabel: 'Save Changes',
                      fields: singleFields,
                      layout: defaultWidgetLayout(singleFields),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  }
}

export const normalizeModelSpec = (
  value: unknown,
  model: ModelManagerModel,
): ModelLayoutSpec => {
  const fallback = createDefaultModelSpec(model)
  const source = (value ?? {}) as any

  const directory = source?.directory ?? {}
  const directoryTypesense = directory?.typesense ?? {}
  const directoryListing = directory?.listing ?? {}
  const directoryCreateDialog = directory?.createDialog ?? {}
  const modelRequiredCreateKeys = model.requiredFields.filter((field) => !isIgnorableField(field))
  const requiredFromSpec = safeArray(directoryCreateDialog?.required)
    .filter((field) => !isIgnorableField(field))
  const requiredCreateKeys = ensureUnique([
    ...modelRequiredCreateKeys,
    ...requiredFromSpec,
  ])

  const normalizedCreateFieldsRaw = Array.isArray(directoryCreateDialog?.fields)
    ? directoryCreateDialog.fields
    : fallback.directory.createDialog.fields
  const normalizedCreateFields = normalizedCreateFieldsRaw.map((entry, index) => normalizeFieldSpec(entry, model, index))
  const createFieldKeys = new Set(
    normalizedCreateFields
      .map((field) => resolveFieldKey(field).toLowerCase())
      .filter((field) => field.length > 0),
  )

  for (const requiredField of requiredCreateKeys) {
    const normalizedKey = requiredField.toLowerCase()
    if (createFieldKeys.has(normalizedKey)) continue

    const component = componentFromField(model.modelKey, requiredField)
    normalizedCreateFields.push({
      id: slugify(requiredField, `create-${normalizedCreateFields.length + 1}`),
      field: requiredField,
      label: titleCase(requiredField),
      component,
      action: `${model.modelKey}.create`,
      binding: defaultBindingForField(model, requiredField, `${model.modelKey}.create`),
      modelKey: requiredField,
      validation: {},
    })
    createFieldKeys.add(normalizedKey)
  }

  const tabsRaw = Array.isArray(source?.single?.tabs)
    ? source.single.tabs
    : fallback.single.tabs
  const tabs = tabsRaw.map((entry, index) => normalizeTabSpec(entry, model, index))
  const tabsSafe = tabs.length ? tabs : fallback.single.tabs

  return {
    version: 3,
    kind: 'helios-model-ui',
    model: model.modelKey,
    table: model.table,
    label: safeText(source?.label, fallback.label),
    updatedAt: safeText(source?.updatedAt, fallback.updatedAt),
    directory: {
      enabled: Boolean(directory?.enabled ?? fallback.directory.enabled),
      route: normalizeRoutePath(directory?.route, fallback.directory.route),
      slugPolicy: ['rid', 'slug', 'id', 'custom'].includes(String(directory?.slugPolicy))
        ? (String(directory?.slugPolicy) as ModelLayoutSpec['directory']['slugPolicy'])
        : fallback.directory.slugPolicy,
      title: safeText(directory?.title, fallback.directory.title),
      description: safeText(directory?.description, fallback.directory.description),
      typesense: {
        enabled: Boolean(directoryTypesense?.enabled ?? fallback.directory.typesense.enabled),
        collection: safeText(directoryTypesense?.collection, fallback.directory.typesense.collection),
        queryBy: safeArray(directoryTypesense?.queryBy).length
          ? safeArray(directoryTypesense?.queryBy)
          : fallback.directory.typesense.queryBy,
        sortableFields: safeArray(directoryTypesense?.sortableFields).length
          ? safeArray(directoryTypesense?.sortableFields)
          : fallback.directory.typesense.sortableFields,
        filters: safeArray(directoryTypesense?.filters).length
          ? safeArray(directoryTypesense?.filters)
          : fallback.directory.typesense.filters,
      },
      listing: {
        fields: normalizeListingFields(directoryListing?.fields, fallback.directory.listing.fields),
        filters: normalizeFilterSpec(directoryListing?.filters, fallback.directory.listing.filters),
      },
      createDialog: {
        enabled: Boolean(directoryCreateDialog?.enabled ?? fallback.directory.createDialog.enabled),
        action: normalizeCreateDialogAction(
          directoryCreateDialog?.action,
          model.modelKey,
          String(fallback.directory.createDialog.action || '').split('.')[1] || 'create',
        ),
        title: safeText(directoryCreateDialog?.title, fallback.directory.createDialog.title),
        submitLabel: safeText(directoryCreateDialog?.submitLabel, fallback.directory.createDialog.submitLabel),
        required: requiredCreateKeys,
        fields: normalizedCreateFields,
      },
    },
    single: {
      global: {
        enablePostStatus: Boolean(source?.single?.global?.enablePostStatus ?? fallback.single.global.enablePostStatus),
        enableInstanceManagement: Boolean(source?.single?.global?.enableInstanceManagement ?? fallback.single.global.enableInstanceManagement),
        showHeader: Boolean(source?.single?.global?.showHeader ?? fallback.single.global.showHeader),
      },
      tabs: tabsSafe,
    },
  }
}

const readYamlFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return parseYaml(raw) as T
  }
  catch {
    return null
  }
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

type GeneratedRouteWriteResult = {
  filePath: string | null
  status: 'written' | 'unchanged' | 'skipped' | 'removed' | 'disabled'
  reason?: string
}

const resolveGeneratedRouteFiles = (routePath: string, cwd = process.cwd()) => {
  const normalizedRoute = normalizeRoutePath(routePath, '/')
  const segments = routeSegmentsFromPath(normalizedRoute)

  if (!segments.length) {
    throw new Error('Directory route "/" is not supported for generated model routes.')
  }

  const { pagesDir } = resolveModelManagerPaths(cwd)
  return {
    normalizedRoute,
    directory: resolve(pagesDir, ...segments, 'index.vue'),
    record: resolve(pagesDir, ...segments, '[rid].vue'),
  }
}

const renderDirectoryRoutePage = (modelKey: string, routePath: string) => [
  `<!-- ${GENERATED_ROUTE_MARKER} model=${modelKey} route=${routePath} page=directory -->`,
  '<script setup lang="ts">',
  `definePageMeta({ modelKey: '${modelKey}' })`,
  '</script>',
  '',
  '<template>',
  '  <AdminModelDirectoryPage />',
  '</template>',
  '',
].join('\n')

const renderRecordRoutePage = (modelKey: string, routePath: string) => [
  `<!-- ${GENERATED_ROUTE_MARKER} model=${modelKey} route=${routePath} page=record -->`,
  '<script setup lang="ts">',
  `definePageMeta({ modelKey: '${modelKey}' })`,
  '</script>',
  '',
  '<template>',
  '  <AdminModelRecordPage />',
  '</template>',
  '',
].join('\n')

const writeGeneratedRouteFile = async (
  filePath: string,
  source: string,
): Promise<GeneratedRouteWriteResult> => {
  const existingSource = await readTextFile(filePath)

  if (existingSource && !isManagedRouteFile(existingSource)) {
    return {
      filePath,
      status: 'skipped',
      reason: 'Existing file is user-managed and will not be overwritten.',
    }
  }

  if (existingSource === source) {
    return {
      filePath,
      status: 'unchanged',
    }
  }

  await ensureDir(filePath)
  await fs.writeFile(filePath, source, 'utf-8')

  return {
    filePath,
    status: 'written',
  }
}

const removeGeneratedRouteFile = async (filePath: string): Promise<GeneratedRouteWriteResult> => {
  const existingSource = await readTextFile(filePath)
  if (!existingSource || !isManagedRouteFile(existingSource)) {
    return {
      filePath,
      status: 'skipped',
      reason: 'File missing or user-managed.',
    }
  }

  await fs.unlink(filePath)
  return {
    filePath,
    status: 'removed',
  }
}

const syncGeneratedRoutePages = async (
  model: ModelManagerModel,
  spec: ModelLayoutSpec,
  previousRoute: string | null,
  cwd = process.cwd(),
) => {
  if (!spec.directory.enabled) {
    if (!previousRoute) {
      return {
        route: null,
        directory: { filePath: null, status: 'disabled' } as GeneratedRouteWriteResult,
        record: { filePath: null, status: 'disabled' } as GeneratedRouteWriteResult,
        removed: [] as GeneratedRouteWriteResult[],
      }
    }

    const previousFiles = resolveGeneratedRouteFiles(previousRoute, cwd)
    return {
      route: null,
      directory: { filePath: null, status: 'disabled' } as GeneratedRouteWriteResult,
      record: { filePath: null, status: 'disabled' } as GeneratedRouteWriteResult,
      removed: [
        await removeGeneratedRouteFile(previousFiles.directory),
        await removeGeneratedRouteFile(previousFiles.record),
      ],
    }
  }

  const nextRoute = normalizeRoutePath(spec.directory.route, `/admin/${model.table}`)
  const nextFiles = resolveGeneratedRouteFiles(nextRoute, cwd)
  const removed: GeneratedRouteWriteResult[] = []

  if (previousRoute) {
    const normalizedPreviousRoute = normalizeRoutePath(previousRoute, `/admin/${model.table}`)
    if (normalizedPreviousRoute !== nextRoute) {
      const previousFiles = resolveGeneratedRouteFiles(normalizedPreviousRoute, cwd)
      removed.push(await removeGeneratedRouteFile(previousFiles.directory))
      removed.push(await removeGeneratedRouteFile(previousFiles.record))
    }
  }

  return {
    route: nextRoute,
    directory: await writeGeneratedRouteFile(
      nextFiles.directory,
      renderDirectoryRoutePage(model.modelKey, nextRoute),
    ),
    record: await writeGeneratedRouteFile(
      nextFiles.record,
      renderRecordRoutePage(model.modelKey, nextRoute),
    ),
    removed,
  }
}

export const readModelSpec = async (
  model: ModelManagerModel,
  cwd = process.cwd(),
): Promise<{ spec: ModelLayoutSpec; source: 'fragment' | 'default' }> => {
  const { fragmentFile } = resolveModelManagerPaths(cwd)
  const filePath = fragmentFile(model.modelKey)
  const raw = await readYamlFile<ModelLayoutSpec>(filePath)

  if (!raw) {
    return {
      spec: createDefaultModelSpec(model),
      source: 'default',
    }
  }

  return {
    spec: normalizeModelSpec(raw, model),
    source: 'fragment',
  }
}

export const commitModelSpec = async (
  model: ModelManagerModel,
  payload: unknown,
  cwd = process.cwd(),
) => {
  const { fragmentFile, generatedFile } = resolveModelManagerPaths(cwd)
  const fragmentPath = fragmentFile(model.modelKey)
  const generatedPath = generatedFile(model.modelKey)
  const previousRaw = await readYamlFile<ModelLayoutSpec>(fragmentPath)
  const previousRoute = previousRaw?.directory?.route
    ? normalizeRoutePath(previousRaw.directory.route, `/admin/${model.table}`)
    : null

  const normalized = normalizeModelSpec(payload, model)
  const committedAt = new Date().toISOString()
  normalized.updatedAt = committedAt

  const yamlBody = [
    '# Auto-generated by Helios model manager.',
    '# Source of truth for directory + single management layout.',
    '# Edit directly or through /models/<model>.',
    stringifyYaml(normalized),
  ].join('\n')

  const generatedOutput = {
    version: 3,
    generatedAt: committedAt,
    modelKey: model.modelKey,
    directoryRoute: normalized.directory.route,
    recordRoute: `${normalized.directory.route}/:rid`,
    spec: normalized,
  }

  await ensureDir(fragmentPath)
  await fs.writeFile(fragmentPath, yamlBody, 'utf-8')

  await ensureDir(generatedPath)
  await fs.writeFile(generatedPath, JSON.stringify(generatedOutput, null, 2), 'utf-8')

  const routeFiles = await syncGeneratedRoutePages(model, normalized, previousRoute, cwd)

  return {
    spec: normalized,
    committedAt,
    files: {
      fragment: fragmentPath,
      generated: generatedPath,
      directoryPage: routeFiles.directory.filePath,
      directoryPageStatus: routeFiles.directory.status,
      recordPage: routeFiles.record.filePath,
      recordPageStatus: routeFiles.record.status,
      removedRouteFiles: routeFiles.removed,
    },
  }
}
