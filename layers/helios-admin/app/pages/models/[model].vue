<script setup lang="ts">
import type {
  ModelUIFieldLayoutColumnSpec,
  ModelUIFieldLayoutRowSpec,
  ModelLayoutSpec,
  ModelSpecResponse,
  ModelUIFieldSpec,
  ModelUITabSpec,
  ModelUIWidgetSpec,
} from '#helios-admin/app/types/model-spec'

type BuilderRootTab = 'settings' | 'page-builder'
type SettingsPanel =
  | 'directory'
  | 'typesense'
  | 'typesense-api'
  | 'listing-fields'
  | 'directory-filters'
  | 'create-dialog'
  | 'single-management'
  | 'overrides'
  | 'file-output'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type TypesenseModelAction =
  | 'countRecords'
  | 'listRecords'
  | 'refreshCollection'
  | 'ensureCollection'
  | 'bulkImport'
  | 'inspectRecord'
  | 'addRecord'
  | 'removeRecord'

const route = useRoute()

const modelParam = computed(() => String(route.params.model ?? '').trim().toLowerCase())
const modelTypesense = useModelTypesense(modelParam)
const activeRootTab = ref<BuilderRootTab>('settings')
const activeSettingsPanel = ref<SettingsPanel>('directory')
const activeTabSlug = ref('')
const saveState = ref<SaveState>('idle')
const notice = ref('')
const newTabLabel = ref('')
const typesenseBusy = ref(false)
const typesenseNotice = ref('')
const typesenseError = ref('')
const typesenseStatus = ref<Record<string, any> | null>(null)
const typesenseActionResult = ref<Record<string, any> | null>(null)
const typesenseRecordId = ref('')
const typesenseLimit = ref('50')
const typesenseStart = ref('0')
const typesenseServiceBusy = ref(false)
const typesenseServiceStatus = ref<Record<string, any> | null>(null)
const typesenseServiceError = ref('')
const overrideBusy = ref(false)
const overrideNotice = ref('')
const overrideError = ref('')
const overrideResult = ref<Record<string, any> | null>(null)
const apiConsole = useApiConsole()

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const unique = <T>(value: T[]) => Array.from(new Set(value))

const splitCsv = (value: string): string[] => {
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)
}

const slugify = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`
const settingsSections = computed<{ id: SettingsPanel, label: string }[]>(() => {
  const sections: { id: SettingsPanel, label: string }[] = [
    { id: 'directory', label: 'Directory' },
    { id: 'typesense', label: 'Typesense' },
    { id: 'listing-fields', label: 'Listing Fields' },
    { id: 'directory-filters', label: 'Directory Filters' },
    { id: 'create-dialog', label: 'Create Dialog' },
    { id: 'single-management', label: 'Single Management' },
    { id: 'overrides', label: 'Overrides' },
    { id: 'file-output', label: 'File Output' },
  ]

  if (form.value?.directory.typesense.enabled) {
    sections.splice(2, 0, { id: 'typesense-api', label: 'TypeSense API' })
  }

  return sections
})

const form = ref<ModelLayoutSpec | null>(null)

const { data, pending, error, refresh } = await useFetch<ModelSpecResponse>(
  () => `/api/models/layout/${modelParam.value}`,
  {
    watch: [modelParam],
  },
)

const modelInfo = computed(() => data.value?.model ?? null)
const fileInfo = computed(() => data.value?.files ?? null)
const source = computed(() => data.value?.source ?? 'default')

const modelFieldOptions = computed(() => {
  const fields = data.value?.model?.fields
  if (!Array.isArray(fields)) return []
  return fields
    .map(field => String(field || '').trim())
    .filter(field => field.length > 0)
})

const parseOptionalInt = (value: string) => {
  const next = Number(String(value ?? '').trim())
  return Number.isFinite(next) ? next : undefined
}

const createDialogOverridePath = computed(() => {
  return `app/components/admin/overrides/${modelParam.value || '<model>'}/CreateDialog.vue`
})

const typesenseEnabled = computed(() => Boolean(form.value?.directory.typesense.enabled))
const typesenseCollectionName = computed(() => {
  return String(
    typesenseStatus.value?.collection?.name
      || form.value?.directory.typesense.collection
      || modelParam.value
      || '',
  )
})

const typesenseServiceConnected = computed(() => Boolean(typesenseServiceStatus.value?.ok))

const typesenseCollectionExists = computed(() => {
  const collectionName = typesenseCollectionName.value.trim().toLowerCase()
  const collections = Array.isArray(typesenseServiceStatus.value?.collections)
    ? typesenseServiceStatus.value!.collections
    : []

  return collections.some((entry: unknown) => String(entry || '').trim().toLowerCase() === collectionName)
})

const hasTypesenseRecordId = computed(() => typesenseRecordId.value.trim().length > 0)
const modelRequiredCreateKeys = computed(() => {
  const required = modelInfo.value?.requiredFields
  if (!Array.isArray(required)) return []
  return required
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0 && entry.toLowerCase() !== 'id')
})
const specRequiredCreateKeys = computed(() => {
  const required = form.value?.directory.createDialog.required
  if (!Array.isArray(required)) return []
  return required
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)
})
const createContractKeys = computed(() => unique([
  ...modelRequiredCreateKeys.value,
  ...specRequiredCreateKeys.value,
]))
const createContractPayloadPreview = computed(() => {
  const sourceFields = form.value?.directory.createDialog.fields ?? []
  const preview = createContractKeys.value.reduce<Record<string, unknown>>((acc, key) => {
    const match = sourceFields.find((field) => {
      const candidate = String(field.modelKey || field.field || field.id || '').trim().toLowerCase()
      return candidate === key.toLowerCase()
    })
    const type = String(match?.component?.name || '').toLowerCase()
    if (type.includes('color')) acc[key] = '#000000'
    else if (type.includes('combobox')) acc[key] = ''
    else if (String(match?.component?.options?.type || '').toLowerCase() === 'number') acc[key] = 0
    else acc[key] = ''
    return acc
  }, {})
  return JSON.stringify(preview, null, 2)
})

const actionLabel: Record<TypesenseModelAction, string> = {
  countRecords: 'Count records',
  listRecords: 'List records',
  refreshCollection: 'Refresh collection',
  ensureCollection: 'Ensure collection',
  bulkImport: 'Bulk import',
  inspectRecord: 'Inspect record',
  addRecord: 'Add record',
  removeRecord: 'Remove record',
}

const getTypesensePayload = (extra?: Record<string, any>) => ({
  limit: parseOptionalInt(typesenseLimit.value),
  start: parseOptionalInt(typesenseStart.value),
  id: hasTypesenseRecordId.value ? typesenseRecordId.value.trim() : undefined,
  ...(extra || {}),
})

const loadTypesenseServiceStatus = async () => {
  typesenseServiceBusy.value = true
  typesenseServiceError.value = ''

  try {
    const status = await modelTypesense.readServiceHealth()
    typesenseServiceStatus.value = status as Record<string, any>
    apiConsole.success(status, 'Service health check passed.')
  }
  catch (error: any) {
    const message = error?.message ?? 'Failed to reach TypeSense service.'
    typesenseServiceError.value = message
    apiConsole.error({ error: message }, 'Service health check failed.')
  }
  finally {
    typesenseServiceBusy.value = false
  }
}

const loadTypesenseStatus = async () => {
  if (!form.value) return
  typesenseBusy.value = true
  typesenseError.value = ''
  typesenseNotice.value = ''
  apiConsole.maybeClearBeforeRun()
  apiConsole.message(`REQUEST status model=${modelParam.value} limit=10 start=0`)

  try {
    const status = await modelTypesense.readStatus({ limit: 10, start: 0 })
    typesenseStatus.value = status.status
    apiConsole.success(status.status, 'Status loaded.')
  }
  catch (apiError: any) {
    const message = apiError?.message ?? 'Failed to read TypeSense status.'
    typesenseError.value = message
    apiConsole.error({ error: message }, 'Status load failed.')
  }
  finally {
    typesenseBusy.value = false
  }
}

const reloadTypesenseWorkbench = async () => {
  await loadTypesenseServiceStatus()
  await loadTypesenseStatus()
}

const runTypesenseAction = async (action: TypesenseModelAction, extra?: Record<string, any>) => {
  typesenseBusy.value = true
  typesenseError.value = ''
  typesenseNotice.value = ''
  apiConsole.maybeClearBeforeRun()

  const payload = getTypesensePayload(extra)
  apiConsole.message(`REQUEST ${action} ${JSON.stringify(payload)}`)

  try {
    const response = await modelTypesense.runAction(action, payload)

    typesenseActionResult.value = response.result
    typesenseStatus.value = response.status
    typesenseNotice.value = `${actionLabel[action]} completed.`
    apiConsole.success(response, `${actionLabel[action]} succeeded.`)
  }
  catch (apiError: any) {
    const message = apiError?.message ?? `${actionLabel[action]} failed.`
    typesenseError.value = message
    apiConsole.error({ error: message, action, payload }, `${actionLabel[action]} failed.`)
  }
  finally {
    typesenseBusy.value = false
  }
}

const runCreateSyncSmoke = async () => {
  typesenseBusy.value = true
  typesenseError.value = ''
  typesenseNotice.value = ''
  apiConsole.maybeClearBeforeRun()
  apiConsole.message(`REQUEST createSyncSmoke model=${modelParam.value}`)

  try {
    const response = await $fetch(`/api/models/runtime/${modelParam.value}/create-smoke`, {
      method: 'POST',
    })

    typesenseActionResult.value = response as Record<string, any>
    typesenseNotice.value = 'Create + TypeSense sync smoke test completed.'
    const rid = String((response as any)?.identifiers?.rid || '').trim()
    if (rid) typesenseRecordId.value = rid

    const status = await modelTypesense.readStatus({ limit: 10, start: 0 })
    typesenseStatus.value = status.status
    apiConsole.success(response, 'Create + sync smoke test succeeded.')
  }
  catch (apiError: any) {
    const message = apiError?.message ?? 'Create + sync smoke test failed.'
    typesenseError.value = message
    apiConsole.error({ error: message }, 'Create + sync smoke test failed.')
  }
  finally {
    typesenseBusy.value = false
  }
}

const generateCreateDialogOverride = async (force = false) => {
  overrideBusy.value = true
  overrideError.value = ''
  overrideNotice.value = ''

  try {
    const response = await $fetch(`/api/models/overrides/${modelParam.value}/create-dialog`, {
      method: 'POST',
      body: { force },
    })

    overrideResult.value = response as Record<string, any>
    const status = String((response as any)?.override?.status || 'created')
    const filePath = String((response as any)?.override?.filePath || '')
    overrideNotice.value = status === 'exists'
      ? `Override already exists at ${filePath}.`
      : `Create dialog override ${status} at ${filePath}.`
  }
  catch (apiError: any) {
    overrideError.value = apiError?.data?.statusMessage ?? apiError?.message ?? 'Failed to generate override.'
  }
  finally {
    overrideBusy.value = false
  }
}

watch(
  () => data.value?.spec,
  (nextSpec) => {
    if (!nextSpec) {
      form.value = null
      activeTabSlug.value = ''
      return
    }

    form.value = clone(nextSpec)
    activeSettingsPanel.value = 'directory'
    activeTabSlug.value = nextSpec.single.tabs[0]?.slug ?? ''
    saveState.value = 'idle'
    notice.value = ''
    typesenseNotice.value = ''
    typesenseError.value = ''
    typesenseStatus.value = null
    typesenseActionResult.value = null
    typesenseServiceStatus.value = null
    typesenseServiceError.value = ''
    overrideNotice.value = ''
    overrideError.value = ''
    overrideResult.value = null
    apiConsole.clear()
  },
  { immediate: true },
)

watch(
  () => activeSettingsPanel.value,
  (panel) => {
    if (panel === 'typesense-api') void reloadTypesenseWorkbench()
  },
)

watch(
  () => form.value?.directory.typesense.enabled,
  (enabled) => {
    if (!enabled && activeSettingsPanel.value === 'typesense-api') {
      activeSettingsPanel.value = 'typesense'
    }
  },
)

const tabs = computed(() => form.value?.single.tabs ?? [])

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

const activeTabSpec = computed<ModelUITabSpec | null>(() => {
  const availableTabs = tabs.value
  if (!availableTabs.length) return null
  return availableTabs.find(tab => tab.slug === activeTabSlug.value) ?? availableTabs[0] ?? null
})

const queryByCsv = computed({
  get: () => form.value?.directory.typesense.queryBy.join(', ') ?? '',
  set: (value: string) => {
    if (!form.value) return
    form.value.directory.typesense.queryBy = splitCsv(value)
  },
})

const sortableFieldsCsv = computed({
  get: () => form.value?.directory.typesense.sortableFields.join(', ') ?? '',
  set: (value: string) => {
    if (!form.value) return
    form.value.directory.typesense.sortableFields = splitCsv(value)
  },
})

const typesenseFiltersCsv = computed({
  get: () => form.value?.directory.typesense.filters.join(', ') ?? '',
  set: (value: string) => {
    if (!form.value) return
    form.value.directory.typesense.filters = splitCsv(value)
  },
})

const createRequiredCsv = computed({
  get: () => form.value?.directory.createDialog.required.join(', ') ?? '',
  set: (value: string) => {
    if (!form.value) return
    form.value.directory.createDialog.required = splitCsv(value)
  },
})

const addListingField = () => {
  if (!form.value) return

  const fallback = modelFieldOptions.value[0] || `field-${form.value.directory.listing.fields.length + 1}`
  form.value.directory.listing.fields.push({
    key: fallback,
    label: fallback.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  })
}

const removeListingField = (index: number) => {
  if (!form.value) return
  form.value.directory.listing.fields.splice(index, 1)
}

const addDirectoryFilter = () => {
  if (!form.value) return

  const fallback = modelFieldOptions.value[0] || `filter-${form.value.directory.listing.filters.length + 1}`
  form.value.directory.listing.filters.push({
    key: fallback,
    label: fallback.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
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
  })
}

const removeDirectoryFilter = (index: number) => {
  if (!form.value) return
  form.value.directory.listing.filters.splice(index, 1)
}

const newFieldFromModel = (fieldName?: string): ModelUIFieldSpec => {
  const baseField = String(fieldName || modelFieldOptions.value[0] || 'title').trim()
  const lower = baseField.toLowerCase()
  const componentName = lower.includes('color') ? 'AColorPicker' : lower.includes('status') ? 'ACombobox' : 'AInput'

  return {
    id: makeId('field'),
    field: baseField,
    label: baseField.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    modelKey: baseField,
    action: `${modelParam.value || 'model'}.update`,
    component: {
      name: componentName,
      options: componentName === 'ACombobox'
        ? {
            grouped: false,
            highlightMatch: false,
            multiple: false,
            clearable: true,
            showIndicator: true,
            options: lower.includes('status')
              ? [
                  { label: 'Draft', value: 'draft' },
                  { label: 'Review', value: 'review' },
                  { label: 'Published', value: 'published' },
                ]
              : [],
          }
        : {
            type: 'text',
            placeholder: `Enter ${baseField.replace(/[-_]+/g, ' ')}`,
          },
    },
    validation: {},
  }
}

const addCreateField = () => {
  if (!form.value) return
  form.value.directory.createDialog.fields.push(newFieldFromModel())
}

const removeCreateField = (index: number) => {
  if (!form.value) return
  form.value.directory.createDialog.fields.splice(index, 1)
}

const buildWidgetLayout = (widget: ModelUIWidgetSpec) => {
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
            fieldIds: widget.fields.map(field => field.id),
          },
        ],
      },
    ],
  }
}

const syncWidgetLayout = (widget: ModelUIWidgetSpec) => {
  if (widget.type !== 'fields-card') {
    widget.layout = undefined
    return
  }

  const known = new Set(widget.fields.map(field => field.id))
  const rawRows = Array.isArray(widget.layout?.rows) ? widget.layout!.rows : []
  if (!rawRows.length) {
    widget.layout = buildWidgetLayout(widget)
    return
  }

  const consumed = new Set<string>()
  const rows = rawRows.map((row, rowIndex) => {
    const rowId = String(row.id || `row-${rowIndex + 1}`).trim() || `row-${rowIndex + 1}`
    const columns = (Array.isArray(row.columns) ? row.columns : []).map((column, colIndex) => {
      const colId = String(column.id || `${rowId}-col-${colIndex + 1}`).trim() || `${rowId}-col-${colIndex + 1}`
      const nextFieldIds = (Array.isArray(column.fieldIds) ? column.fieldIds : [])
        .map((entry) => String(entry || '').trim())
        .filter((entry) => entry.length > 0 && known.has(entry))
        .filter((entry) => {
          if (consumed.has(entry)) return false
          consumed.add(entry)
          return true
        })
      return {
        ...column,
        id: colId,
        fieldIds: nextFieldIds,
      }
    })

    return {
      ...row,
      id: rowId,
      columns: columns.length
        ? columns
        : [{
            id: `${rowId}-col-1`,
            class: '',
            fieldIds: [],
          }],
    }
  })

  const missing = widget.fields
    .map(field => field.id)
    .filter(id => !consumed.has(id))

  if (missing.length) {
    rows[0]!.columns[0]!.fieldIds.push(...missing)
  }

  widget.layout = { rows }
}

const addWidgetLayoutRow = (widget: ModelUIWidgetSpec) => {
  syncWidgetLayout(widget)
  if (!widget.layout) return
  widget.layout.rows.push({
    id: `row-${widget.layout.rows.length + 1}`,
    name: `Row ${widget.layout.rows.length + 1}`,
    class: '',
    columns: [
      {
        id: `col-${widget.layout.rows.length + 1}-1`,
        class: '',
        fieldIds: [],
      },
    ],
  })
}

const removeWidgetLayoutRow = (widget: ModelUIWidgetSpec, rowId: string) => {
  if (!widget.layout) return
  widget.layout.rows = widget.layout.rows.filter(row => row.id !== rowId)
  syncWidgetLayout(widget)
}

const addWidgetLayoutColumn = (widget: ModelUIWidgetSpec, row: ModelUIFieldLayoutRowSpec) => {
  row.columns.push({
    id: `${row.id}-col-${row.columns.length + 1}`,
    class: '',
    fieldIds: [],
  })
  syncWidgetLayout(widget)
}

const removeWidgetLayoutColumn = (
  widget: ModelUIWidgetSpec,
  row: ModelUIFieldLayoutRowSpec,
  columnId: string,
) => {
  row.columns = row.columns.filter(column => column.id !== columnId)
  syncWidgetLayout(widget)
}

const fieldIdsToCsv = (fieldIds: string[]) => fieldIds.join(', ')

const setLayoutColumnFieldIds = (
  widget: ModelUIWidgetSpec,
  column: ModelUIFieldLayoutColumnSpec,
  value: string,
) => {
  const known = new Set(widget.fields.map(field => field.id))
  const next = String(value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0 && known.has(entry))
  column.fieldIds = Array.from(new Set(next))
  syncWidgetLayout(widget)
}

const addTab = () => {
  if (!form.value) return

  const label = newTabLabel.value.trim() || `Tab ${form.value.single.tabs.length + 1}`
  const slugBase = slugify(label, `tab-${form.value.single.tabs.length + 1}`)
  let slug = slugBase
  let i = 2

  while (form.value.single.tabs.some(tab => tab.slug === slug)) {
    slug = `${slugBase}-${i}`
    i += 1
  }

  const tab: ModelUITabSpec = {
    id: makeId('tab'),
    slug,
    label,
    primary: [],
  }

  form.value.single.tabs.push(tab)
  newTabLabel.value = ''
  activeTabSlug.value = tab.slug
}

const removeTab = (slug: string) => {
  if (!form.value) return
  if (form.value.single.tabs.length <= 1) return

  form.value.single.tabs = form.value.single.tabs.filter(tab => tab.slug !== slug)

  if (activeTabSlug.value === slug) {
    activeTabSlug.value = form.value.single.tabs[0]?.slug ?? ''
  }
}

const addRow = (tab: ModelUITabSpec) => {
  tab.primary.push({
    id: makeId('row'),
    name: `Row ${tab.primary.length + 1}`,
    class: '',
    columns: [],
  })
}

const removeRow = (tab: ModelUITabSpec, rowId: string) => {
  tab.primary = tab.primary.filter(row => row.id !== rowId)
}

const addColumn = (row: ModelLayoutSpec['single']['tabs'][number]['primary'][number]) => {
  row.columns.push({
    id: makeId('column'),
    name: `Column ${row.columns.length + 1}`,
    class: '',
    primary: [],
  })
}

const removeColumn = (row: ModelLayoutSpec['single']['tabs'][number]['primary'][number], columnId: string) => {
  row.columns = row.columns.filter(column => column.id !== columnId)
}

const addWidget = (column: ModelLayoutSpec['single']['tabs'][number]['primary'][number]['columns'][number]) => {
  const widget: ModelUIWidgetSpec = {
    id: makeId('widget'),
    type: 'fields-card',
    name: `widget-${column.primary.length + 1}`,
    label: 'Fields Card',
    subtitle: 'Describe this block.',
    class: '',
    saveLabel: 'Save',
    action: `${modelParam.value || 'model'}.update`,
    fields: [newFieldFromModel()],
    layout: undefined,
  }

  syncWidgetLayout(widget)
  column.primary.push(widget)
}

const removeWidget = (column: ModelLayoutSpec['single']['tabs'][number]['primary'][number]['columns'][number], widgetId: string) => {
  column.primary = column.primary.filter(widget => widget.id !== widgetId)
}

const addWidgetField = (widget: ModelUIWidgetSpec) => {
  widget.fields.push(newFieldFromModel())
  syncWidgetLayout(widget)
}

const removeWidgetField = (widget: ModelUIWidgetSpec, fieldId: string) => {
  widget.fields = widget.fields.filter(field => field.id !== fieldId)
  syncWidgetLayout(widget)
}

const normalizeTabSlug = (tab: ModelUITabSpec) => {
  if (!tab.slug || !tab.slug.trim()) {
    tab.slug = slugify(tab.label || tab.id || 'tab', 'tab')
    return
  }

  tab.slug = slugify(tab.slug, tab.id || 'tab')
}

const reloadState = async () => {
  await refresh()
  saveState.value = 'idle'
  notice.value = ''
}

const commitState = async () => {
  if (!form.value) return

  try {
    saveState.value = 'saving'
    notice.value = ''

    form.value.single.tabs.forEach(normalizeTabSlug)
    form.value.single.tabs.forEach((tab) => {
      tab.primary.forEach((row) => {
        row.columns.forEach((column) => {
          column.primary.forEach((widget) => {
            syncWidgetLayout(widget)
          })
        })
      })
    })

    const response = await $fetch<ModelSpecResponse>(`/api/models/layout/${modelParam.value}`, {
      method: 'POST',
      body: {
        spec: form.value,
      },
    })

    form.value = clone(response.spec)
    saveState.value = 'saved'
    notice.value = `Committed model spec for ${response.model.modelKey}.`
  }
  catch (commitError: any) {
    saveState.value = 'error'
    notice.value = commitError?.data?.statusMessage ?? commitError?.message ?? 'Commit failed.'
  }
}
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero builder-header">
      <div>
        <p class="a-eyebrow">Model Builder</p>
        <h1 class="a-title">{{ modelInfo?.label || modelParam }} Spec Manager</h1>
        <p class="a-copy">
          Build file-backed directory and single-management specs. YAML fragments are the source of truth and
          are committed into this app for version control.
        </p>
      </div>

      <div class="builder-header__actions">
        <NuxtLink v-if="form?.directory.route" class="a-btn a-btn--subtle" :to="form.directory.route">Open Directory</NuxtLink>
        <button class="a-btn a-btn--subtle" type="button" :disabled="pending || saveState === 'saving'" @click="reloadState">
          {{ pending ? 'Reloading…' : 'Reload' }}
        </button>
        <button class="a-btn a-btn--primary" type="button" :disabled="saveState === 'saving' || !form" @click="commitState">
          {{ saveState === 'saving' ? 'Committing…' : 'Commit Spec' }}
        </button>
      </div>
    </header>

    <section class="a-card builder-tabs">
      <button
        class="builder-tab"
        :class="activeRootTab === 'settings' ? 'is-active' : ''"
        type="button"
        @click="activeRootTab = 'settings'"
      >
        Settings
      </button>
      <button
        class="builder-tab"
        :class="activeRootTab === 'page-builder' ? 'is-active' : ''"
        type="button"
        @click="activeRootTab = 'page-builder'"
      >
        Page Builder
      </button>
      <span class="builder-source a-chip">source: {{ source }}</span>
    </section>

    <p v-if="notice" class="builder-notice" :class="saveState === 'error' ? 'is-error' : ''">
      {{ notice }}
    </p>
    <p v-if="error" class="builder-notice is-error">Could not load model spec state.</p>

    <template v-if="form">
      <template v-if="activeRootTab === 'settings'">
        <section class="builder-layout-grid">
          <aside class="a-card section-panel">
            <div class="section-panel__header">
              <h2 class="panel-title">Settings</h2>
              <span class="a-chip">{{ settingsSections.length }} sections</span>
            </div>

            <div class="section-list smt-025">
              <button
                v-for="section in settingsSections"
                :key="section.id"
                class="section-pill"
                :class="section.id === activeSettingsPanel ? 'is-active' : ''"
                type="button"
                @click="activeSettingsPanel = section.id"
              >
                {{ section.label }}
              </button>
            </div>
          </aside>

          <article v-if="activeSettingsPanel === 'directory'" class="a-card">
            <h2 class="panel-title">Directory Configuration</h2>
            <div class="settings-fields smt-050">
              <label class="a-field inline-field">
                <span class="a-field__label">Enabled</span>
                <input v-model="form.directory.enabled" type="checkbox">
              </label>

              <label class="a-field">
                <span class="a-field__label">Route</span>
                <input v-model="form.directory.route" class="a-input" type="text" placeholder="/admin/car">
              </label>

              <label class="a-field">
                <span class="a-field__label">Slug Policy</span>
                <select v-model="form.directory.slugPolicy" class="a-select">
                  <option value="rid">rid</option>
                  <option value="slug">slug</option>
                  <option value="id">id</option>
                  <option value="custom">custom</option>
                </select>
              </label>

              <label class="a-field">
                <span class="a-field__label">Title</span>
                <input v-model="form.directory.title" class="a-input" type="text">
              </label>

              <label class="a-field form-full">
                <span class="a-field__label">Description</span>
                <textarea v-model="form.directory.description" class="a-textarea" rows="2" />
              </label>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'typesense'" class="a-card">
            <h2 class="panel-title">Typesense</h2>
            <div class="settings-fields smt-050">
              <label class="a-field inline-field">
                <span class="a-field__label">Enabled</span>
                <input v-model="form.directory.typesense.enabled" type="checkbox">
              </label>
              <label class="a-field form-full">
                <span class="a-field__label">Collection</span>
                <input v-model="form.directory.typesense.collection" class="a-input" type="text">
              </label>
              <label class="a-field form-full">
                <span class="a-field__label">Query By (comma-separated)</span>
                <input v-model="queryByCsv" class="a-input" type="text" placeholder="name, title">
              </label>
              <label class="a-field form-full">
                <span class="a-field__label">Sortable Fields (comma-separated)</span>
                <input v-model="sortableFieldsCsv" class="a-input" type="text" placeholder="updatedAt, createdAt">
              </label>
              <label class="a-field form-full">
                <span class="a-field__label">Filter Keys (comma-separated)</span>
                <input v-model="typesenseFiltersCsv" class="a-input" type="text" placeholder="status, owner">
              </label>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'typesense-api'" class="a-card">
            <div class="panel-row">
              <h2 class="panel-title">TypeSense API</h2>
              <button
                class="a-btn a-btn--subtle"
                type="button"
                :disabled="typesenseBusy || typesenseServiceBusy"
                @click="reloadTypesenseWorkbench"
              >
                {{ typesenseBusy || typesenseServiceBusy ? 'Refreshing…' : 'Reload All Checks' }}
              </button>
            </div>
            <p class="a-copy smt-025">
              Validate this model’s search pipeline in order: service connection, collection setup, data sync,
              and record-level operations.
            </p>

            <div class="typesense-summary smt-050">
              <div class="typesense-summary__status">
                <span class="a-status" :class="typesenseEnabled ? 'a-status--published' : 'a-status--draft'">
                  {{ typesenseEnabled ? 'TypeSense Enabled' : 'TypeSense Disabled' }}
                </span>
                <span class="a-status" :class="typesenseServiceConnected ? 'a-status--published' : 'a-status--draft'">
                  {{ typesenseServiceConnected ? 'Service Connected' : 'Service Not Connected' }}
                </span>
                <span class="a-status" :class="typesenseCollectionExists ? 'a-status--published' : 'a-status--review'">
                  {{ typesenseCollectionExists ? 'Collection Exists' : 'Collection Missing' }}
                </span>
              </div>

              <div class="api-meta-grid smt-025">
                <div class="file-item">
                  <p class="a-eyebrow">Collection</p>
                  <code>{{ typesenseCollectionName }}</code>
                </div>
                <div class="file-item">
                  <p class="a-eyebrow">Record Count</p>
                  <code>{{ Number(typesenseStatus?.count || 0) }}</code>
                </div>
                <div class="file-item">
                  <p class="a-eyebrow">Service</p>
                  <code>{{ String(typesenseServiceStatus?.service?.baseUrl || 'Not resolved') }}</code>
                </div>
              </div>
            </div>

            <p v-if="typesenseNotice" class="builder-notice smt-050">
              {{ typesenseNotice }}
            </p>
            <p v-if="typesenseError || typesenseServiceError" class="builder-notice is-error smt-050">
              {{ typesenseError || typesenseServiceError }}
            </p>

            <div class="typesense-workbench smt-050">
              <div class="typesense-workbench__steps">
                <article class="typesense-step-card">
                  <div class="typesense-step-card__head">
                    <span class="typesense-step-index">1</span>
                    <div>
                      <h3>Connection & Status</h3>
                      <p>Check runtime credentials and the model pipeline status.</p>
                    </div>
                  </div>
                  <div class="api-actions">
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseServiceBusy" @click="loadTypesenseServiceStatus">
                      {{ typesenseServiceBusy ? 'Checking…' : 'Check Service' }}
                    </button>
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy" @click="loadTypesenseStatus">
                      {{ typesenseBusy ? 'Loading…' : 'Check Model Status' }}
                    </button>
                  </div>
                </article>

                <article class="typesense-step-card">
                  <div class="typesense-step-card__head">
                    <span class="typesense-step-index">2</span>
                    <div>
                      <h3>Collection Lifecycle</h3>
                      <p>Create the collection if missing, then refresh/import records.</p>
                    </div>
                  </div>

                  <div class="settings-fields">
                    <label class="a-field">
                      <span class="a-field__label">Limit</span>
                      <input v-model="typesenseLimit" class="a-input" type="text" placeholder="50">
                    </label>
                    <label class="a-field">
                      <span class="a-field__label">Start</span>
                      <input v-model="typesenseStart" class="a-input" type="text" placeholder="0">
                    </label>
                  </div>

                  <div class="api-actions">
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !typesenseEnabled" @click="runTypesenseAction('ensureCollection')">
                      Ensure Collection
                    </button>
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !typesenseEnabled" @click="runTypesenseAction('refreshCollection')">
                      Refresh Collection
                    </button>
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !typesenseEnabled" @click="runTypesenseAction('bulkImport')">
                      Bulk Import
                    </button>
                  </div>
                </article>

                <article class="typesense-step-card">
                  <div class="typesense-step-card__head">
                    <span class="typesense-step-index">3</span>
                    <div>
                      <h3>Create + Sync Smoke Test</h3>
                      <p>Create a minimum valid model record, sync TypeSense, and verify status refresh.</p>
                    </div>
                  </div>
                  <div class="api-actions">
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !typesenseEnabled" @click="runCreateSyncSmoke">
                      Run Smoke Create
                    </button>
                  </div>
                </article>

                <article class="typesense-step-card">
                  <div class="typesense-step-card__head">
                    <span class="typesense-step-index">4</span>
                    <div>
                      <h3>Inspect & Mutate Records</h3>
                      <p>Use a record ID to inspect, add, or remove one document.</p>
                    </div>
                  </div>

                  <div class="settings-fields">
                    <label class="a-field form-full">
                      <span class="a-field__label">Record ID</span>
                      <input v-model="typesenseRecordId" class="a-input" type="text" placeholder="car:123 or 123">
                    </label>
                  </div>

                  <div class="api-actions">
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !hasTypesenseRecordId" @click="runTypesenseAction('inspectRecord')">
                      Inspect Record
                    </button>
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy || !hasTypesenseRecordId || !typesenseEnabled" @click="runTypesenseAction('addRecord')">
                      Add Record
                    </button>
                    <button class="a-btn a-btn--ghost" type="button" :disabled="typesenseBusy || !hasTypesenseRecordId || !typesenseEnabled" @click="runTypesenseAction('removeRecord')">
                      Remove Record
                    </button>
                  </div>
                </article>

                <article class="typesense-step-card">
                  <div class="typesense-step-card__head">
                    <span class="typesense-step-index">5</span>
                    <div>
                      <h3>Browse Snapshot</h3>
                      <p>Quickly inspect count and a paged list of source records.</p>
                    </div>
                  </div>
                  <div class="api-actions">
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy" @click="runTypesenseAction('countRecords')">
                      Count Records
                    </button>
                    <button class="a-btn a-btn--subtle" type="button" :disabled="typesenseBusy" @click="runTypesenseAction('listRecords')">
                      List Records
                    </button>
                  </div>
                </article>

                <article v-if="typesenseActionResult" class="typesense-step-card">
                  <p class="a-eyebrow">Last Action Result</p>
                  <pre class="api-result">{{ JSON.stringify(typesenseActionResult, null, 2) }}</pre>
                </article>
              </div>

              <div class="typesense-workbench__console">
                <AdminApiConsole
                  :entries="apiConsole.entries.value"
                  :auto-clear="apiConsole.autoClear.value"
                  :auto-scroll="apiConsole.autoScroll.value"
                  :busy="typesenseBusy || typesenseServiceBusy"
                  @update:auto-clear="apiConsole.setAutoClear"
                  @update:auto-scroll="apiConsole.setAutoScroll"
                  @clear="apiConsole.clear"
                />
              </div>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'listing-fields'" class="a-card">
            <div class="panel-row">
              <h2 class="panel-title">Directory Listing Fields</h2>
              <button class="a-btn a-btn--subtle" type="button" @click="addListingField">
                <AdminIcon name="plus" :size="14" />
                Field
              </button>
            </div>

            <div class="list-stack smt-050">
              <div v-for="(entry, index) in form.directory.listing.fields" :key="`list-field-${index}`" class="list-item-grid">
                <input v-model="entry.key" class="a-input" type="text" placeholder="field key">
                <input v-model="entry.label" class="a-input" type="text" placeholder="field label">
                <input v-model="entry.class" class="a-input" type="text" placeholder="optional class">
                <button class="a-btn a-btn--ghost" type="button" @click="removeListingField(index)">Remove</button>
              </div>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'directory-filters'" class="a-card">
            <div class="panel-row">
              <h2 class="panel-title">Directory Filters</h2>
              <button class="a-btn a-btn--subtle" type="button" @click="addDirectoryFilter">
                <AdminIcon name="plus" :size="14" />
                Filter
              </button>
            </div>

            <div class="list-stack smt-050">
              <div v-for="(entry, index) in form.directory.listing.filters" :key="`dir-filter-${index}`" class="list-item-grid">
                <input v-model="entry.key" class="a-input" type="text" placeholder="filter key">
                <input v-model="entry.label" class="a-input" type="text" placeholder="filter label">
                <input v-model="entry.component.name" class="a-input" type="text" placeholder="component name">
                <button class="a-btn a-btn--ghost" type="button" @click="removeDirectoryFilter(index)">Remove</button>
              </div>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'create-dialog'" class="a-card">
            <div class="panel-row">
              <h2 class="panel-title">Create Dialog</h2>
              <div class="panel-row__actions">
                <button class="a-btn a-btn--subtle" type="button" :disabled="overrideBusy" @click="generateCreateDialogOverride(false)">
                  {{ overrideBusy ? 'Generating…' : 'Generate Override' }}
                </button>
                <button class="a-btn a-btn--subtle" type="button" @click="addCreateField">
                  <AdminIcon name="plus" :size="14" />
                  Field
                </button>
              </div>
            </div>

            <div class="settings-fields smt-050">
              <label class="a-field inline-field">
                <span class="a-field__label">Enabled</span>
                <input v-model="form.directory.createDialog.enabled" type="checkbox">
              </label>

              <label class="a-field">
                <span class="a-field__label">Title</span>
                <input v-model="form.directory.createDialog.title" class="a-input" type="text">
              </label>

              <label class="a-field">
                <span class="a-field__label">Submit Label</span>
                <input v-model="form.directory.createDialog.submitLabel" class="a-input" type="text">
              </label>

              <label class="a-field form-full">
                <span class="a-field__label">Required Keys (comma-separated)</span>
                <input v-model="createRequiredCsv" class="a-input" type="text" placeholder="title, email">
              </label>

              <div class="file-item form-full">
                <p class="a-eyebrow">Create Contract (Required)</p>
                <code>{{ createContractKeys.join(', ') || 'No required keys' }}</code>
                <p class="a-copy smt-025">
                  These keys are enforced server-side before the TRPC create call.
                </p>
              </div>

              <div class="file-item form-full">
                <p class="a-eyebrow">Payload Preview</p>
                <pre class="api-result">{{ createContractPayloadPreview }}</pre>
              </div>
            </div>

            <div class="list-stack smt-050">
              <div v-for="(field, index) in form.directory.createDialog.fields" :key="field.id || `create-field-${index}`" class="list-item-grid">
                <select v-model="field.field" class="a-select">
                  <option v-for="option in modelFieldOptions" :key="`create-opt-${option}`" :value="option">
                    {{ option }}
                  </option>
                </select>
                <input v-model="field.label" class="a-input" type="text" placeholder="label">
                <input v-model="field.component.name" class="a-input" type="text" placeholder="AInput">
                <button class="a-btn a-btn--ghost" type="button" @click="removeCreateField(index)">Remove</button>
              </div>
            </div>

            <p v-if="overrideNotice" class="builder-notice smt-050">{{ overrideNotice }}</p>
            <p v-if="overrideError" class="builder-notice is-error smt-050">{{ overrideError }}</p>
          </article>

          <article v-else-if="activeSettingsPanel === 'single-management'" class="a-card">
            <h2 class="panel-title">Single Management Options</h2>
            <p class="a-copy smt-025">
              Global options for single-record views. These settings affect generated tab management pages.
            </p>
            <div class="settings-fields smt-050">
              <label class="a-field inline-field">
                <span class="a-field__label">Header</span>
                <input v-model="form.single.global.showHeader" type="checkbox">
              </label>
              <label class="a-field inline-field">
                <span class="a-field__label">Post Status</span>
                <input v-model="form.single.global.enablePostStatus" type="checkbox">
              </label>
              <label class="a-field inline-field">
                <span class="a-field__label">Instance Management</span>
                <input v-model="form.single.global.enableInstanceManagement" type="checkbox">
              </label>
            </div>
          </article>

          <article v-else-if="activeSettingsPanel === 'overrides'" class="a-card">
            <h2 class="panel-title">Overrides</h2>
            <p class="a-copy smt-025">
              Generate scaffold components so you can override specific admin runtime blocks without editing generated pages.
            </p>

            <div class="list-stack smt-050">
              <div class="file-item">
                <p class="a-eyebrow">Create Dialog Override</p>
                <code>{{ createDialogOverridePath }}</code>
                <div class="api-actions smt-025">
                  <button class="a-btn a-btn--subtle" type="button" :disabled="overrideBusy" @click="generateCreateDialogOverride(false)">
                    {{ overrideBusy ? 'Generating…' : 'Generate' }}
                  </button>
                  <button class="a-btn a-btn--ghost" type="button" :disabled="overrideBusy" @click="generateCreateDialogOverride(true)">
                    {{ overrideBusy ? 'Working…' : 'Regenerate' }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="overrideResult?.override?.filePath" class="a-copy smt-025">
              Last scaffold:
              <code>{{ String(overrideResult.override.filePath) }}</code>
            </p>
            <p v-if="overrideNotice" class="builder-notice smt-050">{{ overrideNotice }}</p>
            <p v-if="overrideError" class="builder-notice is-error smt-050">{{ overrideError }}</p>
          </article>

          <article v-else class="a-card">
            <h2 class="panel-title">File Output</h2>
            <div class="a-grid smt-050">
              <p class="a-copy">
                Commit writes both YAML and generated JSON. Reload instantiates the editor directly from fragment files.
              </p>
              <div class="file-item">
                <p class="a-eyebrow">Fragment</p>
                <code>{{ fileInfo?.fragment || 'app/helios/fragments/models/<model>.ui.yaml' }}</code>
              </div>
              <div class="file-item">
                <p class="a-eyebrow">Generated</p>
                <code>{{ fileInfo?.generated || 'app/helios/generated/models/<model>.ui.json' }}</code>
              </div>
            </div>
          </article>
        </section>
      </template>

      <template v-else>
        <section class="builder-layout-grid">
          <aside class="a-card section-panel">
            <div class="section-panel__header">
              <h2 class="panel-title">Page Builder</h2>
              <span class="a-chip">{{ tabs.length }} tabs</span>
            </div>
            <p class="a-copy">
              Manage single-record tab structure here. Global single-page options live in Settings.
            </p>

            <div class="section-list smt-025">
              <div v-for="tab in tabs" :key="tab.id" class="section-pill-wrap">
                <button
                  class="section-pill"
                  :class="tab.slug === activeTabSlug ? 'is-active' : ''"
                  type="button"
                  @click="activeTabSlug = tab.slug"
                >
                  {{ tab.label }}
                </button>
                <button class="section-remove" type="button" @click="removeTab(tab.slug)">
                  <AdminIcon name="close" :size="12" />
                </button>
              </div>
            </div>

            <div class="section-create">
              <input
                v-model="newTabLabel"
                class="a-input"
                type="text"
                placeholder="New tab label"
                @keydown.enter.prevent="addTab"
              >
              <button class="a-btn a-btn--subtle" type="button" @click="addTab">
                <AdminIcon name="plus" :size="14" />
                Add Tab
              </button>
            </div>
          </aside>

          <article v-if="activeTabSpec" class="a-card">
            <div class="panel-row">
              <h2 class="panel-title">{{ activeTabSpec.label }} Layout</h2>
              <button class="a-btn a-btn--subtle" type="button" @click="addRow(activeTabSpec)">
                <AdminIcon name="plus" :size="14" />
                Row
              </button>
            </div>

            <div class="settings-fields smt-050">
              <label class="a-field">
                <span class="a-field__label">Tab Label</span>
                <input v-model="activeTabSpec.label" class="a-input" type="text">
              </label>
              <label class="a-field">
                <span class="a-field__label">Tab Slug</span>
                <input v-model="activeTabSpec.slug" class="a-input" type="text" @blur="normalizeTabSlug(activeTabSpec)">
              </label>
            </div>

            <div v-if="activeTabSpec.primary.length" class="rows-stack smt-075">
              <section v-for="row in activeTabSpec.primary" :key="row.id" class="row-editor">
                <div class="row-editor__head">
                  <h3>Row</h3>
                  <button class="a-btn a-btn--ghost" type="button" @click="removeRow(activeTabSpec, row.id)">Remove</button>
                </div>

                <div class="settings-fields">
                  <label class="a-field">
                    <span class="a-field__label">Row ID</span>
                    <input v-model="row.id" class="a-input" type="text">
                  </label>
                  <label class="a-field">
                    <span class="a-field__label">Row Name</span>
                    <input v-model="row.name" class="a-input" type="text">
                  </label>
                  <label class="a-field form-full">
                    <span class="a-field__label">Row Class</span>
                    <input v-model="row.class" class="a-input" type="text" placeholder="tm:flex-row gap-4">
                  </label>
                </div>

                <div class="columns-stack smt-050">
                  <div class="panel-row">
                    <h4>Columns</h4>
                    <button class="a-btn a-btn--subtle" type="button" @click="addColumn(row)">Column</button>
                  </div>

                  <section v-for="column in row.columns" :key="column.id" class="column-editor">
                    <div class="row-editor__head">
                      <h5>Column</h5>
                      <button class="a-btn a-btn--ghost" type="button" @click="removeColumn(row, column.id)">Remove</button>
                    </div>

                    <div class="settings-fields">
                      <label class="a-field">
                        <span class="a-field__label">Column ID</span>
                        <input v-model="column.id" class="a-input" type="text">
                      </label>
                      <label class="a-field">
                        <span class="a-field__label">Column Name</span>
                        <input v-model="column.name" class="a-input" type="text">
                      </label>
                      <label class="a-field form-full">
                        <span class="a-field__label">Column Class</span>
                        <input v-model="column.class" class="a-input" type="text" placeholder="flex-[2]">
                      </label>
                    </div>

                    <div class="widgets-stack smt-050">
                      <div class="panel-row">
                        <h5>Widgets</h5>
                        <button class="a-btn a-btn--subtle" type="button" @click="addWidget(column)">Widget</button>
                      </div>

                      <section v-for="widget in column.primary" :key="widget.id" class="widget-editor">
                        <div class="row-editor__head">
                          <h6>{{ widget.type }}</h6>
                          <button class="a-btn a-btn--ghost" type="button" @click="removeWidget(column, widget.id)">Remove</button>
                        </div>

                        <div class="settings-fields">
                          <label class="a-field">
                            <span class="a-field__label">Widget ID</span>
                            <input v-model="widget.id" class="a-input" type="text">
                          </label>
                          <label class="a-field">
                            <span class="a-field__label">Widget Type</span>
                            <select v-model="widget.type" class="a-select">
                              <option value="fields-card">fields-card</option>
                              <option value="widget">widget</option>
                            </select>
                          </label>
                          <label class="a-field">
                            <span class="a-field__label">Name</span>
                            <input v-model="widget.name" class="a-input" type="text">
                          </label>
                          <label class="a-field">
                            <span class="a-field__label">Label</span>
                            <input v-model="widget.label" class="a-input" type="text">
                          </label>
                          <label class="a-field form-full">
                            <span class="a-field__label">Subtitle</span>
                            <input v-model="widget.subtitle" class="a-input" type="text">
                          </label>
                          <label class="a-field">
                            <span class="a-field__label">Action</span>
                            <input v-model="widget.action" class="a-input" type="text" placeholder="car.update">
                          </label>
                          <label class="a-field">
                            <span class="a-field__label">Save Label</span>
                            <input v-model="widget.saveLabel" class="a-input" type="text" placeholder="Save Changes">
                          </label>
                          <label class="a-field form-full">
                            <span class="a-field__label">Class</span>
                            <input v-model="widget.class" class="a-input" type="text">
                          </label>
                        </div>

                        <div class="panel-row smt-050">
                          <h6>Fields</h6>
                          <button class="a-btn a-btn--subtle" type="button" @click="addWidgetField(widget)">Field</button>
                        </div>

                        <div class="list-stack">
                          <div v-for="field in widget.fields" :key="field.id" class="field-item-grid">
                            <input v-model="field.id" class="a-input" type="text" placeholder="id">
                            <select v-model="field.field" class="a-select">
                              <option v-for="option in modelFieldOptions" :key="`field-opt-${field.id}-${option}`" :value="option">
                                {{ option }}
                              </option>
                            </select>
                            <input v-model="field.label" class="a-input" type="text" placeholder="label">
                            <input v-model="field.component.name" class="a-input" type="text" placeholder="AInput">
                            <input v-model="field.action" class="a-input" type="text" placeholder="car.update">
                            <input v-model="field.modelKey" class="a-input" type="text" placeholder="modelKey">
                            <button class="a-btn a-btn--ghost" type="button" @click="removeWidgetField(widget, field.id)">Remove</button>
                          </div>
                        </div>

                        <div v-if="widget.type === 'fields-card'" class="layout-editor smt-050">
                          <div class="panel-row">
                            <h6>Field Card Layout</h6>
                            <button class="a-btn a-btn--subtle" type="button" @click="addWidgetLayoutRow(widget)">
                              Row
                            </button>
                          </div>

                          <div class="rows-stack">
                            <section
                              v-for="layoutRow in widget.layout?.rows || []"
                              :key="layoutRow.id"
                              class="row-editor"
                            >
                              <div class="row-editor__head">
                                <h6>{{ layoutRow.name || layoutRow.id }}</h6>
                                <div class="row-actions">
                                  <button class="a-btn a-btn--subtle" type="button" @click="addWidgetLayoutColumn(widget, layoutRow)">
                                    Column
                                  </button>
                                  <button class="a-btn a-btn--ghost" type="button" @click="removeWidgetLayoutRow(widget, layoutRow.id)">
                                    Remove Row
                                  </button>
                                </div>
                              </div>

                              <div class="settings-fields">
                                <label class="a-field">
                                  <span class="a-field__label">Row ID</span>
                                  <input v-model="layoutRow.id" class="a-input" type="text">
                                </label>
                                <label class="a-field">
                                  <span class="a-field__label">Row Name</span>
                                  <input v-model="layoutRow.name" class="a-input" type="text">
                                </label>
                                <label class="a-field form-full">
                                  <span class="a-field__label">Row Class</span>
                                  <input v-model="layoutRow.class" class="a-input" type="text" placeholder="grid tm:grid-cols-2 sg-050">
                                </label>
                              </div>

                              <div class="columns-stack">
                                <section
                                  v-for="layoutColumn in layoutRow.columns"
                                  :key="layoutColumn.id"
                                  class="column-editor"
                                >
                                  <div class="row-editor__head">
                                    <h6>{{ layoutColumn.id }}</h6>
                                    <button class="a-btn a-btn--ghost" type="button" @click="removeWidgetLayoutColumn(widget, layoutRow, layoutColumn.id)">
                                      Remove Column
                                    </button>
                                  </div>

                                  <div class="settings-fields">
                                    <label class="a-field">
                                      <span class="a-field__label">Column ID</span>
                                      <input v-model="layoutColumn.id" class="a-input" type="text">
                                    </label>
                                    <label class="a-field">
                                      <span class="a-field__label">Column Class</span>
                                      <input v-model="layoutColumn.class" class="a-input" type="text" placeholder="tm:col-span-6">
                                    </label>
                                    <label class="a-field form-full">
                                      <span class="a-field__label">Field IDs (comma-separated)</span>
                                      <input
                                        :value="fieldIdsToCsv(layoutColumn.fieldIds)"
                                        class="a-input"
                                        type="text"
                                        placeholder="firstName, email"
                                        @input="setLayoutColumnFieldIds(widget, layoutColumn, ($event.target as HTMLInputElement).value)"
                                      >
                                    </label>
                                  </div>
                                </section>
                              </div>
                            </section>
                          </div>
                        </div>
                      </section>
                    </div>
                  </section>
                </div>
              </section>
            </div>

            <p v-else class="a-copy smt-050">
              No rows in this tab yet. Add a row, then columns, widgets and fields.
            </p>
          </article>
        </section>
      </template>
    </template>

    <section v-else class="a-card">
      <p class="a-copy">Loading model spec…</p>
    </section>
  </section>
</template>

<style scoped>
.builder-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.builder-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.builder-tabs {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.builder-tab {
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text-soft);
  padding: 0.45rem 0.75rem;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  cursor: pointer;
}

.builder-tab.is-active {
  background: var(--colors-slate-100);
  color: var(--admin-text);
}

.builder-source {
  margin-left: auto;
}

.builder-notice {
  margin: 0;
  color: var(--admin-success);
  font-size: var(--fs--075, 0.86rem);
}

.builder-notice.is-error {
  color: var(--admin-danger);
}

.builder-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.72rem;
}

.settings-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.52rem;
}

.form-full {
  grid-column: 1 / -1;
}

.inline-field {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.62rem;
}

.inline-field input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
}

.panel-title {
  margin: 0;
  font-size: var(--fs-025, 1.04rem);
  color: var(--admin-text);
  letter-spacing: -0.01em;
  font-weight: 600;
}

.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.panel-row__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.list-stack {
  display: grid;
  gap: 0.45rem;
}

.list-item-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.42rem;
}

.api-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.api-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.typesense-summary {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.62rem;
  display: grid;
  gap: 0.42rem;
}

.typesense-summary__status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.typesense-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 0.62rem;
  align-items: start;
}

.typesense-workbench__steps {
  display: grid;
  gap: 0.52rem;
}

.typesense-workbench__console {
  position: sticky;
  top: 0.72rem;
}

.typesense-step-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.62rem;
  display: grid;
  gap: 0.48rem;
}

.typesense-step-card__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.48rem;
  align-items: start;
}

.typesense-step-card__head h3 {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--025, 0.94rem);
  font-weight: 600;
}

.typesense-step-card__head p {
  margin: 0.15rem 0 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.typesense-step-index {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  color: var(--admin-brand-text);
  background: color-mix(in srgb, var(--admin-brand) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--admin-brand) 30%, transparent);
}

.api-result {
  margin: 0;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.55rem;
  max-height: 18rem;
  overflow: auto;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}

.file-item {
  display: grid;
  gap: 0.22rem;
}

.file-item code {
  display: block;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
  background: var(--admin-surface-muted);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-sm);
  padding: 0.42rem 0.52rem;
  overflow-wrap: anywhere;
}

.builder-layout-grid {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 0.72rem;
}

.section-panel {
  height: fit-content;
  position: sticky;
  top: 0.72rem;
  display: grid;
  gap: 0.55rem;
}

.section-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

.section-list {
  display: grid;
  gap: 0.3rem;
}

.section-pill-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.32rem;
}

.section-pill {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text-soft);
  padding: 0.42rem 0.58rem;
  text-align: left;
  cursor: pointer;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.section-pill.is-active {
  background: var(--colors-slate-100);
  color: var(--admin-text);
}

.section-remove {
  width: 1.45rem;
  height: 1.45rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--admin-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.section-create {
  display: grid;
  gap: 0.35rem;
}

.rows-stack,
.columns-stack,
.widgets-stack {
  display: grid;
  gap: 0.52rem;
}

.row-editor,
.column-editor,
.widget-editor {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.62rem;
  display: grid;
  gap: 0.52rem;
}

.row-editor__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.42rem;
}

.row-editor__head h3,
.row-editor__head h4,
.row-editor__head h5,
.row-editor__head h6 {
  margin: 0;
  color: var(--admin-text);
  font-weight: 600;
}

.field-item-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.4rem;
}

@media (max-width: 1260px) {
  .field-item-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .list-item-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .api-meta-grid {
    grid-template-columns: 1fr;
  }

  .typesense-workbench {
    grid-template-columns: 1fr;
  }

  .typesense-workbench__console {
    position: static;
  }
}

@media (max-width: 1080px) {
  .builder-settings-grid,
  .builder-layout-grid,
  .settings-fields,
  .list-item-grid,
  .field-item-grid {
    grid-template-columns: 1fr;
  }

  .section-panel {
    position: static;
  }
}

@media (max-width: 900px) {
  .builder-header {
    flex-direction: column;
  }

  .builder-tabs {
    flex-wrap: wrap;
  }

  .builder-source {
    margin-left: 0;
  }
}
</style>
