<script setup lang="ts">
import { defineAsyncComponent, type Component } from 'vue'
import type {
  ModelLayoutSpec,
  ModelUIColumnSpec,
  ModelUIFieldBinding,
  ModelUIFieldBindingModel,
  ModelUIFieldBindingSubtable,
  ModelUIFieldBindingTaxonomy,
  ModelUIRowSpec,
  ModelSpecResponse,
  ModelUIFieldSpec,
  ModelUITabSpec,
  ModelUIWidgetSpec,
} from '../../../types/model-spec'
import FieldSectionCard from '#layers/helios-ui/app/components/fields/FieldSectionCard.vue'
import ATaxonomyManager from '../../../components/fields/ATaxonomyManager.vue'
import { resolveFieldComponentOptions } from '../../../utils/field-component-options'
// Components are auto-imported from the active layer.

type RuntimeRecordResponse = {
  ok: boolean
  record: Record<string, any>
  identifiers: {
    rid: string | null
    subId: string | null
    table: string | null
  }
}

type WidgetLayoutColumnState = {
  id: string
  class?: string
  fields: ModelUIFieldSpec[]
}

type WidgetLayoutRowState = {
  id: string
  class?: string
  columns: WidgetLayoutColumnState[]
}

type AComboboxOption = {
  label: string
  value: string
  group?: string
  disabled?: boolean
}

type TaxonomyTerm = {
  id?: string | number
  key?: string
  slug?: string
  label?: string
  title?: string
  parent?: string | number | null
  [key: string]: any
}

type TaxonomyTreeNode = {
  id: string
  label: string
  children?: TaxonomyTreeNode[]
}

type TaxonomyFieldState = {
  terms: TaxonomyTerm[]
  tree: TaxonomyTreeNode[]
  loading: boolean
  error: string
  initialSelected: string[]
}

type TaxonomyCreatePayload = {
  label: string
  parentId?: string | null
}

type ActionGroupKind = 'model' | 'subtable' | 'taxonomy-attach' | 'taxonomy-detach'

type ActionGroup = {
  id: string
  kind: ActionGroupKind
  action: string
  payload: Record<string, any>
  fields: string[]
}

type ActionGroupResult = {
  group: ActionGroup
  status: 'success' | 'failed'
  result?: any
  error?: any
}

const route = useRoute()
const { $process } = useCRUD()

const modelParam = computed(() => {
  const fromParams = String(route.params.model ?? '').trim().toLowerCase()
  if (fromParams) return fromParams

  const fromMeta = String((route.meta as any)?.modelKey ?? '').trim().toLowerCase()
  return fromMeta
})
const ridParam = computed(() => String(route.params.rid ?? '').trim())
const activeTabSlug = ref('')
const notice = ref('')
const noticeTone = ref<'success' | 'error'>('success')
const saving = ref(false)
const publishing = ref(false)
const widgetSaving = ref<Record<string, boolean>>({})
const tabOverrideModules = import.meta.glob('@/components/admin/overrides/**/tabs/*.vue')
const widgetOverrideModules = import.meta.glob('@/components/admin/overrides/**/widgets/*.vue')
const tabOverrideCache = new Map<string, Component | null>()
const widgetOverrideCache = new Map<string, Component | null>()

const { data: specData, pending: specPending, error: specError } = await useFetch<ModelSpecResponse>(
  () => `/api/models/layout/${modelParam.value}`,
  { watch: [modelParam] },
)

const {
  data: recordData,
  pending: recordPending,
  error: recordError,
  refresh: refreshRecord,
} = await useFetch<RuntimeRecordResponse>(
  () => `/api/models/runtime/${modelParam.value}/record/${encodeURIComponent(ridParam.value)}`,
  { watch: [modelParam, ridParam] },
)

const spec = computed<ModelLayoutSpec | null>(() => specData.value?.spec ?? null)
const modelInfo = computed(() => specData.value?.model ?? null)
const modelLabel = computed(() => modelInfo.value?.label || modelParam.value)
const modelDataMode = computed<'source' | 'tenant'>(() => modelInfo.value?.dataMode === 'tenant' ? 'tenant' : 'source')
const directoryRoute = computed(() => spec.value?.directory.route || `/admin/${modelParam.value}`)
const sourceRecord = computed<Record<string, any> | null>(() => {
  const value = recordData.value?.record
  return value && typeof value === 'object' ? value : null
})
const recordIdentifiers = computed(() => recordData.value?.identifiers ?? null)
const PAGE_BUILDER2_ROW_ID = 'pb2-row'

const fieldState = ref<Record<string, any>>({})
const taxonomyState = ref<Record<string, TaxonomyFieldState>>({})
let taxonomyLoadTicket = 0

const toLabel = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const resolveFieldKey = (field: ModelUIFieldSpec) => {
  return String(field.modelKey || field.field || field.id || '').trim()
}

const unique = <T>(value: T[]) => Array.from(new Set(value))

const toFileToken = (value: string, fallback = 'default') => {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return token || fallback
}

const findOverrideLoader = (
  modules: Record<string, () => Promise<unknown>>,
  suffixes: string[],
) => {
  const match = Object.keys(modules).find((key) => suffixes.some((suffix) => key.endsWith(suffix)))
  return match ? modules[match] : null
}

const resolveTabOverrideComponent = (modelKey: string, tabSlug: string): Component | null => {
  const cacheKey = `${modelKey}::${tabSlug}`
  if (tabOverrideCache.has(cacheKey)) return tabOverrideCache.get(cacheKey) ?? null

  const normalizedModel = toFileToken(modelKey, 'model')
  const normalizedSlug = toFileToken(tabSlug, 'tab')
  const loader = findOverrideLoader(tabOverrideModules, [
    `components/admin/overrides/${normalizedModel}/tabs/${tabSlug}.vue`,
    `components/admin/overrides/${normalizedModel}/tabs/${normalizedSlug}.vue`,
  ])
  const resolved = loader ? defineAsyncComponent(loader as any) : null
  tabOverrideCache.set(cacheKey, resolved)
  return resolved
}

const resolveWidgetOverrideComponent = (modelKey: string, widgetId: string): Component | null => {
  const cacheKey = `${modelKey}::${widgetId}`
  if (widgetOverrideCache.has(cacheKey)) return widgetOverrideCache.get(cacheKey) ?? null

  const normalizedModel = toFileToken(modelKey, 'model')
  const normalizedWidget = toFileToken(widgetId, 'widget')
  const loader = findOverrideLoader(widgetOverrideModules, [
    `components/admin/overrides/${normalizedModel}/widgets/${widgetId}.vue`,
    `components/admin/overrides/${normalizedModel}/widgets/${normalizedWidget}.vue`,
  ])
  const resolved = loader ? defineAsyncComponent(loader as any) : null
  widgetOverrideCache.set(cacheKey, resolved)
  return resolved
}

const normalizeModeKey = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')

const toCamelCase = (value: unknown) => {
  const source = String(value ?? '').trim()
  if (!source) return ''
  return source
    .replace(/[_\-\s]+([A-Za-z0-9])/g, (_, token: string) => token.toUpperCase())
    .replace(/^[A-Z]/, token => token.toLowerCase())
}

const resolveMutationRecordId = () => {
  const subId = String(recordIdentifiers.value?.subId ?? '').trim()
  if (subId) return subId
  const rid = String(recordIdentifiers.value?.rid ?? ridParam.value).trim()
  if (rid.includes(':')) return rid.split(':').slice(1).join(':')
  return rid
}

const resolveProcessInstances = () => {
  const fromRecord = Array.isArray(sourceRecord.value?.instances)
    ? sourceRecord.value?.instances
    : []
  return unique(
    (fromRecord ?? [])
      .map((entry: unknown) => String(entry ?? '').trim().toLowerCase())
      .filter(Boolean),
  )
}

const buildProcessOptions = (mode: 'query' | 'mutate' = 'mutate') => {
  const base: Record<string, any> = {
    authority: modelDataMode.value,
    autoToast: false,
    consoleLogging: mode === 'mutate',
    trackAttempts: false,
    throwOnFailure: true,
  }

  if (modelDataMode.value === 'tenant') {
    const instances = resolveProcessInstances()
    if (!instances.length) {
      throw new Error('Tenant authority requires at least one target instance on the record.')
    }
    base.instances = instances
  }

  return base
}

const resolveFieldBinding = (field: ModelUIFieldSpec): ModelUIFieldBinding => {
  const key = resolveFieldKey(field)
  const fallbackAction = String(field.action || `${modelParam.value}.update`).trim()
  const raw = (field as any).binding
  if (!raw || typeof raw !== 'object') {
    return {
      kind: 'model',
      action: fallbackAction,
      payloadKey: key,
    } satisfies ModelUIFieldBindingModel
  }

  const kind = String((raw as any).kind || '').trim().toLowerCase()
  if (kind === 'taxonomy') {
    const taxonomyKey = normalizeModeKey((raw as any).taxonomyKey || key) || key
    const actions = (raw as any).actions || {}
    const prefix = `${modelParam.value}.${taxonomyKey}`
    return {
      kind: 'taxonomy',
      taxonomyKey,
      valueMode: 'termIds',
      actions: {
        getTerms: String(actions.getTerms || `${prefix}.getTerms`).trim(),
        getRecordTerms: String(actions.getRecordTerms || `${prefix}.getRecordTerms`).trim(),
        attach: String(actions.attach || `${prefix}.attach`).trim(),
        detach: String(actions.detach || `${prefix}.detach`).trim(),
        addTerm: String(actions.addTerm || `${prefix}.addTerm`).trim() || undefined,
      },
    } satisfies ModelUIFieldBindingTaxonomy
  }

  if (kind === 'subtable') {
    const subtableKey = toCamelCase((raw as any).subtableKey || key) || key
    const prefix = `${modelParam.value}.subtables.${subtableKey}`
    return {
      kind: 'subtable',
      subtableKey,
      action: String((raw as any).action || `${prefix}.update`).trim(),
      payloadKey: String((raw as any).payloadKey || key).trim() || key,
    } satisfies ModelUIFieldBindingSubtable
  }

  if (kind === 'custom') {
    return {
      kind: 'custom',
      handler: String((raw as any).handler || `${modelParam.value}.custom.${key}`).trim(),
    }
  }

  return {
    kind: 'model',
    action: String((raw as any).action || fallbackAction).trim() || fallbackAction,
    payloadKey: String((raw as any).payloadKey || key).trim() || key,
  } satisfies ModelUIFieldBindingModel
}

const isTaxonomyField = (field: ModelUIFieldSpec) => resolveFieldBinding(field).kind === 'taxonomy'
const isFieldReadOnly = (field: ModelUIFieldSpec) => Boolean(field.readonly)

const resolveRuntimeRows = (tab: ModelUITabSpec): ModelUITabSpec['primary'] => {
  const rows = Array.isArray(tab.primary) ? tab.primary : []
  const builderRows = rows.filter((row) => {
    if (!row || typeof row !== 'object') return false
    if (String(row.id || '').trim() === PAGE_BUILDER2_ROW_ID) return true
    const meta = (row.meta && typeof row.meta === 'object') ? row.meta as Record<string, any> : {}
    return Boolean(meta.builder2)
  })
  return builderRows.length ? builderRows : rows
}

const clampGridCols = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 24
  return Math.max(1, Math.min(48, Math.round(parsed)))
}

const frameSpanFromWidth = (width: number, gridCols: number) => {
  return Math.max(1, Math.min(gridCols, Math.round((Math.max(1, width) / 100) * gridCols)))
}

const normalizeFrameBounds = (colStart: unknown, colEnd: unknown, gridCols: number) => {
  const startParsed = Number(colStart)
  const endParsed = Number(colEnd)
  const start = Number.isFinite(startParsed) ? Math.round(startParsed) : 1
  const end = Number.isFinite(endParsed) ? Math.round(endParsed) : gridCols + 1
  const clampedStart = Math.max(1, Math.min(gridCols, start))
  const minEnd = clampedStart + 1
  const clampedEnd = Math.max(minEnd, Math.min(gridCols + 1, end))
  return {
    colStart: clampedStart,
    colEnd: clampedEnd,
  }
}

const readBuilder2RowMeta = (row: ModelUIRowSpec) => {
  const root = (row.meta && typeof row.meta === 'object') ? row.meta : {}
  const raw = (root.builder2 && typeof root.builder2 === 'object') ? root.builder2 as Record<string, any> : {}
  return {
    gridCols: clampGridCols(raw.gridCols ?? 24),
  }
}

const readFrameBounds = (row: ModelUIRowSpec, column: ModelUIColumnSpec) => {
  const rowMeta = readBuilder2RowMeta(row)
  const root = (column.meta && typeof column.meta === 'object') ? column.meta : {}
  const raw = (root.builder2 && typeof root.builder2 === 'object') ? root.builder2 as Record<string, any> : {}
  const width = Number.isFinite(Number(raw.width)) ? Number(raw.width) : 50
  const span = frameSpanFromWidth(width, rowMeta.gridCols)
  return normalizeFrameBounds(raw.colStart ?? 1, raw.colEnd ?? (1 + span), rowMeta.gridCols)
}

const resolveRuntimeFrameBoundsMap = (row: ModelUIRowSpec) => {
  const rowMeta = readBuilder2RowMeta(row)
  const boundsByColumnId: Record<string, { colStart: number, colEnd: number }> = {}
  let cursor = 1

  for (const column of row.columns || []) {
    const root = (column.meta && typeof column.meta === 'object') ? column.meta : {}
    const raw = (root.builder2 && typeof root.builder2 === 'object') ? root.builder2 as Record<string, any> : {}
    const width = Number.isFinite(Number(raw.width)) ? Number(raw.width) : 50
    const span = frameSpanFromWidth(width, rowMeta.gridCols)

    const hasExplicitStart = Number.isFinite(Number(raw.colStart))
    const hasExplicitEnd = Number.isFinite(Number(raw.colEnd))
    const explicitBounds = (hasExplicitStart || hasExplicitEnd)
      ? normalizeFrameBounds(
          hasExplicitStart ? Number(raw.colStart) : cursor,
          hasExplicitEnd
            ? Number(raw.colEnd)
            : ((hasExplicitStart ? Number(raw.colStart) : cursor) + span),
          rowMeta.gridCols,
        )
      : null
    const explicitSpan = explicitBounds ? explicitBounds.colEnd - explicitBounds.colStart : span
    const canReuseExplicit = Boolean(
      explicitBounds
      && explicitSpan === span
      && explicitBounds.colStart >= cursor
      && explicitBounds.colEnd <= (rowMeta.gridCols + 1),
    )

    let colStart = (canReuseExplicit && explicitBounds) ? explicitBounds.colStart : cursor
    if (colStart > rowMeta.gridCols || (colStart + span) > (rowMeta.gridCols + 1)) {
      colStart = 1
    }
    const colEnd = Math.min(rowMeta.gridCols + 1, colStart + span)
    boundsByColumnId[column.id] = { colStart, colEnd }

    cursor = colEnd
    if (cursor > rowMeta.gridCols) cursor = 1
  }

  return boundsByColumnId
}

const runtimeRowStyle = (row: ModelUIRowSpec) => {
  const rowMeta = readBuilder2RowMeta(row)
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${rowMeta.gridCols}, minmax(0, 1fr))`,
  }
}

const runtimeColumnStyle = (row: ModelUIRowSpec, column: ModelUIColumnSpec) => {
  const bounds = resolveRuntimeFrameBoundsMap(row)[column.id] ?? readFrameBounds(row, column)
  return {
    gridColumn: `${bounds.colStart} / ${bounds.colEnd}`,
  }
}

const BUILDER2_WIDGET_GRID_COLS = 12

const readWidgetBounds = (widget: ModelUIWidgetSpec) => {
  const root = (widget.meta && typeof widget.meta === 'object') ? widget.meta : {}
  const raw = (root.builder2 && typeof root.builder2 === 'object') ? root.builder2 as Record<string, any> : {}
  const width = Number.isFinite(Number(raw.width)) ? Number(raw.width) : 100
  const span = frameSpanFromWidth(width, BUILDER2_WIDGET_GRID_COLS)
  return normalizeFrameBounds(raw.colStart ?? 1, raw.colEnd ?? (1 + span), BUILDER2_WIDGET_GRID_COLS)
}

const resolveRuntimeWidgetBoundsMap = (column: ModelUIColumnSpec) => {
  const boundsByWidgetId: Record<string, { colStart: number, colEnd: number }> = {}
  let cursor = 1

  for (const widget of column.primary || []) {
    const root = (widget.meta && typeof widget.meta === 'object') ? widget.meta : {}
    const raw = (root.builder2 && typeof root.builder2 === 'object') ? root.builder2 as Record<string, any> : {}
    const width = Number.isFinite(Number(raw.width)) ? Number(raw.width) : 100
    const span = frameSpanFromWidth(width, BUILDER2_WIDGET_GRID_COLS)

    const hasExplicitStart = Number.isFinite(Number(raw.colStart))
    const hasExplicitEnd = Number.isFinite(Number(raw.colEnd))
    const explicitBounds = (hasExplicitStart || hasExplicitEnd)
      ? normalizeFrameBounds(
          hasExplicitStart ? Number(raw.colStart) : cursor,
          hasExplicitEnd
            ? Number(raw.colEnd)
            : ((hasExplicitStart ? Number(raw.colStart) : cursor) + span),
          BUILDER2_WIDGET_GRID_COLS,
        )
      : null
    const explicitSpan = explicitBounds ? explicitBounds.colEnd - explicitBounds.colStart : span
    const canReuseExplicit = Boolean(
      explicitBounds
      && explicitSpan === span
      && explicitBounds.colStart >= cursor
      && explicitBounds.colEnd <= (BUILDER2_WIDGET_GRID_COLS + 1),
    )

    let colStart = (canReuseExplicit && explicitBounds) ? explicitBounds.colStart : cursor
    if (colStart > BUILDER2_WIDGET_GRID_COLS || (colStart + span) > (BUILDER2_WIDGET_GRID_COLS + 1)) {
      colStart = 1
    }
    const colEnd = Math.min(BUILDER2_WIDGET_GRID_COLS + 1, colStart + span)
    boundsByWidgetId[widget.id] = { colStart, colEnd }
    cursor = colEnd
    if (cursor > BUILDER2_WIDGET_GRID_COLS) cursor = 1
  }

  return boundsByWidgetId
}

const runtimeWidgetGridStyle = () => {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${BUILDER2_WIDGET_GRID_COLS}, minmax(0, 1fr))`,
    gap: '0.55rem',
  }
}

const runtimeWidgetStyle = (column: ModelUIColumnSpec, widget: ModelUIWidgetSpec) => {
  const bounds = resolveRuntimeWidgetBoundsMap(column)[widget.id] ?? readWidgetBounds(widget)
  return {
    gridColumn: `${bounds.colStart} / ${bounds.colEnd}`,
  }
}

const resolveRecordFieldValue = (record: Record<string, any> | null, field: ModelUIFieldSpec) => {
  if (!record) return undefined

  const candidates = unique([
    resolveFieldKey(field),
    String(field.field || '').trim(),
    String(field.id || '').trim(),
  ].filter(Boolean))

  for (const key of candidates) {
    if (Object.hasOwn(record, key)) return record[key]
  }

  const lowerLookup = new Map<string, string>()
  Object.keys(record).forEach((key) => lowerLookup.set(key.toLowerCase(), key))
  for (const key of candidates) {
    const match = lowerLookup.get(String(key).toLowerCase())
    if (match) return record[match]
  }

  const normalized = resolveFieldKey(field).toLowerCase()
  if (normalized === 'rid') {
    return recordIdentifiers.value?.rid || ridParam.value
  }
  if (normalized === 'id' || normalized.endsWith('id')) {
    return recordIdentifiers.value?.subId || ridParam.value
  }

  return undefined
}

const normalizePayloadValue = (field: ModelUIFieldSpec, value: unknown) => {
  const options = field.component?.options || {}
  if (isTaxonomyField(field)) {
    if (!Array.isArray(value)) return []
    return value
      .map((entry) => String(entry ?? '').trim())
      .filter(Boolean)
  }
  if (field.component?.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') {
    if (value === '' || value === null || typeof value === 'undefined') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}

const payloadFromFields = (fields: ModelUIFieldSpec[]) => {
  const payload: Record<string, any> = {}
  for (const field of fields) {
    const binding = resolveFieldBinding(field)
    if (binding.kind !== 'model') continue
    const payloadKey = String(binding.payloadKey || resolveFieldKey(field)).trim()
    if (!payloadKey) continue
    payload[payloadKey] = normalizePayloadValue(field, fieldState.value[resolveFieldKey(field)])
  }
  return payload
}

const inferDefault = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field).toLowerCase()
  const options = field.component?.options || {}

  if (typeof options.defaultValue !== 'undefined') return options.defaultValue

  if (isTaxonomyField(field)) return []
  if (field.component.name === 'AColorPicker') return '#000000'
  if (field.component.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') return 0
  if (field.component.name === 'ACombobox' || field.component.name === 'AComboboxAsync') {
    if (options.multiple) return []
    if (key.includes('status')) return 'draft'
    return ''
  }

  if (key === 'rid' || key.endsWith('id')) return ridParam.value
  if (key.includes('title') || key.includes('name')) return `${modelLabel.value} ${ridParam.value}`

  return ''
}

const allFieldSpecs = computed(() => {
  const tabs = spec.value?.single.tabs ?? []
  const seen = new Set<string>()
  const merged: ModelUIFieldSpec[] = []

  for (const tab of tabs) {
    for (const row of resolveRuntimeRows(tab)) {
      for (const column of row.columns) {
        for (const widget of column.primary) {
          for (const field of widget.fields) {
            const key = resolveFieldKey(field)
            if (!key || seen.has(key)) continue
            seen.add(key)
            merged.push(field)
          }
        }
      }
    }
  }

  return merged
})

const taxonomyFieldSpecs = computed(() => allFieldSpecs.value.filter(field => isTaxonomyField(field)))

const flattenObjects = (value: any): Record<string, any>[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap(entry => flattenObjects(entry))
  }
  if (typeof value === 'object') return [value as Record<string, any>]
  return []
}

const resolveTermId = (term: TaxonomyTerm): string => {
  const direct = term.key ?? term.id ?? term.slug
  if (typeof direct === 'number') return String(direct)
  return String(direct ?? '').trim()
}

const resolveTermParent = (term: TaxonomyTerm): string | null => {
  const value = term.parent
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.includes(':')) return trimmed.split(':').slice(1).join(':')
    return trimmed
  }
  if (value && typeof value === 'object') {
    const nested = (value as any).id ?? (value as any).value
    if (typeof nested === 'number') return String(nested)
    if (typeof nested === 'string') return nested.trim() || null
  }
  return null
}

const buildTaxonomyTree = (terms: TaxonomyTerm[]): TaxonomyTreeNode[] => {
  const nodes = terms
    .map((term) => {
      const id = resolveTermId(term)
      if (!id) return null
      return {
        id,
        label: String(term.label ?? term.title ?? id),
        parent: resolveTermParent(term),
        children: [] as TaxonomyTreeNode[],
      }
    })
    .filter(Boolean) as Array<TaxonomyTreeNode & { parent: string | null }>

  const map = new Map(nodes.map(node => [node.id, node]))
  const roots: TaxonomyTreeNode[] = []
  for (const node of nodes) {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)!.children!.push(node)
    }
    else {
      roots.push(node)
    }
  }
  return roots
}

const taxonomyStateFor = (field: ModelUIFieldSpec): TaxonomyFieldState => {
  const key = resolveFieldKey(field)
  const existing = taxonomyState.value[key]
  if (existing) return existing
  const created: TaxonomyFieldState = {
    terms: [],
    tree: [],
    loading: false,
    error: '',
    initialSelected: [],
  }
  taxonomyState.value = {
    ...taxonomyState.value,
    [key]: created,
  }
  return created
}

const taxonomyTreeForField = (field: ModelUIFieldSpec) => {
  return taxonomyStateFor(field).tree
}

const setTaxonomyTreeForField = (field: ModelUIFieldSpec, tree: TaxonomyTreeNode[]) => {
  if (isFieldReadOnly(field)) return
  const key = resolveFieldKey(field)
  const state = taxonomyStateFor(field)
  taxonomyState.value = {
    ...taxonomyState.value,
    [key]: {
      ...state,
      tree: Array.isArray(tree) ? tree : [],
    },
  }
}

const taxonomySelectedIdsForField = (field: ModelUIFieldSpec): string[] => {
  const key = resolveFieldKey(field)
  const value = fieldState.value[key]
  if (!Array.isArray(value)) return []
  return value.map(entry => String(entry ?? '').trim()).filter(Boolean)
}

const loadTaxonomyField = async (field: ModelUIFieldSpec, ticket: number) => {
  const key = resolveFieldKey(field)
  const binding = resolveFieldBinding(field)
  if (binding.kind !== 'taxonomy') return
  const state = taxonomyStateFor(field)
  const recordId = resolveMutationRecordId()
  if (!recordId) return

  taxonomyState.value = {
    ...taxonomyState.value,
    [key]: {
      ...state,
      loading: true,
      error: '',
    },
  }

  try {
    const processOptions = buildProcessOptions('query')
    const termsRaw = await $process(binding.actions.getTerms, {}, processOptions)
    const recordTermsRaw = await $process(binding.actions.getRecordTerms, { id: recordId }, processOptions)

    const terms = flattenObjects(termsRaw)
    const recordTerms = flattenObjects(recordTermsRaw)
    const selected = unique(recordTerms.map(term => resolveTermId(term as any)).filter(Boolean))
    if (ticket !== taxonomyLoadTicket) return

    taxonomyState.value = {
      ...taxonomyState.value,
      [key]: {
        terms,
        tree: buildTaxonomyTree(terms),
        loading: false,
        error: '',
        initialSelected: selected,
      },
    }

    applyFieldValue(field, selected)
  }
  catch (error: any) {
    if (ticket !== taxonomyLoadTicket) return
    taxonomyState.value = {
      ...taxonomyState.value,
      [key]: {
        ...taxonomyStateFor(field),
        loading: false,
        error: error?.message ?? 'Failed to load taxonomy.',
      },
    }
  }
}

const refreshTaxonomyFields = async (fields: ModelUIFieldSpec[]) => {
  taxonomyLoadTicket += 1
  const ticket = taxonomyLoadTicket
  for (const field of fields) {
    await loadTaxonomyField(field, ticket)
  }
}

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const createTaxonomyTerm = async (
  field: ModelUIFieldSpec,
  payload: TaxonomyCreatePayload,
): Promise<TaxonomyTreeNode | null> => {
  const binding = resolveFieldBinding(field)
  if (binding.kind !== 'taxonomy') return null
  if (!binding.actions.addTerm) {
    throw new Error(`Taxonomy "${binding.taxonomyKey}" does not expose addTerm.`)
  }

  const key = slugify(payload.label)
  if (!key) throw new Error('Term label is required.')
  const termPayload = {
    key,
    label: payload.label,
    parent: payload.parentId || '',
  }

  await $process(binding.actions.addTerm, termPayload, buildProcessOptions('mutate'))
  await refreshTaxonomyFields([field])
  const state = taxonomyStateFor(field)
  const match = state.terms.find(entry => resolveTermId(entry) === key)
  if (!match) {
    return {
      id: key,
      label: payload.label,
      children: [],
    }
  }
  return {
    id: resolveTermId(match),
    label: String(match.label ?? match.title ?? payload.label),
    children: [],
  }
}

watch(
  [() => spec.value, () => sourceRecord.value],
  ([nextSpec, nextRecord]) => {
    if (!nextSpec) {
      activeTabSlug.value = ''
      fieldState.value = {}
      taxonomyState.value = {}
      return
    }

    activeTabSlug.value = nextSpec.single.tabs[0]?.slug ?? ''

    const nextState: Record<string, any> = {}
    for (const field of allFieldSpecs.value) {
      const key = resolveFieldKey(field)
      if (!key) continue
      const valueFromRecord = resolveRecordFieldValue(nextRecord, field)
      nextState[key] = typeof valueFromRecord !== 'undefined'
        ? valueFromRecord
        : inferDefault(field)
    }

    fieldState.value = nextState
    taxonomyState.value = {}
    notice.value = ''
    noticeTone.value = 'success'
    void refreshTaxonomyFields(taxonomyFieldSpecs.value)
  },
  { immediate: true, deep: true },
)

const tabs = computed(() => spec.value?.single.tabs ?? [])

watch(
  tabs,
  (nextTabs) => {
    if (!nextTabs.length) {
      activeTabSlug.value = ''
      return
    }

    if (!nextTabs.some(tab => tab.slug === activeTabSlug.value)) {
      activeTabSlug.value = nextTabs[0]?.slug ?? ''
    }
  },
  { deep: true },
)

const activeTab = computed<ModelUITabSpec | null>(() => {
  const list = tabs.value
  if (!list.length) return null
  return list.find(tab => tab.slug === activeTabSlug.value) ?? list[0] ?? null
})

const activeTabOverrideComponent = computed<Component | null>(() => {
  const tab = activeTab.value
  if (!tab) return null
  return resolveTabOverrideComponent(modelParam.value, tab.slug)
})

const widgetOverrideFor = (widget: ModelUIWidgetSpec): Component | null => {
  return resolveWidgetOverrideComponent(modelParam.value, widget.id)
}

watch(
  modelParam,
  () => {
    tabOverrideCache.clear()
    widgetOverrideCache.clear()
  },
  { immediate: true },
)

const asComboboxOptions = (raw: unknown): AComboboxOption[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry) return null

      if (typeof entry === 'string') {
        const text = entry.trim()
        if (!text) return null
        return { label: toLabel(text), value: text }
      }

      if (typeof entry !== 'object') return null
      const label = String((entry as any).label ?? '').trim()
      const value = String((entry as any).value ?? '').trim()
      if (!label || !value) return null

      return {
        label,
        value,
        group: String((entry as any).group ?? '').trim() || undefined,
        disabled: Boolean((entry as any).disabled),
      }
    })
    .filter(Boolean) as AComboboxOption[]
}

const resolveOptions = (field: ModelUIFieldSpec): AComboboxOption[] => {
  const fromSpec = asComboboxOptions(field.component?.options?.options)
  if (fromSpec.length) return fromSpec

  const key = resolveFieldKey(field).toLowerCase()
  if (key.includes('status')) {
    return [
      { label: 'Draft', value: 'draft' },
      { label: 'Review', value: 'review' },
      { label: 'Published', value: 'published' },
    ]
  }

  return []
}

const searchOptions = async (field: ModelUIFieldSpec, query: string): Promise<AComboboxOption[]> => {
  const source = resolveOptions(field)
  const q = query.trim().toLowerCase()
  if (!q) return []

  await new Promise(resolve => setTimeout(resolve, 120))

  return source.filter((entry) => {
    return entry.label.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q)
  })
}

const resolveFieldComponent = (name: string) => {
  if (name === 'ACombobox') return 'ACombobox'
  if (name === 'AComboboxAsync') return 'AComboboxAsync'
  if (name === 'AColorPicker') return 'AColorPicker'
  return 'AInput'
}

const resolveFieldProps = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field)
  const options = resolveFieldComponentOptions(
    String(field.component?.name || ''),
    field.component?.options,
    { applyDefaults: true, allowUnknown: true },
  ).resolvedOptions as Record<string, any>
  const readOnly = isFieldReadOnly(field)
  const disabled = Boolean(options.disabled) || Boolean(field.disabled)
  const base = {
    label: field.label || toLabel(key),
    helperText: String(options.helperText || ''),
    disabled,
  }
  const placeholder = String(options.placeholder ?? `Enter ${toLabel(key).toLowerCase()}`).trim()

  if (field.component.name === 'AColorPicker') {
    return {
      ...base,
    }
  }

  if (field.component.name === 'ACombobox') {
    return {
      ...base,
      options: resolveOptions(field),
      placeholder,
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
      disabled: disabled || readOnly,
    }
  }

  if (field.component.name === 'AComboboxAsync') {
    return {
      ...base,
      placeholder,
      search: (query: string) => searchOptions(field, query),
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
      minChars: Number(options.minChars ?? 1),
      disabled: disabled || readOnly,
    }
  }

  return {
    ...base,
    type: String(options.type ?? 'text'),
    placeholder,
    readOnly,
  }
}

function applyFieldValue(field: ModelUIFieldSpec, value: unknown) {
  const key = resolveFieldKey(field)
  const nextValue = isTaxonomyField(field)
    ? (Array.isArray(value)
        ? value.map(entry => String(entry ?? '').trim()).filter(Boolean)
        : [])
    : value
  fieldState.value = {
    ...fieldState.value,
    [key]: nextValue,
  }
}

function setFieldValue(field: ModelUIFieldSpec, value: unknown) {
  if (isFieldReadOnly(field)) return
  applyFieldValue(field, value)
}

const saveDraft = async () => {
  saving.value = true

  try {
    const payload = payloadFromFields(allFieldSpecs.value)
    const status = await $process(
      `${modelParam.value}.update`,
      {
        id: resolveMutationRecordId(),
        payload,
      },
      buildProcessOptions('mutate'),
    )
    if (!status) {
      throw new Error(`No response returned when saving ${ridParam.value}.`)
    }
    await refreshRecord()
    notice.value = `Saved draft for ${ridParam.value}.`
    noticeTone.value = 'success'
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to save draft for ${ridParam.value}.`
    noticeTone.value = 'error'
  }
  finally {
    saving.value = false
  }
}

const statusFieldKey = computed(() => {
  const fromFields = allFieldSpecs.value.find((field) => {
    const binding = resolveFieldBinding(field)
    if (binding.kind !== 'model') return false
    const key = resolveFieldKey(field).toLowerCase()
    return key.includes('status')
  })
  return fromFields ?? null
})

const publishRecord = async () => {
  const statusField = statusFieldKey.value
  if (!statusField) {
    notice.value = 'No status field is configured in this model tab layout.'
    noticeTone.value = 'error'
    return
  }
  const binding = resolveFieldBinding(statusField)
  if (binding.kind !== 'model') {
    notice.value = 'Status field binding must target the base model.'
    noticeTone.value = 'error'
    return
  }

  publishing.value = true

  try {
    await $process(
      binding.action,
      {
        id: resolveMutationRecordId(),
        payload: {
          [binding.payloadKey]: 'publish',
        },
      },
      buildProcessOptions('mutate'),
    )
    await refreshRecord()
    notice.value = `Published ${ridParam.value}.`
    noticeTone.value = 'success'
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to publish ${ridParam.value}.`
    noticeTone.value = 'error'
  }
  finally {
    publishing.value = false
  }
}

const widgetLayoutRows = (widget: ModelUIWidgetSpec): WidgetLayoutRowState[] => {
  const byId = new Map(widget.fields.map(field => [field.id, field]))
  const rawRows = widget.layout?.rows || []

  if (!rawRows.length) {
    return [
      {
        id: `${widget.id}-row-1`,
        columns: [
          {
            id: `${widget.id}-col-1`,
            fields: widget.fields,
          },
        ],
      },
    ]
  }

  return rawRows.map((row) => {
    const columns = (row.columns || []).map((column) => ({
      id: column.id,
      class: column.class,
      fields: (column.fieldIds || [])
        .map(fieldId => byId.get(fieldId))
        .filter(Boolean) as ModelUIFieldSpec[],
    }))

    return {
      id: row.id,
      class: row.class,
      columns: columns.length
        ? columns
        : [
            {
              id: `${row.id}-col-1`,
              fields: [],
            },
          ],
    }
  })
}

const runAction = async (action: string, payload: Record<string, any>) => {
  return await $process(action, payload, buildProcessOptions('mutate'))
}

const buildActionGroupsForFields = (fields: ModelUIFieldSpec[]): ActionGroup[] => {
  const recordId = resolveMutationRecordId()
  if (!recordId) {
    throw new Error('Could not resolve record id for save.')
  }

  const modelPayloadByAction = new Map<string, { payload: Record<string, any>, fields: Set<string> }>()
  const subtablePayloadByAction = new Map<string, { payload: Record<string, any>, fields: Set<string> }>()
  const taxonomyAttachByAction = new Map<string, { terms: Set<string>, fields: Set<string> }>()
  const taxonomyDetachByAction = new Map<string, { terms: Set<string>, fields: Set<string> }>()

  for (const field of fields) {
    if (isFieldReadOnly(field)) continue
    const fieldKey = resolveFieldKey(field)
    if (!fieldKey) continue

    const binding = resolveFieldBinding(field)
    const value = normalizePayloadValue(field, fieldState.value[fieldKey])

    if (binding.kind === 'model') {
      const entry = modelPayloadByAction.get(binding.action) ?? { payload: {}, fields: new Set<string>() }
      entry.payload[binding.payloadKey] = value
      entry.fields.add(fieldKey)
      modelPayloadByAction.set(binding.action, entry)
      continue
    }

    if (binding.kind === 'subtable') {
      const entry = subtablePayloadByAction.get(binding.action) ?? { payload: {}, fields: new Set<string>() }
      entry.payload[binding.payloadKey] = value
      entry.fields.add(fieldKey)
      subtablePayloadByAction.set(binding.action, entry)
      continue
    }

    if (binding.kind === 'taxonomy') {
      const state = taxonomyStateFor(field)
      const current = unique(
        (Array.isArray(fieldState.value[fieldKey]) ? fieldState.value[fieldKey] : [])
          .map((item: unknown) => String(item ?? '').trim())
          .filter(Boolean),
      )
      const previous = unique(
        (state.initialSelected ?? [])
          .map(item => String(item ?? '').trim())
          .filter(Boolean),
      )

      const currentSet = new Set(current)
      const previousSet = new Set(previous)
      const added = current.filter(id => !previousSet.has(id))
      const removed = previous.filter(id => !currentSet.has(id))

      if (added.length) {
        const entry = taxonomyAttachByAction.get(binding.actions.attach) ?? {
          terms: new Set<string>(),
          fields: new Set<string>(),
        }
        added.forEach(term => entry.terms.add(term))
        entry.fields.add(fieldKey)
        taxonomyAttachByAction.set(binding.actions.attach, entry)
      }

      if (removed.length) {
        const entry = taxonomyDetachByAction.get(binding.actions.detach) ?? {
          terms: new Set<string>(),
          fields: new Set<string>(),
        }
        removed.forEach(term => entry.terms.add(term))
        entry.fields.add(fieldKey)
        taxonomyDetachByAction.set(binding.actions.detach, entry)
      }
      continue
    }

    if (binding.kind === 'custom') {
      throw new Error(`Custom save handlers are not implemented for widget save (${binding.handler}).`)
    }
  }

  const groups: ActionGroup[] = []

  for (const [action, entry] of modelPayloadByAction.entries()) {
    groups.push({
      id: `model:${action}`,
      kind: 'model',
      action,
      payload: {
        id: recordId,
        payload: entry.payload,
      },
      fields: Array.from(entry.fields),
    })
  }

  for (const [action, entry] of subtablePayloadByAction.entries()) {
    groups.push({
      id: `subtable:${action}`,
      kind: 'subtable',
      action,
      payload: {
        id: recordId,
        payload: entry.payload,
      },
      fields: Array.from(entry.fields),
    })
  }

  for (const [action, entry] of taxonomyDetachByAction.entries()) {
    groups.push({
      id: `taxonomy-detach:${action}`,
      kind: 'taxonomy-detach',
      action,
      payload: {
        id: recordId,
        terms: Array.from(entry.terms),
      },
      fields: Array.from(entry.fields),
    })
  }

  for (const [action, entry] of taxonomyAttachByAction.entries()) {
    groups.push({
      id: `taxonomy-attach:${action}`,
      kind: 'taxonomy-attach',
      action,
      payload: {
        id: recordId,
        terms: Array.from(entry.terms),
      },
      fields: Array.from(entry.fields),
    })
  }

  return groups
}

const executeActionGroups = async (groups: ActionGroup[]): Promise<ActionGroupResult[]> => {
  const tasks = groups.map(async (group): Promise<ActionGroupResult> => {
    try {
      if (group.kind === 'taxonomy-attach' || group.kind === 'taxonomy-detach') {
        const id = group.payload.id
        const terms = Array.isArray(group.payload.terms) ? group.payload.terms : []
        const termCalls = await Promise.allSettled(
          terms.map((term) => runAction(group.action, { id, term })),
        )
        const failedTerm = termCalls.find((entry) => entry.status === 'rejected')
        if (failedTerm && failedTerm.status === 'rejected') {
          return {
            group,
            status: 'failed',
            error: failedTerm.reason,
          }
        }

        return {
          group,
          status: 'success',
          result: termCalls,
        }
      }

      const result = await runAction(group.action, group.payload)
      return {
        group,
        status: 'success',
        result,
      }
    }
    catch (error) {
      return {
        group,
        status: 'failed',
        error,
      }
    }
  })

  return await Promise.all(tasks)
}

const executeWidgetSave = async (widget: ModelUIWidgetSpec) => {
  const groups = buildActionGroupsForFields(widget.fields)
  if (!groups.length) return

  const results = await executeActionGroups(groups)
  const failed = results.filter(result => result.status === 'failed')
  if (failed.length) {
    const failedActions = failed.map(result => result.group.action).join(', ')
    throw new Error(`Failed grouped save actions: ${failedActions}`)
  }
}

const buildActionGroups = (fields: ModelUIFieldSpec[]) => {
  return buildActionGroupsForFields(fields)
}

const saveGroups = async (groups: ActionGroup[]) => {
  return await executeActionGroups(groups)
}

const buildOverrideContext = (tab: ModelUITabSpec, widget?: ModelUIWidgetSpec) => {
  return {
    model: modelParam.value,
    rid: ridParam.value,
    spec: spec.value,
    record: sourceRecord.value,
    identifiers: recordIdentifiers.value,
    tab,
    widget: widget ?? null,
    fields: fieldState.value,
    getField: (key: string) => fieldState.value[key],
    setField: (key: string, value: unknown) => {
      fieldState.value = {
        ...fieldState.value,
        [key]: value,
      }
    },
    runAction,
    buildActionGroups: (fields?: ModelUIFieldSpec[]) => {
      const target = fields ?? widget?.fields ?? []
      return buildActionGroups(target)
    },
    saveGroups,
    saveWidget: widget ? () => saveWidget(widget) : undefined,
    refreshRecord,
  }
}

const saveWidget = async (widget: ModelUIWidgetSpec) => {
  widgetSaving.value = {
    ...widgetSaving.value,
    [widget.id]: true,
  }

  try {
    await executeWidgetSave(widget)
    await refreshRecord()
    notice.value = `Saved ${widget.label || widget.name || widget.id}.`
    noticeTone.value = 'success'
    const taxonomyInWidget = widget.fields.filter(field => isTaxonomyField(field))
    if (taxonomyInWidget.length > 0) {
      await refreshTaxonomyFields(taxonomyInWidget)
    }
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to save ${widget.label || widget.name || widget.id}.`
    noticeTone.value = 'error'
  }
  finally {
    widgetSaving.value = {
      ...widgetSaving.value,
      [widget.id]: false,
    }
  }
}
</script>

<template>
  <section class="a-grid">
    <header v-if="spec?.single.global.showHeader" class="a-card a-card--hero record-header">
      <div>
        <p class="a-eyebrow">{{ modelLabel }} Management</p>
        <h1 class="a-title">{{ ridParam }}</h1>
        <p class="a-copy">
          Generated single-record workspace from committed model spec.
        </p>
      </div>
      <div class="record-header__actions">
        <span v-if="spec?.single.global.enableInstanceManagement" class="a-chip">Instance Management Enabled</span>
        <NuxtLink class="a-btn a-btn--subtle" :to="directoryRoute">Back to Directory</NuxtLink>
        <button class="a-btn a-btn--subtle" type="button" :disabled="saving" @click="saveDraft">
          {{ saving ? 'Saving…' : 'Save Draft' }}
        </button>
        <button
          v-if="spec?.single.global.enablePostStatus"
          class="a-btn a-btn--primary"
          type="button"
          :disabled="publishing"
          @click="publishRecord"
        >
          {{ publishing ? 'Publishing…' : 'Publish' }}
        </button>
      </div>
    </header>

    <p v-if="notice" class="record-notice" :class="noticeTone === 'error' ? 'is-error' : ''">{{ notice }}</p>
    <p v-if="specError" class="record-error">
      Failed to load model spec. Open <code>/models/{{ modelParam }}</code> and commit layout first.
    </p>
    <p v-else-if="recordError" class="record-error">
      Failed to load record data. Validate TypeSense resource routing in <code>/models/{{ modelParam }}</code>.
    </p>

    <section class="record-grid">
      <aside class="a-card record-nav">
        <p class="a-eyebrow">Tabs</p>
        <div class="record-nav__stack smt-050">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="record-nav__item"
            :class="activeTabSlug === tab.slug ? 'is-active' : ''"
            type="button"
            @click="activeTabSlug = tab.slug"
          >
            {{ tab.label }}
          </button>
        </div>
      </aside>

      <main class="record-main">
        <template v-if="activeTab">
          <component
            :is="activeTabOverrideComponent"
            v-if="activeTabOverrideComponent"
            class="a-card widget-override"
            :context="buildOverrideContext(activeTab)"
          />

          <template v-else>
            <section
              v-for="row in resolveRuntimeRows(activeTab)"
              :key="row.id"
              class="layout-row"
              :class="row.class"
              :style="runtimeRowStyle(row)"
            >
              <div
                v-for="column in row.columns"
                :key="column.id"
                class="layout-col"
                :class="column.class"
                :style="runtimeColumnStyle(row, column)"
              >
                <div class="layout-widget-grid" :style="runtimeWidgetGridStyle()">
                  <div
                    v-for="widget in column.primary"
                    :key="widget.id"
                    class="layout-widget"
                    :style="runtimeWidgetStyle(column, widget)"
                  >
                    <component
                      :is="widgetOverrideFor(widget)"
                      v-if="widgetOverrideFor(widget)"
                      class="a-card widget-override"
                      :context="buildOverrideContext(activeTab, widget)"
                    />

                    <FieldSectionCard
                      v-else-if="widget.type === 'fields-card'"
                      :title="widget.label"
                      :description="widget.subtitle"
                    >
                      <div class="widget-fields">
                        <div
                          v-for="layoutRow in widgetLayoutRows(widget)"
                          :key="`${widget.id}-${layoutRow.id}`"
                          class="widget-fields__row"
                          :class="layoutRow.class"
                        >
                          <div
                            v-for="layoutColumn in layoutRow.columns"
                            :key="`${widget.id}-${layoutRow.id}-${layoutColumn.id}`"
                            class="widget-fields__col"
                            :class="layoutColumn.class"
                          >
                            <template
                              v-for="field in layoutColumn.fields"
                              :key="field.id"
                            >
                              <ATaxonomyManager
                                v-if="isTaxonomyField(field)"
                                :model-value="taxonomyTreeForField(field)"
                                :checked-ids="taxonomySelectedIdsForField(field)"
                                :taxonomy-label="field.label || toLabel(resolveFieldKey(field))"
                                :title="field.label || toLabel(resolveFieldKey(field))"
                                :description="taxonomyState[resolveFieldKey(field)]?.error || 'Manage taxonomy terms for this record.'"
                                :draggable="!isFieldReadOnly(field)"
                                :checkable="!isFieldReadOnly(field)"
                                :create-term-action="isFieldReadOnly(field) ? undefined : ((payload) => createTaxonomyTerm(field, payload))"
                                @update:model-value="setTaxonomyTreeForField(field, $event)"
                                @update:checked-ids="setFieldValue(field, $event)"
                              />
                              <component
                                :is="resolveFieldComponent(field.component.name)"
                                v-else
                                :model-value="fieldState[resolveFieldKey(field)]"
                                v-bind="resolveFieldProps(field)"
                                @update:model-value="setFieldValue(field, $event)"
                              />
                            </template>
                          </div>
                        </div>
                      </div>

                      <div v-if="widget.saveLabel || widget.action" class="widget-actions smt-050">
                        <button
                          class="a-btn a-btn--subtle"
                          type="button"
                          :disabled="Boolean(widgetSaving[widget.id])"
                          @click="saveWidget(widget)"
                        >
                          {{ widgetSaving[widget.id] ? 'Saving…' : (widget.saveLabel || 'Save') }}
                        </button>
                      </div>
                    </FieldSectionCard>

                    <article v-else class="a-card widget-generic">
                      <h3 class="widget-generic__title">{{ widget.label || widget.name }}</h3>
                      <p class="a-copy">Custom widget placeholder (type={{ widget.type }})</p>
                    </article>
                  </div>
                </div>
              </div>
            </section>
          </template>
        </template>

        <article v-else class="a-card">
          <p class="a-copy">No tabs configured for this model yet.</p>
        </article>
      </main>
    </section>

    <section v-if="specPending || recordPending" class="a-card">
      <p class="a-copy">Loading model layout and record state…</p>
    </section>
  </section>
</template>

<style scoped>
.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.record-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.record-notice {
  margin: 0;
  color: var(--admin-success);
  font-size: var(--fs--075, 0.86rem);
}

.record-notice.is-error {
  color: var(--admin-danger);
}

.record-error {
  margin: 0;
  color: var(--admin-danger);
  font-size: var(--fs--075, 0.86rem);
}

.record-grid {
  display: grid;
  grid-template-columns: minmax(220px, 248px) minmax(0, 1fr);
  gap: 0.78rem;
}

.record-nav {
  padding: 0.85rem;
  height: fit-content;
  position: sticky;
  top: 0.8rem;
}

.record-nav__stack {
  display: grid;
  gap: 0.22rem;
}

.record-nav__item {
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text-soft);
  padding: 0.48rem 0.58rem;
  cursor: pointer;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}

.record-nav__item:hover {
  color: var(--admin-text);
  background: var(--colors-slate-50);
  border-color: var(--colors-slate-200);
  transform: translateY(-1px);
}

.record-nav__item.is-active {
  color: var(--admin-text);
  background: var(--colors-slate-100);
}

.record-main {
  display: grid;
  gap: 0.52rem;
}

.layout-row {
  gap: 0.55rem;
}

.layout-col {
  gap: 0.55rem;
  min-width: 0;
}

.layout-widget-grid {
  display: grid;
  gap: 0.55rem;
}

.layout-widget {
  min-width: 0;
}

.widget-override {
  width: 100%;
  min-width: 0;
}

.widget-fields {
  display: grid;
  gap: 0.52rem;
}

.widget-fields__row {
  display: grid;
  gap: 0.52rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.widget-fields__col {
  display: grid;
  gap: 0.52rem;
  min-width: 0;
}

.widget-actions {
  display: flex;
  justify-content: flex-end;
}

.widget-generic__title {
  margin: 0;
  font-size: var(--fs-025, 1.04rem);
  color: var(--admin-text);
  letter-spacing: -0.01em;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .record-header {
    flex-direction: column;
  }

  .record-grid {
    grid-template-columns: 1fr;
  }

  .record-nav {
    position: static;
  }
}

@media (max-width: 760px) {
  .widget-fields__row {
    grid-template-columns: 1fr;
  }
}
</style>
