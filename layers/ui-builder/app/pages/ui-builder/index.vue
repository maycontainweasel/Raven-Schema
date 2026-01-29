<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { models as schemaModels } from '@schema/models'
import TypesenseDirectoryPage from '~/components/admin/directory/TypesenseDirectoryPage.vue'
import ManagementPreview from '~/components/ui-builder/ManagementPreview.vue'
import TypesensePanel from '~/components/ui-builder/TypesensePanel.vue'

const { data, pending, refresh } = await useFetch('/api/ui-builder/specs')

const specs = computed(() => (data.value as any)?.specs ?? [])

const modelOptions = computed(() => {
  const fromSpecs = specs.value.map((spec: any) => String(spec.model ?? spec.table ?? spec.name ?? ''))
  const fromModels = Object.keys(schemaModels ?? {})
  const merged = new Set<string>()
  ;[...fromSpecs, ...fromModels].forEach((value) => {
    if (!value) return
    merged.add(String(value).toLowerCase())
  })
  return Array.from(merged).sort()
})

const selectedModel = ref('')

watch(
  () => modelOptions.value,
  (next) => {
    if (!next.length) return
    if (!selectedModel.value) {
      selectedModel.value = next[0]
    }
  },
  { immediate: true }
)

const toTitleCase = (value: string) =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase())

const toSlug = (value: string) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const buildDefaultSpec = (modelKey: string) => {
  const namespace = modelKey.endsWith('s') ? modelKey : `${modelKey}s`
  return {
    version: 1,
    kind: 'ui',
    name: toTitleCase(modelKey),
    model: modelKey,
    table: modelKey,
    namespace,
    route: {
      base: `/${namespace}`,
      single: `/${namespace}/<id.id>`
    },
    dialogs: {
      create: {
        template: 'auto',
        required: [],
        fields: []
      }
    },
    overview: {
      type: 'typesense',
      meta: {
        title: `${toTitleCase(modelKey)} Overview`,
        subtitle: `Typesense directory for the ${toTitleCase(modelKey)} model.`
      },
      actions: ['create', 'refresh'],
      table: { columns: [] },
      typesense: {
        queryBy: [],
        sortableFields: [],
        filters: []
      }
    },
    single: {
      layout: 'navigation-primary',
      store: {
        key: modelKey,
        resolver: 'id.id'
      },
      tabs: []
    }
  }
}

const normalizeTab = (tab: any, index: number, pageMap: Map<string, any>) => {
  if (typeof tab === 'string') {
    const slug = toSlug(tab)
    return { label: tab, slug, content: pageMap.get(slug) ?? [] }
  }
  if (tab && typeof tab === 'object' && !Array.isArray(tab)) {
    const keys = Object.keys(tab)
    if (!('label' in tab) && !('slug' in tab) && keys.length === 1) {
      const label = keys[0]
      const payload = (tab as any)[label]
      const slug = payload?.slug ?? toSlug(label)
      const content = payload?.content ?? payload?.primary ?? pageMap.get(slug) ?? []
      return { label, slug, content }
    }
    const label = tab.label ?? tab.name ?? tab.slug ?? `Tab ${index + 1}`
    const slug = tab.slug ?? tab.key ?? toSlug(label)
    const content = tab.content ?? tab.primary ?? pageMap.get(slug) ?? []
    return { label: String(label), slug: String(slug), content }
  }
  return { label: `Tab ${index + 1}`, slug: `tab-${index + 1}`, content: [] }
}

function normalizeColumn(column: any, colIndex: number, modelKey: string) {
  if (Array.isArray(column)) {
    return {
      id: makeId(`${modelKey}-col`),
      class: undefined,
      widgets: column.map((widget, widgetIndex) => normalizeWidget(widget, widgetIndex, modelKey))
    }
  }
  if (column && typeof column === 'object' && 'widgets' in column) {
    return {
      id: column.id ?? makeId(`${modelKey}-col`),
      class: column.class,
      widgets: Array.isArray(column.widgets)
        ? column.widgets.map((widget: any, widgetIndex: number) => normalizeWidget(widget, widgetIndex, modelKey))
        : []
    }
  }
  if (column && typeof column === 'object' && 'type' in column) {
    return {
      id: makeId(`${modelKey}-col`),
      class: undefined,
      widgets: [normalizeWidget(column, 0, modelKey)]
    }
  }
  return { id: makeId(`${modelKey}-col`), class: undefined, widgets: [] }
}

function normalizeWidget(widget: any, widgetIndex: number, modelKey: string) {
  if (widget && typeof widget === 'object') {
    return {
      type: widget.type ?? 'fields-card',
      id: widget.id ?? makeId(`${modelKey}-card`),
      title: widget.title ?? '',
      subtitle: widget.subtitle ?? '',
      fields: Array.isArray(widget.fields) ? widget.fields : [],
      content: widget.content,
      save: widget.save,
      saveLabel: widget.saveLabel
    }
  }
  return {
    type: 'fields-card',
    id: makeId(`${modelKey}-card`),
    title: `Card ${widgetIndex + 1}`,
    subtitle: '',
    fields: []
  }
}

function normalizeRow(row: any, rowIndex: number, modelKey: string) {
  if (row && typeof row === 'object' && !Array.isArray(row) && 'primary' in row) {
    return {
      id: row.id ?? makeId(`${modelKey}-row`),
      class: row.class,
      primary: Array.isArray(row.primary) ? row.primary.map((col: any, colIndex: number) => normalizeColumn(col, colIndex, modelKey)) : []
    }
  }
  if (Array.isArray(row)) {
    return {
      id: makeId(`${modelKey}-row`),
      class: undefined,
      primary: row.map((col, colIndex) => normalizeColumn(col, colIndex, modelKey))
    }
  }
  if (row && typeof row === 'object' && 'widgets' in row) {
    return {
      id: makeId(`${modelKey}-row`),
      class: undefined,
      primary: [normalizeColumn(row, 0, modelKey)]
    }
  }
  return { id: makeId(`${modelKey}-row`), class: undefined, primary: [] }
}

const normalizeSpecForBuilder = (spec: any, modelKey: string) => {
  if (!spec.overview) spec.overview = { type: 'typesense', meta: {}, table: {}, typesense: {} }
  if (!spec.overview.table) spec.overview.table = {}
  if (!Array.isArray(spec.overview.table.columns)) spec.overview.table.columns = []
  if (!spec.overview.typesense) spec.overview.typesense = {}
  if (!Array.isArray(spec.overview.typesense.queryBy)) spec.overview.typesense.queryBy = []
  if (!Array.isArray(spec.overview.typesense.sortableFields)) spec.overview.typesense.sortableFields = []
  if (!Array.isArray(spec.overview.typesense.filters)) spec.overview.typesense.filters = []

  if (!spec.dialogs) spec.dialogs = {}
  if (!spec.dialogs.create) spec.dialogs.create = { template: 'auto', required: [], fields: [] }
  if (!Array.isArray(spec.dialogs.create.required)) spec.dialogs.create.required = []
  if (!Array.isArray(spec.dialogs.create.fields)) spec.dialogs.create.fields = []

  if (!spec.single) spec.single = { layout: 'navigation-primary', store: { key: modelKey, resolver: 'id.id' }, tabs: [] }
  if (!spec.single.store) spec.single.store = { key: modelKey, resolver: 'id.id' }
  if (!Array.isArray(spec.single.tabs)) spec.single.tabs = []

  const pageMap = new Map<string, any>()
  const rawPages = spec.single.pages ?? []
  if (Array.isArray(rawPages)) {
    rawPages.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return
      const keys = Object.keys(entry)
      if (!keys.length) return
      const label = keys[0]
      const payload = entry[label]
      const slug = payload?.slug ?? toSlug(label)
      pageMap.set(slug, payload?.content ?? payload?.primary ?? payload)
    })
  }

  spec.single.tabs = spec.single.tabs.map((tab: any, index: number) => {
    const normalized = normalizeTab(tab, index, pageMap)
    const content = Array.isArray(normalized.content) ? normalized.content : []
    return {
      label: normalized.label,
      slug: normalized.slug,
      content: content.map((row: any, rowIndex: number) => normalizeRow(row, rowIndex, modelKey))
    }
  })

  return spec
}

const specDraft = ref<any>(null)
const specJson = ref('')
const specError = ref('')
const draftSource = ref<'existing' | 'default'>('default')

const selectSpec = () => {
  const modelKey = selectedModel.value
  if (!modelKey) return
  const existing = specs.value.find((spec: any) =>
    String(spec.model ?? spec.table ?? spec.name ?? '').toLowerCase() === modelKey
  )
  const resolved = existing ? JSON.parse(JSON.stringify(existing)) : buildDefaultSpec(modelKey)
  specDraft.value = normalizeSpecForBuilder(resolved, modelKey)
  specJson.value = JSON.stringify(specDraft.value, null, 2)
  specError.value = ''
  draftSource.value = existing ? 'existing' : 'default'
}

watch(
  () => selectedModel.value,
  () => selectSpec(),
  { immediate: true }
)

watch(
  () => specs.value,
  () => {
    if (draftSource.value === 'default') selectSpec()
  },
  { deep: true }
)

watch(
  () => specDraft.value,
  (next) => {
    if (!next) return
    specJson.value = JSON.stringify(next, null, 2)
  },
  { deep: true }
)

const viewMode = ref<'directory' | 'management'>('directory')
const showSpecPanel = ref(true)
const showTypesense = ref(false)
const specPanelTab = ref<'builder' | 'json'>('builder')
const builderSection = ref<'directory' | 'management'>('directory')

const applySpecJson = () => {
  specError.value = ''
  try {
    const parsed = JSON.parse(specJson.value)
    specDraft.value = normalizeSpecForBuilder(parsed, selectedModel.value)
  } catch (error: any) {
    specError.value = error?.message ?? 'Invalid JSON'
  }
}

const publish = async () => {
  if (!specDraft.value) return
  specError.value = ''
  try {
    const result = await $fetch('/api/ui-builder/publish', {
      method: 'POST',
      body: { spec: specDraft.value, generate: true }
    })
    await refresh()
    const { $notify } = useNuxtApp()
    $notify?.success?.(`Published ${result.modelKey}`)
  } catch (error: any) {
    specError.value = error?.data?.statusMessage ?? error?.message ?? 'Publish failed'
  }
}

const activeSpec = computed(() => specDraft.value)
const activeModel = computed(() => selectedModel.value)

const listAtPath = (path: string[]) => {
  let cursor: any = specDraft.value
  for (const key of path) {
    if (!cursor || typeof cursor !== 'object') return []
    cursor = cursor[key]
  }
  return Array.isArray(cursor) ? cursor : []
}

const ensureListAtPath = (path: string[]) => {
  let cursor: any = specDraft.value
  path.forEach((key, index) => {
    if (!cursor[key]) cursor[key] = index === path.length - 1 ? [] : {}
    if (index === path.length - 1 && !Array.isArray(cursor[key])) cursor[key] = []
    cursor = cursor[key]
  })
  return cursor as any[]
}

const addListItem = (path: string[], value: string) => {
  if (!value.trim() || !specDraft.value) return
  const list = ensureListAtPath(path)
  if (!list.includes(value)) list.push(value)
}

const removeListItem = (path: string[], index: number) => {
  if (!specDraft.value) return
  const list = ensureListAtPath(path)
  list.splice(index, 1)
}

const moveListItem = (path: string[], index: number, direction: number) => {
  if (!specDraft.value) return
  const list = ensureListAtPath(path)
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= list.length) return
  const [item] = list.splice(index, 1)
  list.splice(nextIndex, 0, item)
}

const availableFields = computed(() => {
  const set = new Set<string>()
  const createFields = specDraft.value?.dialogs?.create?.fields ?? []
  createFields.forEach((field: any) => {
    if (field?.key) set.add(String(field.key))
    if (field?.field) set.add(String(field.field))
  })
  listAtPath(['overview', 'table', 'columns']).forEach((field: string) => set.add(field))
  listAtPath(['overview', 'typesense', 'queryBy']).forEach((field: string) => set.add(field))
  listAtPath(['overview', 'typesense', 'sortableFields']).forEach((field: string) => set.add(field))
  listAtPath(['overview', 'typesense', 'filters']).forEach((field: string) => set.add(field))
  return Array.from(set).filter(Boolean).sort()
})

const newColumnKey = ref('')
const newQueryBy = ref('')
const newSortableField = ref('')
const newFilterField = ref('')

const fieldDrafts = reactive<Record<string, string>>({})

const addTab = () => {
  if (!specDraft.value) return
  const label = `Tab ${specDraft.value.single.tabs.length + 1}`
  specDraft.value.single.tabs.push({
    label,
    slug: toSlug(label),
    content: []
  })
}

const removeTab = (index: number) => {
  if (!specDraft.value) return
  specDraft.value.single.tabs.splice(index, 1)
}

const moveTab = (index: number, direction: number) => {
  if (!specDraft.value) return
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= specDraft.value.single.tabs.length) return
  const [tab] = specDraft.value.single.tabs.splice(index, 1)
  specDraft.value.single.tabs.splice(nextIndex, 0, tab)
}

const addRow = (tabIndex: number) => {
  if (!specDraft.value) return
  const tab = specDraft.value.single.tabs[tabIndex]
  if (!tab) return
  tab.content.push({
    id: makeId(`${activeModel.value}-row`),
    class: '',
    primary: []
  })
}

const removeRow = (tabIndex: number, rowIndex: number) => {
  if (!specDraft.value) return
  const tab = specDraft.value.single.tabs[tabIndex]
  if (!tab) return
  tab.content.splice(rowIndex, 1)
}

const moveRow = (tabIndex: number, rowIndex: number, direction: number) => {
  if (!specDraft.value) return
  const tab = specDraft.value.single.tabs[tabIndex]
  if (!tab) return
  const nextIndex = rowIndex + direction
  if (nextIndex < 0 || nextIndex >= tab.content.length) return
  const [row] = tab.content.splice(rowIndex, 1)
  tab.content.splice(nextIndex, 0, row)
}

const addColumn = (tabIndex: number, rowIndex: number) => {
  if (!specDraft.value) return
  const row = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]
  if (!row) return
  row.primary.push({
    id: makeId(`${activeModel.value}-col`),
    class: '',
    widgets: []
  })
}

const removeColumn = (tabIndex: number, rowIndex: number, colIndex: number) => {
  if (!specDraft.value) return
  const row = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]
  if (!row) return
  row.primary.splice(colIndex, 1)
}

const moveColumn = (tabIndex: number, rowIndex: number, colIndex: number, direction: number) => {
  if (!specDraft.value) return
  const row = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]
  if (!row) return
  const nextIndex = colIndex + direction
  if (nextIndex < 0 || nextIndex >= row.primary.length) return
  const [col] = row.primary.splice(colIndex, 1)
  row.primary.splice(nextIndex, 0, col)
}

const addCard = (tabIndex: number, rowIndex: number, colIndex: number) => {
  if (!specDraft.value) return
  const column = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]
  if (!column) return
  column.widgets.push({
    type: 'fields-card',
    id: makeId(`${activeModel.value}-card`),
    title: 'New Card',
    subtitle: '',
    fields: []
  })
}

const removeCard = (tabIndex: number, rowIndex: number, colIndex: number, cardIndex: number) => {
  if (!specDraft.value) return
  const column = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]
  if (!column) return
  column.widgets.splice(cardIndex, 1)
}

const moveCard = (tabIndex: number, rowIndex: number, colIndex: number, cardIndex: number, direction: number) => {
  if (!specDraft.value) return
  const column = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]
  if (!column) return
  const nextIndex = cardIndex + direction
  if (nextIndex < 0 || nextIndex >= column.widgets.length) return
  const [card] = column.widgets.splice(cardIndex, 1)
  column.widgets.splice(nextIndex, 0, card)
}

const addField = (
  tabIndex: number,
  rowIndex: number,
  colIndex: number,
  cardIndex: number,
  fieldKey?: string
) => {
  if (!specDraft.value) return
  const card = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets?.[cardIndex]
  if (!card) return
  const key = (fieldKey ?? '').trim()
  if (!key) return
  card.fields.push({
    field: key,
    label: toTitleCase(key),
    type: 'text'
  })
}

const removeField = (
  tabIndex: number,
  rowIndex: number,
  colIndex: number,
  cardIndex: number,
  fieldIndex: number
) => {
  if (!specDraft.value) return
  const card = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets?.[cardIndex]
  if (!card) return
  card.fields.splice(fieldIndex, 1)
}

const fieldTypes = ['text', 'number', 'textarea', 'select', 'listbox', 'combobox', 'date', 'color', 'taxonomy-manager', 'wysiwyg']

const emptyDrag = () => ({ tab: -1, row: -1, col: -1, card: -1, field: -1 })

const dragState = reactive<{ type: string; from: { tab: number; row: number; col: number; card: number; field: number } }>({
  type: '',
  from: emptyDrag()
})

const dropTarget = reactive<{ type: string; to: { tab: number; row: number; col: number; card: number; field: number } }>({
  type: '',
  to: emptyDrag()
})

const beginDrag = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>, event: DragEvent) => {
  dragState.type = type
  dragState.from = { ...emptyDrag(), ...payload }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ type, ...payload }))
  }
}

const setDropTarget = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>) => {
  dropTarget.type = type
  dropTarget.to = { ...emptyDrag(), ...payload }
}

const clearDropTarget = () => {
  dropTarget.type = ''
  dropTarget.to = emptyDrag()
}

const clearDrag = () => {
  dragState.type = ''
  dragState.from = emptyDrag()
  clearDropTarget()
}

const reorderList = (list: any[], fromIndex: number, toIndex: number) => {
  if (!Array.isArray(list)) return
  if (fromIndex < 0 || toIndex < 0) return
  if (fromIndex === toIndex) return
  if (fromIndex >= list.length || toIndex >= list.length) return
  const [item] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, item)
}

const reorderListInsert = (list: any[], fromIndex: number, toIndex: number) => {
  if (!Array.isArray(list)) return
  if (fromIndex < 0) return
  if (toIndex < 0) toIndex = 0
  if (toIndex > list.length) toIndex = list.length
  const normalizedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
  if (normalizedIndex === fromIndex) return
  const [item] = list.splice(fromIndex, 1)
  list.splice(normalizedIndex, 0, item)
}

const moveBetweenLists = (fromList: any[], toList: any[], fromIndex: number, toIndex: number) => {
  if (!Array.isArray(fromList) || !Array.isArray(toList)) return
  if (fromIndex < 0 || fromIndex >= fromList.length) return
  if (fromList === toList) {
    reorderListInsert(fromList, fromIndex, toIndex)
    return
  }
  if (toIndex < 0) toIndex = 0
  if (toIndex > toList.length) toIndex = toList.length
  const [item] = fromList.splice(fromIndex, 1)
  if (item === undefined) return
  toList.splice(toIndex, 0, item)
}

const matchTarget = (
  type: string,
  payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>,
  target: { type: string; to: { tab: number; row: number; col: number; card: number; field: number } }
) => {
  if (target.type !== type) return false
  const next = { ...emptyDrag(), ...payload }
  return (
    target.to.tab === next.tab &&
    target.to.row === next.row &&
    target.to.col === next.col &&
    target.to.card === next.card &&
    target.to.field === next.field
  )
}

const isDropTarget = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>) =>
  matchTarget(type, payload, dropTarget)

const isDragging = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>) =>
  matchTarget(type, payload, { type: dragState.type, to: dragState.from })

const dropOutline = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>) =>
  isDropTarget(type, payload)
    ? 'outline: 2px dashed var(--primary, #6b5cff); outline-offset: 4px;'
    : ''

const dropZoneClass = (type: string, payload: Partial<{ tab: number; row: number; col: number; card: number; field: number }>) =>
  isDropTarget(type, payload) ? 'border-primary/60 bg-primary/10' : 'border-transparent'

const dropTab = (targetIndex: number) => {
  if (dragState.type !== 'tab' || !specDraft.value) return
  reorderList(specDraft.value.single.tabs, dragState.from.tab, targetIndex)
  clearDrag()
}

const dropTabSlot = (targetIndex: number) => {
  if (dragState.type !== 'tab' || !specDraft.value) return
  reorderListInsert(specDraft.value.single.tabs, dragState.from.tab, targetIndex)
  clearDrag()
}

const dropRow = (tabIndex: number, targetIndex: number) => {
  if (dragState.type !== 'row' || !specDraft.value) return
  const fromList = specDraft.value.single.tabs[dragState.from.tab]?.content ?? []
  const toList = specDraft.value.single.tabs[tabIndex]?.content ?? []
  moveBetweenLists(fromList, toList, dragState.from.row, targetIndex)
  clearDrag()
}

const dropRowSlot = (tabIndex: number, targetIndex: number) => {
  if (dragState.type !== 'row' || !specDraft.value) return
  const fromList = specDraft.value.single.tabs[dragState.from.tab]?.content ?? []
  const toList = specDraft.value.single.tabs[tabIndex]?.content ?? []
  moveBetweenLists(fromList, toList, dragState.from.row, targetIndex)
  clearDrag()
}

const dropColumn = (tabIndex: number, rowIndex: number, targetIndex: number) => {
  if (dragState.type !== 'column' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary ?? []
  const toList = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary ?? []
  moveBetweenLists(fromList, toList, dragState.from.col, targetIndex)
  clearDrag()
}

const dropColumnSlot = (tabIndex: number, rowIndex: number, targetIndex: number) => {
  if (dragState.type !== 'column' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary ?? []
  const toList = specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary ?? []
  moveBetweenLists(fromList, toList, dragState.from.col, targetIndex)
  clearDrag()
}

const dropCard = (tabIndex: number, rowIndex: number, colIndex: number, targetIndex: number) => {
  if (dragState.type !== 'card' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary?.[
      dragState.from.col
    ]?.widgets ?? []
  const toList =
    specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets ?? []
  moveBetweenLists(fromList, toList, dragState.from.card, targetIndex)
  clearDrag()
}

const dropCardSlot = (tabIndex: number, rowIndex: number, colIndex: number, targetIndex: number) => {
  if (dragState.type !== 'card' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary?.[
      dragState.from.col
    ]?.widgets ?? []
  const toList =
    specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets ?? []
  moveBetweenLists(fromList, toList, dragState.from.card, targetIndex)
  clearDrag()
}

const dropField = (tabIndex: number, rowIndex: number, colIndex: number, cardIndex: number, targetIndex: number) => {
  if (dragState.type !== 'field' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary?.[
      dragState.from.col
    ]?.widgets?.[dragState.from.card]?.fields ?? []
  const toList =
    specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets?.[
      cardIndex
    ]?.fields ?? []
  moveBetweenLists(fromList, toList, dragState.from.field, targetIndex)
  clearDrag()
}

const dropFieldSlot = (tabIndex: number, rowIndex: number, colIndex: number, cardIndex: number, targetIndex: number) => {
  if (dragState.type !== 'field' || !specDraft.value) return
  const fromList =
    specDraft.value.single.tabs[dragState.from.tab]?.content?.[dragState.from.row]?.primary?.[
      dragState.from.col
    ]?.widgets?.[dragState.from.card]?.fields ?? []
  const toList =
    specDraft.value.single.tabs[tabIndex]?.content?.[rowIndex]?.primary?.[colIndex]?.widgets?.[
      cardIndex
    ]?.fields ?? []
  moveBetweenLists(fromList, toList, dragState.from.field, targetIndex)
  clearDrag()
}

const scaffoldOverride = async (kind: string, name: string) => {
  if (!activeModel.value || !name) return
  try {
    await $fetch('/api/ui-builder/override', {
      method: 'POST',
      body: { modelKey: activeModel.value, kind, name }
    })
    const { $notify } = useNuxtApp()
    $notify?.success?.(`Override created: ${name}`)
  } catch (error: any) {
    const { $notify } = useNuxtApp()
    $notify?.error?.(error?.data?.statusMessage ?? error?.message ?? 'Failed to scaffold override')
  }
}
</script>

<template>
  <div class="-mx-6 -mt-6 min-h-[calc(100vh-120px)] bg-[var(--bg-gray-2)]">
    <div class="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
      <div class="flex h-[60px] items-center gap-3 px-6">
        <label class="text-xs uppercase tracking-[0.2em] text-muted">Model</label>
        <select v-model="selectedModel" class="select select-bordered select-sm min-w-[180px]">
          <option v-for="model in modelOptions" :key="model" :value="model">
            {{ model }}
          </option>
        </select>

        <div class="ml-4 flex items-center gap-2">
          <button
            class="btn btn-sm"
            :class="viewMode === 'directory' ? 'btn-primary' : 'btn-outline'"
            @click="viewMode = 'directory'"
          >
            Directory
          </button>
          <button
            class="btn btn-sm"
            :class="viewMode === 'management' ? 'btn-primary' : 'btn-outline'"
            @click="viewMode = 'management'"
          >
            Management
          </button>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <button class="btn btn-sm btn-outline" @click="showTypesense = true">Typesense Lab</button>
          <button class="btn btn-sm btn-outline" @click="showSpecPanel = !showSpecPanel">
            {{ showSpecPanel ? 'Hide' : 'Show' }} Spec
          </button>
          <button class="btn btn-sm btn-primary" :disabled="pending" @click="publish">Publish</button>
        </div>
      </div>
    </div>

    <div class="flex min-h-[calc(100vh-180px)]">
      <div class="flex-1 min-w-0 p-6">
        <div v-if="viewMode === 'directory'" class="space-y-6">
          <TypesenseDirectoryPage v-if="activeSpec" :spec="activeSpec" />
          <div v-else class="card">
            <div class="card-body">
              <p class="text-sm text-muted">Select a model to preview its directory.</p>
            </div>
          </div>
        </div>

        <div v-else class="space-y-6">
          <ManagementPreview v-if="activeSpec" :spec="activeSpec" :model-key="activeModel" />
          <div v-else class="card">
            <div class="card-body">
              <p class="text-sm text-muted">Select a model to preview its management page.</p>
            </div>
          </div>
        </div>
      </div>

      <aside v-if="showSpecPanel" class="w-full max-w-[420px] border-l border-border bg-white p-4 overflow-y-auto">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Spec Draft</h3>
          <div class="flex gap-2">
            <button
              class="btn btn-ghost btn-xs"
              :class="specPanelTab === 'builder' ? 'btn-primary' : ''"
              @click="specPanelTab = 'builder'"
            >
              Builder
            </button>
            <button
              class="btn btn-ghost btn-xs"
              :class="specPanelTab === 'json' ? 'btn-primary' : ''"
              @click="specPanelTab = 'json'"
            >
              JSON
            </button>
          </div>
        </div>

        <p v-if="specError" class="mt-2 text-xs text-error">{{ specError }}</p>

        <div v-if="specPanelTab === 'builder'" class="mt-4 space-y-4">
          <div class="flex items-center gap-2">
            <button
              class="btn btn-xs"
              :class="builderSection === 'directory' ? 'btn-primary' : 'btn-outline'"
              @click="builderSection = 'directory'"
            >
              Directory
            </button>
            <button
              class="btn btn-xs"
              :class="builderSection === 'management' ? 'btn-primary' : 'btn-outline'"
              @click="builderSection = 'management'"
            >
              Management
            </button>
          </div>

          <div v-if="builderSection === 'directory'" class="space-y-4">
            <div class="card">
              <div class="card-body space-y-3">
                <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Table Columns</h4>
                <div class="space-y-2">
                  <div
                    v-for="(column, index) in listAtPath(['overview', 'table', 'columns'])"
                    :key="`${column}-${index}`"
                    class="flex items-center gap-2"
                  >
                    <span class="text-sm font-medium">{{ column }}</span>
                    <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'table', 'columns'], index, -1)">↑</button>
                    <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'table', 'columns'], index, 1)">↓</button>
                    <button class="btn btn-ghost btn-xs" @click="removeListItem(['overview', 'table', 'columns'], index)">Remove</button>
                    <button
                      class="btn btn-ghost btn-xs"
                      @click="scaffoldOverride('directory-cell', String(column))"
                    >
                      Override
                    </button>
                  </div>
                </div>
                <div class="flex gap-2">
                  <input v-model="newColumnKey" class="input input-bordered input-sm flex-1" placeholder="Add column" />
                  <button
                    class="btn btn-sm btn-primary"
                    @click="addListItem(['overview', 'table', 'columns'], newColumnKey); newColumnKey = ''"
                  >
                    Add
                  </button>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="field in availableFields"
                    :key="field"
                    class="btn btn-xs btn-outline"
                    @click="addListItem(['overview', 'table', 'columns'], field)"
                  >
                    {{ field }}
                  </button>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-body space-y-3">
                <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Typesense Fields</h4>
                <div class="space-y-3">
                  <div>
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Query By</label>
                    <div class="space-y-2">
                      <div
                        v-for="(field, index) in listAtPath(['overview', 'typesense', 'queryBy'])"
                        :key="`${field}-${index}`"
                        class="flex items-center gap-2"
                      >
                        <span class="text-sm">{{ field }}</span>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'queryBy'], index, -1)">↑</button>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'queryBy'], index, 1)">↓</button>
                        <button class="btn btn-ghost btn-xs" @click="removeListItem(['overview', 'typesense', 'queryBy'], index)">Remove</button>
                      </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                      <input v-model="newQueryBy" class="input input-bordered input-sm flex-1" placeholder="Add queryBy" />
                      <button
                        class="btn btn-sm btn-outline"
                        @click="addListItem(['overview', 'typesense', 'queryBy'], newQueryBy); newQueryBy = ''"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Sortable Fields</label>
                    <div class="space-y-2">
                      <div
                        v-for="(field, index) in listAtPath(['overview', 'typesense', 'sortableFields'])"
                        :key="`${field}-${index}`"
                        class="flex items-center gap-2"
                      >
                        <span class="text-sm">{{ field }}</span>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'sortableFields'], index, -1)">↑</button>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'sortableFields'], index, 1)">↓</button>
                        <button class="btn btn-ghost btn-xs" @click="removeListItem(['overview', 'typesense', 'sortableFields'], index)">Remove</button>
                      </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                      <input v-model="newSortableField" class="input input-bordered input-sm flex-1" placeholder="Add sortable field" />
                      <button
                        class="btn btn-sm btn-outline"
                        @click="addListItem(['overview', 'typesense', 'sortableFields'], newSortableField); newSortableField = ''"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Filters</label>
                    <div class="space-y-2">
                      <div
                        v-for="(field, index) in listAtPath(['overview', 'typesense', 'filters'])"
                        :key="`${field}-${index}`"
                        class="flex items-center gap-2"
                      >
                        <span class="text-sm">{{ field }}</span>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'filters'], index, -1)">↑</button>
                        <button class="btn btn-ghost btn-xs" @click="moveListItem(['overview', 'typesense', 'filters'], index, 1)">↓</button>
                        <button class="btn btn-ghost btn-xs" @click="removeListItem(['overview', 'typesense', 'filters'], index)">Remove</button>
                      </div>
                    </div>
                    <div class="flex gap-2 mt-2">
                      <input v-model="newFilterField" class="input input-bordered input-sm flex-1" placeholder="Add filter" />
                      <button
                        class="btn btn-sm btn-outline"
                        @click="addListItem(['overview', 'typesense', 'filters'], newFilterField); newFilterField = ''"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Tabs</h4>
              <button class="btn btn-xs btn-primary" @click="addTab">Add Tab</button>
            </div>

            <template v-for="(tab, tabIndex) in specDraft?.single?.tabs ?? []" :key="tab.slug">
              <div
                class="my-2 h-2 rounded-full border border-dashed"
                :class="dropZoneClass('tab-slot', { tab: tabIndex })"
                @dragover.prevent
                @dragenter.prevent="setDropTarget('tab-slot', { tab: tabIndex })"
                @drop="dropTabSlot(tabIndex)"
              ></div>
              <div
                class="card"
                @dragover.prevent
                @dragenter.prevent="setDropTarget('tab', { tab: tabIndex })"
                @drop="dropTab(tabIndex)"
                :style="dropOutline('tab', { tab: tabIndex })"
              >
                <div class="card-body space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      class="btn btn-ghost btn-xs cursor-move"
                      draggable="true"
                      @dragstart="beginDrag('tab', { tab: tabIndex }, $event)"
                      @dragend="clearDrag"
                      :class="isDragging('tab', { tab: tabIndex }) ? 'opacity-60' : ''"
                    >
                      Drag
                    </button>
                    <input v-model="tab.label" class="input input-bordered input-sm" placeholder="Tab label" />
                    <input v-model="tab.slug" class="input input-bordered input-sm" placeholder="Tab slug" />
                    <button class="btn btn-ghost btn-xs" @click="moveTab(tabIndex, -1)">↑</button>
                    <button class="btn btn-ghost btn-xs" @click="moveTab(tabIndex, 1)">↓</button>
                    <button class="btn btn-ghost btn-xs" @click="removeTab(tabIndex)">Remove</button>
                    <button class="btn btn-ghost btn-xs" @click="scaffoldOverride('page', tab.slug)">Override</button>
                    <button class="btn btn-xs btn-outline ml-auto" @click="addRow(tabIndex)">Add Row</button>
                  </div>

                  <template v-for="(row, rowIndex) in tab.content" :key="row.id">
                    <div
                      class="my-2 h-2 rounded-full border border-dashed"
                      :class="dropZoneClass('row-slot', { tab: tabIndex, row: rowIndex })"
                      @dragover.prevent
                      @dragenter.prevent="setDropTarget('row-slot', { tab: tabIndex, row: rowIndex })"
                      @drop="dropRowSlot(tabIndex, rowIndex)"
                    ></div>
                    <div
                      class="border border-border rounded-md p-3 space-y-3"
                      @dragover.prevent
                      @dragenter.prevent="setDropTarget('row', { tab: tabIndex, row: rowIndex })"
                      @drop="dropRow(tabIndex, rowIndex)"
                      :style="dropOutline('row', { tab: tabIndex, row: rowIndex })"
                    >
                      <div class="flex flex-wrap items-center gap-2">
                        <button
                          class="btn btn-ghost btn-xs cursor-move"
                          draggable="true"
                          @dragstart="beginDrag('row', { tab: tabIndex, row: rowIndex }, $event)"
                          @dragend="clearDrag"
                          :class="isDragging('row', { tab: tabIndex, row: rowIndex }) ? 'opacity-60' : ''"
                        >
                          Drag
                        </button>
                        <input v-model="row.id" class="input input-bordered input-xs" placeholder="Row id" />
                        <input v-model="row.class" class="input input-bordered input-xs" placeholder="Row class" />
                        <button class="btn btn-ghost btn-xs" @click="moveRow(tabIndex, rowIndex, -1)">↑</button>
                        <button class="btn btn-ghost btn-xs" @click="moveRow(tabIndex, rowIndex, 1)">↓</button>
                        <button class="btn btn-ghost btn-xs" @click="removeRow(tabIndex, rowIndex)">Remove</button>
                        <button class="btn btn-ghost btn-xs" @click="scaffoldOverride('row', row.id)">Override</button>
                        <button class="btn btn-xs btn-outline ml-auto" @click="addColumn(tabIndex, rowIndex)">Add Column</button>
                      </div>

                      <template v-for="(column, colIndex) in row.primary" :key="column.id">
                        <div
                          class="my-2 h-2 rounded-full border border-dashed"
                          :class="dropZoneClass('column-slot', { tab: tabIndex, row: rowIndex, col: colIndex })"
                          @dragover.prevent
                          @dragenter.prevent="setDropTarget('column-slot', { tab: tabIndex, row: rowIndex, col: colIndex })"
                          @drop="dropColumnSlot(tabIndex, rowIndex, colIndex)"
                        ></div>
                        <div
                          class="border border-border rounded-md p-3 space-y-3"
                          @dragover.prevent
                          @dragenter.prevent="setDropTarget('column', { tab: tabIndex, row: rowIndex, col: colIndex })"
                          @drop="dropColumn(tabIndex, rowIndex, colIndex)"
                          :style="dropOutline('column', { tab: tabIndex, row: rowIndex, col: colIndex })"
                        >
                          <div class="flex flex-wrap items-center gap-2">
                            <button
                              class="btn btn-ghost btn-xs cursor-move"
                              draggable="true"
                              @dragstart="beginDrag('column', { tab: tabIndex, row: rowIndex, col: colIndex }, $event)"
                              @dragend="clearDrag"
                              :class="isDragging('column', { tab: tabIndex, row: rowIndex, col: colIndex }) ? 'opacity-60' : ''"
                            >
                              Drag
                            </button>
                            <input v-model="column.id" class="input input-bordered input-xs" placeholder="Column id" />
                            <input v-model="column.class" class="input input-bordered input-xs" placeholder="Column class" />
                            <button class="btn btn-ghost btn-xs" @click="moveColumn(tabIndex, rowIndex, colIndex, -1)">↑</button>
                            <button class="btn btn-ghost btn-xs" @click="moveColumn(tabIndex, rowIndex, colIndex, 1)">↓</button>
                            <button class="btn btn-ghost btn-xs" @click="removeColumn(tabIndex, rowIndex, colIndex)">Remove</button>
                            <button class="btn btn-ghost btn-xs" @click="scaffoldOverride('column', column.id)">Override</button>
                            <button class="btn btn-xs btn-outline ml-auto" @click="addCard(tabIndex, rowIndex, colIndex)">Add Card</button>
                          </div>

                          <template v-for="(card, cardIndex) in column.widgets" :key="card.id">
                            <div
                              class="my-2 h-2 rounded-full border border-dashed"
                              :class="dropZoneClass('card-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex })"
                              @dragover.prevent
                              @dragenter.prevent="setDropTarget('card-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex })"
                              @drop="dropCardSlot(tabIndex, rowIndex, colIndex, cardIndex)"
                            ></div>
                            <div
                              class="border border-border rounded-md p-3 space-y-2"
                              @dragover.prevent
                              @dragenter.prevent="setDropTarget('card', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex })"
                              @drop="dropCard(tabIndex, rowIndex, colIndex, cardIndex)"
                              :style="dropOutline('card', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex })"
                            >
                              <div class="flex flex-wrap items-center gap-2">
                                <button
                                  class="btn btn-ghost btn-xs cursor-move"
                                  draggable="true"
                                  @dragstart="beginDrag('card', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex }, $event)"
                                  @dragend="clearDrag"
                                  :class="isDragging('card', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex }) ? 'opacity-60' : ''"
                                >
                                  Drag
                                </button>
                                <input v-model="card.id" class="input input-bordered input-xs" placeholder="Card id" />
                                <input v-model="card.title" class="input input-bordered input-xs" placeholder="Card title" />
                                <input v-model="card.subtitle" class="input input-bordered input-xs" placeholder="Card subtitle" />
                                <button class="btn btn-ghost btn-xs" @click="moveCard(tabIndex, rowIndex, colIndex, cardIndex, -1)">↑</button>
                                <button class="btn btn-ghost btn-xs" @click="moveCard(tabIndex, rowIndex, colIndex, cardIndex, 1)">↓</button>
                                <button class="btn btn-ghost btn-xs" @click="removeCard(tabIndex, rowIndex, colIndex, cardIndex)">Remove</button>
                                <button class="btn btn-ghost btn-xs" @click="scaffoldOverride('card', card.id)">Override</button>
                              </div>

                              <div class="space-y-2">
                                <template v-for="(field, fieldIndex) in card.fields" :key="`${card.id}-field-${fieldIndex}`">
                                  <div
                                    class="my-2 h-2 rounded-full border border-dashed"
                                    :class="dropZoneClass('field-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex })"
                                    @dragover.prevent
                                    @dragenter.prevent="setDropTarget('field-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex })"
                                    @drop="dropFieldSlot(tabIndex, rowIndex, colIndex, cardIndex, fieldIndex)"
                                  ></div>
                                  <div
                                    class="flex flex-wrap items-center gap-2"
                                    @dragover.prevent
                                    @dragenter.prevent="setDropTarget('field', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex })"
                                    @drop="dropField(tabIndex, rowIndex, colIndex, cardIndex, fieldIndex)"
                                    :style="dropOutline('field', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex })"
                                  >
                                    <button
                                      class="btn btn-ghost btn-xs cursor-move"
                                      draggable="true"
                                      @dragstart="beginDrag('field', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex }, $event)"
                                      @dragend="clearDrag"
                                      :class="isDragging('field', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: fieldIndex }) ? 'opacity-60' : ''"
                                    >
                                      Drag
                                    </button>
                                    <input v-model="field.field" class="input input-bordered input-xs" placeholder="Field" />
                                    <input v-model="field.label" class="input input-bordered input-xs" placeholder="Label" />
                                    <select v-model="field.type" class="select select-bordered select-xs">
                                      <option v-for="type in fieldTypes" :key="type" :value="type">{{ type }}</option>
                                    </select>
                                    <input v-model="field.path" class="input input-bordered input-xs" placeholder="Path" />
                                    <input v-model="field.key" class="input input-bordered input-xs" placeholder="Key" />
                                    <input v-model="field.target" class="input input-bordered input-xs" placeholder="Target" />
                                    <button class="btn btn-ghost btn-xs" @click="removeField(tabIndex, rowIndex, colIndex, cardIndex, fieldIndex)">Remove</button>
                                  </div>
                                </template>
                                <div
                                  class="my-2 h-2 rounded-full border border-dashed"
                                  :class="dropZoneClass('field-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: card.fields.length })"
                                  @dragover.prevent
                                  @dragenter.prevent="setDropTarget('field-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: cardIndex, field: card.fields.length })"
                                  @drop="dropFieldSlot(tabIndex, rowIndex, colIndex, cardIndex, card.fields.length)"
                                ></div>
                              </div>

                              <div class="flex flex-wrap items-center gap-2">
                                <input
                                  v-model="fieldDrafts[card.id]"
                                  class="input input-bordered input-xs"
                                  placeholder="Field key"
                                />
                                <button
                                  class="btn btn-xs btn-outline"
                                  @click="addField(tabIndex, rowIndex, colIndex, cardIndex, fieldDrafts[card.id]); fieldDrafts[card.id] = ''"
                                >
                                  Add Field
                                </button>
                                <div class="flex flex-wrap gap-2">
                                  <button
                                    v-for="fieldKey in availableFields"
                                    :key="`${card.id}-${fieldKey}`"
                                    class="btn btn-ghost btn-xs"
                                    @click="addField(tabIndex, rowIndex, colIndex, cardIndex, fieldKey)"
                                  >
                                    {{ fieldKey }}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </template>
                          <div
                            class="my-2 h-2 rounded-full border border-dashed"
                            :class="dropZoneClass('card-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: column.widgets.length })"
                            @dragover.prevent
                            @dragenter.prevent="setDropTarget('card-slot', { tab: tabIndex, row: rowIndex, col: colIndex, card: column.widgets.length })"
                            @drop="dropCardSlot(tabIndex, rowIndex, colIndex, column.widgets.length)"
                          ></div>
                        </div>
                      </template>
                      <div
                        class="my-2 h-2 rounded-full border border-dashed"
                        :class="dropZoneClass('column-slot', { tab: tabIndex, row: rowIndex, col: row.primary.length })"
                        @dragover.prevent
                        @dragenter.prevent="setDropTarget('column-slot', { tab: tabIndex, row: rowIndex, col: row.primary.length })"
                        @drop="dropColumnSlot(tabIndex, rowIndex, row.primary.length)"
                      ></div>
                    </div>
                  </template>
                  <div
                    class="my-2 h-2 rounded-full border border-dashed"
                    :class="dropZoneClass('row-slot', { tab: tabIndex, row: tab.content.length })"
                    @dragover.prevent
                    @dragenter.prevent="setDropTarget('row-slot', { tab: tabIndex, row: tab.content.length })"
                    @drop="dropRowSlot(tabIndex, tab.content.length)"
                  ></div>
                </div>
              </div>
            </template>
            <div
              class="my-2 h-2 rounded-full border border-dashed"
              :class="dropZoneClass('tab-slot', { tab: (specDraft?.single?.tabs ?? []).length })"
              @dragover.prevent
              @dragenter.prevent="setDropTarget('tab-slot', { tab: (specDraft?.single?.tabs ?? []).length })"
              @drop="dropTabSlot((specDraft?.single?.tabs ?? []).length)"
            ></div>
          </div>
        </div>

        <div v-else class="mt-4">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold uppercase tracking-[0.2em] text-muted">Spec JSON</h4>
            <button class="btn btn-ghost btn-sm" @click="applySpecJson">Apply JSON</button>
          </div>
          <textarea
            v-model="specJson"
            class="mt-3 w-full rounded-md border border-border p-3 text-xs"
            rows="28"
          ></textarea>
        </div>
      </aside>
    </div>

    <TypesensePanel
      :open="showTypesense"
      :model-key="activeModel"
      :spec="activeSpec"
      @update:open="showTypesense = $event"
    />
  </div>
</template>
