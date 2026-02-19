<script setup lang="ts">
import type {
  ModelLayoutSpec,
  ModelUIFieldBinding,
  ModelUIFieldBindingModel,
  ModelUIFieldBindingSubtable,
  ModelUIFieldBindingTaxonomy,
  ModelSpecResponse,
  ModelUIFieldSpec,
  ModelUITabSpec,
  ModelUIWidgetSpec,
} from '../../../types/model-spec'
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
const modelDataMode = computed<'local' | 'remote'>(() => modelInfo.value?.dataMode === 'remote' ? 'remote' : 'local')
const directoryRoute = computed(() => spec.value?.directory.route || `/admin/${modelParam.value}`)
const sourceRecord = computed<Record<string, any> | null>(() => {
  const value = recordData.value?.record
  return value && typeof value === 'object' ? value : null
})
const recordIdentifiers = computed(() => recordData.value?.identifiers ?? null)

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
    dataLocation: modelDataMode.value,
    autoToast: false,
    consoleLogging: mode === 'mutate',
    trackAttempts: false,
    throwOnFailure: true,
  }

  if (modelDataMode.value === 'remote') {
    const instances = resolveProcessInstances()
    if (!instances.length) {
      throw new Error('Remote data mode requires at least one instance on the record.')
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
    for (const row of tab.primary) {
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

    setFieldValue(field, selected)
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
  if (name === 'ACombobox') return ACombobox
  if (name === 'AComboboxAsync') return AComboboxAsync
  if (name === 'AColorPicker') return AColorPicker
  return AInput
}

const resolveFieldProps = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field)
  const options = field.component?.options || {}
  const base = {
    label: field.label || toLabel(key),
    helperText: options.helperText || `modelKey=${key}`,
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
    }
  }

  return {
    ...base,
    type: String(options.type ?? 'text'),
    placeholder,
  }
}

function setFieldValue(field: ModelUIFieldSpec, value: unknown) {
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

const executeWidgetSave = async (widget: ModelUIWidgetSpec) => {
  const modelPayloadByAction = new Map<string, Record<string, any>>()
  const subtablePayloadByAction = new Map<string, Record<string, any>>()
  const taxonomyFields: Array<{ field: ModelUIFieldSpec, binding: ModelUIFieldBindingTaxonomy }> = []

  for (const field of widget.fields) {
    const fieldKey = resolveFieldKey(field)
    const binding = resolveFieldBinding(field)
    const value = normalizePayloadValue(field, fieldState.value[fieldKey])

    if (binding.kind === 'model') {
      const payload = modelPayloadByAction.get(binding.action) ?? {}
      payload[binding.payloadKey] = value
      modelPayloadByAction.set(binding.action, payload)
      continue
    }

    if (binding.kind === 'subtable') {
      const payload = subtablePayloadByAction.get(binding.action) ?? {}
      payload[binding.payloadKey] = value
      subtablePayloadByAction.set(binding.action, payload)
      continue
    }

    if (binding.kind === 'taxonomy') {
      taxonomyFields.push({ field, binding })
      continue
    }

    if (binding.kind === 'custom') {
      throw new Error(`Custom save handlers are not implemented for widget save (${binding.handler}).`)
    }
  }

  const recordId = resolveMutationRecordId()
  if (!recordId) {
    throw new Error('Could not resolve record id for save.')
  }

  for (const [action, payload] of modelPayloadByAction.entries()) {
    await $process(
      action,
      {
        id: recordId,
        payload,
      },
      buildProcessOptions('mutate'),
    )
  }

  for (const [action, payload] of subtablePayloadByAction.entries()) {
    await $process(
      action,
      {
        id: recordId,
        payload,
      },
      buildProcessOptions('mutate'),
    )
  }

  for (const entry of taxonomyFields) {
    const field = entry.field
    const binding = entry.binding
    const key = resolveFieldKey(field)
    const state = taxonomyStateFor(field)

    const current = unique(
      (Array.isArray(fieldState.value[key]) ? fieldState.value[key] : [])
        .map((item: unknown) => String(item ?? '').trim())
        .filter(Boolean),
    )
    const previous = unique(
      (state.initialSelected ?? [])
        .map((item) => String(item ?? '').trim())
        .filter(Boolean),
    )
    const currentSet = new Set(current)
    const previousSet = new Set(previous)

    const added = current.filter(id => !previousSet.has(id))
    const removed = previous.filter(id => !currentSet.has(id))

    for (const term of removed) {
      await $process(
        binding.actions.detach,
        { id: recordId, term },
        buildProcessOptions('mutate'),
      )
    }
    for (const term of added) {
      await $process(
        binding.actions.attach,
        { id: recordId, term },
        buildProcessOptions('mutate'),
      )
    }

    taxonomyState.value = {
      ...taxonomyState.value,
      [key]: {
        ...state,
        initialSelected: current,
      },
    }
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
          <section
            v-for="row in activeTab.primary"
            :key="row.id"
            class="layout-row"
            :class="row.class"
          >
            <div
              v-for="column in row.columns"
              :key="column.id"
              class="layout-col"
              :class="column.class"
            >
              <template v-for="widget in column.primary" :key="widget.id">
                <FieldSectionCard
                  v-if="widget.type === 'fields-card'"
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
                            :create-term-action="(payload) => createTaxonomyTerm(field, payload)"
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
              </template>
            </div>
          </section>
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
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.layout-col {
  display: grid;
  gap: 0.55rem;
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
