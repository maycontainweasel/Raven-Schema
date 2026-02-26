<script setup lang="ts">
import { defineAsyncComponent, type Component } from 'vue'
import { sourceDbInstance, tenantDbInstances } from '@schema/db'
import AInput from '#layers/helios-ui/app/components/fields/AInput.vue'
import ACombobox from '#layers/helios-ui/app/components/fields/ACombobox.vue'
import AComboboxAsync from '#layers/helios-ui/app/components/fields/AComboboxAsync.vue'
import AColorPicker from '#layers/helios-ui/app/components/fields/AColorPicker.vue'
import type {
  DirectoryFilterSpec,
  ModelLayoutSpec,
  ModelSpecResponse,
  ModelUIFieldSpec,
} from '#helios-admin/app/types/model-spec'
import type {
  ModelCreateRecordContext,
  ModelCreateRecordOverride,
  ModelCreateRecordSyncResponse,
} from '#helios-admin/app/types/model-overrides'

type DirectoryRecord = {
  rid: string
  [key: string]: any
}

type DirectoryRuntimeResponse = {
  ok: boolean
  records: DirectoryRecord[]
  count: number
  runtime?: {
    source?: string
    collection?: string
    queryBy?: string
  }
}

type AComboboxOption = {
  label: string
  value: string
  group?: string
  disabled?: boolean
}

type ModelTypesenseStatus = {
  collection?: Record<string, any> | null
  count?: number
  preview?: Record<string, any>[]
}

type RefreshMode = 'source-all' | 'source-instance' | 'tenant-all' | 'tenant-single'

type RefreshRunSummary = {
  target: string
  total: number
  fetched: number
  filtered: number
  upserted: number
  batches: number
  durationMs: number
  ok: boolean
  error?: string
}

const route = useRoute()
const router = useRouter()
const { $process } = useCRUD()

const modelParam = computed(() => {
  const fromParams = String(route.params.model ?? '').trim().toLowerCase()
  if (fromParams) return fromParams

  const fromMeta = String((route.meta as any)?.modelKey ?? '').trim().toLowerCase()
  return fromMeta
})
const modelTypesense = useModelTypesense(modelParam)
const search = ref('')
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createDraft = ref<Record<string, any>>({})
const filterState = ref<Record<string, string | string[]>>({})
const refreshOpen = ref(false)
const refreshBusy = ref(false)
const testSingleBusy = ref(false)
const refreshError = ref('')
const refreshNotice = ref('')
const refreshStep = ref('')
const refreshStatus = ref<ModelTypesenseStatus | null>(null)
const refreshStatusBusy = ref(false)
const refreshStatusError = ref('')
const refreshRuns = ref<RefreshRunSummary[]>([])
const testSingleResult = ref<Record<string, any> | null>(null)
const refreshMode = ref<RefreshMode>('source-all')
const refreshTenantTarget = ref<string>('all')
const refreshInstanceFilter = ref<string>('all')
const refreshBatchSize = ref<number>(200)
const createDialogOverrideModules = import.meta.glob('@/components/admin/overrides/**/CreateDialog.vue')
const createRecordOverrideModules = import.meta.glob('@/components/admin/overrides/**/createRecord.{ts,js,mjs}')
const directoryCellOverrideModules = import.meta.glob('@/components/admin/overrides/**/directory/cells/*.vue')
const directoryCellOverrideCache = new Map<string, Component | null>()

const { data: specData, pending: specPending, error: specError } = await useFetch<ModelSpecResponse>(
  () => `/api/models/layout/${modelParam.value}`,
  { watch: [modelParam] },
)

const toTypesenseLiteral = (value: string) => {
  const safe = String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
  return `\`${safe}\``
}

const directoryFilterBy = computed(() => {
  const filters = specData.value?.spec?.directory?.listing?.filters || []
  const statements: string[] = []

  for (const filter of filters) {
    const key = String((filter as any)?.key || '').trim()
    if (!key) continue
    const current = filterState.value[key]

    if (Array.isArray(current)) {
      const values = current
        .map((entry) => String(entry || '').trim())
        .filter((entry) => entry.length > 0)
      if (!values.length) continue
      statements.push(`${key}:=[${values.map(toTypesenseLiteral).join(',')}]`)
      continue
    }

    if (String((filter as any)?.component?.name || '').trim() !== 'ACombobox') continue
    const value = String(current ?? '').trim()
    if (!value.length) continue
    statements.push(`${key}:=${toTypesenseLiteral(value)}`)
  }

  return statements.join(' && ')
})

const directoryEndpoint = computed(() => {
  const params = new URLSearchParams()
  params.set('limit', '250')
  params.set('start', '0')

  const query = search.value.trim()
  if (query) params.set('search', query)

  const filterBy = directoryFilterBy.value.trim()
  if (filterBy) params.set('filterBy', filterBy)

  return `/api/models/runtime/${modelParam.value}/directory?${params.toString()}`
})

const {
  data: directoryData,
  pending: directoryPending,
  error: directoryError,
  refresh: refreshDirectory,
} = await useFetch<DirectoryRuntimeResponse>(
  () => directoryEndpoint.value,
  {
    watch: [directoryEndpoint],
  },
)

const spec = computed<ModelLayoutSpec | null>(() => specData.value?.spec ?? null)
const modelInfo = computed(() => specData.value?.model ?? null)
const modelLabel = computed(() => modelInfo.value?.label || modelParam.value)
const modelDataMode = computed<'source' | 'tenant'>(() => modelInfo.value?.dataMode === 'tenant' ? 'tenant' : 'source')
const sourceDbKey = computed(() => String(sourceDbInstance || '').trim())
const tenantDbKeys = computed<string[]>(() =>
  (tenantDbInstances as readonly string[])
    .map(entry => String(entry || '').trim())
    .filter(entry => entry.length > 0))
const refreshTypesenseReady = computed(() => Boolean(spec.value?.directory.typesense.enabled))
const refreshModeResolved = computed<RefreshMode>(() => {
  if (modelDataMode.value === 'tenant') {
    return refreshMode.value === 'tenant-single' ? 'tenant-single' : 'tenant-all'
  }
  return refreshMode.value === 'source-instance' ? 'source-instance' : 'source-all'
})
const canRunRefresh = computed(() => {
  const mode = refreshModeResolved.value
  if (mode === 'tenant-single') return refreshTenantTarget.value.trim().length > 0 && refreshTenantTarget.value !== 'all'
  if (mode === 'source-instance') return refreshInstanceFilter.value.trim().length > 0 && refreshInstanceFilter.value !== 'all'
  return true
})
const canRunTestSingle = computed(() => {
  if (!canRunRefresh.value) return false
  const targets = resolveRefreshTargets()
  return targets.length === 1
})
const directoryErrorMessage = computed(() => {
  const apiError = directoryError.value as any
  return (
    apiError?.data?.statusMessage ||
    apiError?.statusMessage ||
    apiError?.message ||
    ''
  )
})
const rows = computed<DirectoryRecord[]>(() => {
  const list = directoryData.value?.records
  return Array.isArray(list) ? list : []
})

const refreshModeOptions = computed(() => {
  if (modelDataMode.value === 'tenant') {
    return [
      { label: 'All tenant databases', value: 'tenant-all' as const },
      { label: 'Single tenant database', value: 'tenant-single' as const },
    ]
  }
  return [
    { label: 'All records from source DB', value: 'source-all' as const },
    { label: 'Only records tagged to an instance', value: 'source-instance' as const },
  ]
})

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

const resolveDirectoryCellOverrideComponent = (modelKey: string, columnKey: string): Component | null => {
  const cacheKey = `${modelKey}::${columnKey}`
  if (directoryCellOverrideCache.has(cacheKey)) return directoryCellOverrideCache.get(cacheKey) ?? null

  const normalizedModel = toFileToken(modelKey, 'model')
  const normalizedColumn = toFileToken(columnKey, 'field')
  const loader = findOverrideLoader(directoryCellOverrideModules, [
    `components/admin/overrides/${normalizedModel}/directory/cells/${columnKey}.vue`,
    `components/admin/overrides/${normalizedModel}/directory/cells/${normalizedColumn}.vue`,
  ])
  const resolved = loader ? defineAsyncComponent(loader as any) : null
  directoryCellOverrideCache.set(cacheKey, resolved)
  return resolved
}

const toLabel = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const resolveFieldKey = (field: ModelUIFieldSpec) => {
  return String(field.modelKey || field.field || field.id || '').trim()
}

const normalizePayloadValue = (field: ModelUIFieldSpec, value: unknown) => {
  const options = field.component?.options || {}
  if (field.component?.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') {
    if (value === '' || value === null || typeof value === 'undefined') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}

const inferCreateDefault = (field: ModelUIFieldSpec) => {
  const options = field.component?.options || {}
  if (typeof options.defaultValue !== 'undefined') return options.defaultValue

  if (field.component.name === 'AColorPicker') return '#000000'

  if (field.component.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') {
    return 0
  }

  if (field.component.name === 'ACombobox' || field.component.name === 'AComboboxAsync') {
    if (options.multiple) return []

    const normalized = resolveFieldKey(field).toLowerCase()
    if (normalized.includes('status')) return 'draft'
    return ''
  }

  return ''
}

const initDraftFromSpec = () => {
  const nextDraft: Record<string, any> = {}
  const createFields = spec.value?.directory.createDialog.fields ?? []

  for (const field of createFields) {
    nextDraft[resolveFieldKey(field)] = inferCreateDefault(field)
  }

  createDraft.value = nextDraft
}

const initFilterState = () => {
  const nextFilterState: Record<string, string | string[]> = {}
  const filters = spec.value?.directory.listing.filters ?? []

  for (const filter of filters) {
    const key = String(filter.key || '').trim()
    if (!key) continue
    const multiple = Boolean(filter.component?.options?.multiple)
    nextFilterState[key] = multiple ? [] : ''
  }

  filterState.value = nextFilterState
}

watch(
  () => spec.value,
  () => {
    initDraftFromSpec()
    initFilterState()
    search.value = ''
    createOpen.value = false
    createError.value = ''
    void refreshDirectory()
  },
  { immediate: true, deep: true },
)

watch(
  () => modelDataMode.value,
  (mode) => {
    refreshMode.value = mode === 'tenant' ? 'tenant-all' : 'source-all'
    refreshTenantTarget.value = 'all'
    refreshInstanceFilter.value = 'all'
    refreshBatchSize.value = 200
  },
  { immediate: true },
)

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const readTypesenseStatus = async () => {
  refreshStatusBusy.value = true
  refreshStatusError.value = ''
  try {
    const statusResponse = await modelTypesense.readStatus({ limit: 1, start: 0 })
    refreshStatus.value = (statusResponse?.status ?? null) as ModelTypesenseStatus | null
  }
  catch (error: any) {
    refreshStatusError.value = error?.message ?? 'Failed to load TypeSense status.'
  }
  finally {
    refreshStatusBusy.value = false
  }
}

const openRefreshDialog = async () => {
  refreshOpen.value = true
  refreshError.value = ''
  refreshNotice.value = ''
  refreshStep.value = ''
  refreshRuns.value = []
  testSingleResult.value = null
  await readTypesenseStatus()
}

const resolveRefreshTargets = (): string[] => {
  if (modelDataMode.value === 'tenant') {
    if (refreshModeResolved.value === 'tenant-single') {
      return [refreshTenantTarget.value.trim()].filter(Boolean)
    }
    return tenantDbKeys.value
  }
  return [sourceDbKey.value].filter(Boolean)
}

const runModelRefresh = async () => {
  refreshBusy.value = true
  refreshError.value = ''
  refreshNotice.value = ''
  refreshStep.value = ''
  refreshRuns.value = []

  try {
    const targets = resolveRefreshTargets()
    if (!targets.length) {
      throw new Error('No target database selected for refresh.')
    }

    const batchSize = Math.max(1, Math.floor(safeNumber(refreshBatchSize.value, 200)))
    const instanceFilter =
      refreshModeResolved.value === 'source-instance' && refreshInstanceFilter.value !== 'all'
        ? String(refreshInstanceFilter.value || '').trim()
        : ''

    for (const [index, target] of targets.entries()) {
      const startedAt = Date.now()
      refreshStep.value = `Refreshing ${target} (${index + 1}/${targets.length})…`
      try {
        const response = await modelTypesense.runAction('refreshCollection', {
          instance: target,
          batchSize,
          instanceFilter: instanceFilter || undefined,
        })
        const summary = (response?.result?.result ?? response?.result ?? {}) as Record<string, any>
        const upsertedRaw = summary.upserted
        const upserted =
          typeof upsertedRaw === 'number'
            ? upsertedRaw
            : safeNumber((upsertedRaw as any)?.imported, safeNumber((upsertedRaw as any)?.count, 0))

        refreshRuns.value.push({
          target,
          total: safeNumber(summary.total, 0),
          fetched: safeNumber(summary.fetched, 0),
          filtered: safeNumber(summary.filtered, safeNumber(summary.fetched, 0)),
          upserted: safeNumber(upserted, 0),
          batches: Math.max(1, safeNumber(summary.batches, 1)),
          durationMs: Date.now() - startedAt,
          ok: summary.ok !== false,
        })
      }
      catch (error: any) {
        refreshRuns.value.push({
          target,
          total: 0,
          fetched: 0,
          filtered: 0,
          upserted: 0,
          batches: 0,
          durationMs: Date.now() - startedAt,
          ok: false,
          error: error?.message ?? 'Refresh failed.',
        })
      }
    }

    const failed = refreshRuns.value.filter(item => !item.ok).length
    if (failed > 0) {
      refreshNotice.value = `Refresh completed with ${failed} failed target${failed === 1 ? '' : 's'}.`
    } else {
      refreshNotice.value = `Refresh completed for ${refreshRuns.value.length} target${refreshRuns.value.length === 1 ? '' : 's'}.`
    }

    await refreshDirectory()
    await readTypesenseStatus()
  }
  catch (error: any) {
    refreshError.value = error?.message ?? 'Failed to run refresh.'
  }
  finally {
    refreshStep.value = ''
    refreshBusy.value = false
  }
}

const runTestSingle = async () => {
  testSingleBusy.value = true
  refreshError.value = ''
  refreshNotice.value = ''
  refreshStep.value = ''
  testSingleResult.value = null

  try {
    const targets = resolveRefreshTargets()
    if (targets.length !== 1) {
      throw new Error('Test Single requires one target. Choose source mode or a single tenant.')
    }

    const target = targets[0]!
    const instanceFilter =
      refreshModeResolved.value === 'source-instance' && refreshInstanceFilter.value !== 'all'
        ? String(refreshInstanceFilter.value || '').trim()
        : ''

    refreshStep.value = `Testing one record from ${target}…`

    const response = await modelTypesense.runAction('testSingle', {
      instance: target,
      instanceFilter: instanceFilter || undefined,
      start: 0,
    })
    const result = (response?.result?.result ?? response?.result ?? {}) as Record<string, any>
    testSingleResult.value = result

    console.log('[directory-refresh:test-single]', {
      model: modelParam.value,
      authority: modelDataMode.value,
      target,
      instanceFilter: instanceFilter || null,
      payload: result,
    })

    if (result?.record) {
      refreshNotice.value = 'Test single succeeded. Raw payload logged to browser console.'
    } else {
      refreshNotice.value = 'No record returned for the selected target/filter.'
    }
  }
  catch (error: any) {
    refreshError.value = error?.message ?? 'Test single failed.'
  }
  finally {
    refreshStep.value = ''
    testSingleBusy.value = false
  }
}

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

      const group = String((entry as any).group ?? '').trim() || undefined
      const disabled = Boolean((entry as any).disabled)
      return {
        label,
        value,
        group,
        disabled,
      }
    })
    .filter(Boolean) as AComboboxOption[]
}

const optionsForKeyFromRows = (key: string): AComboboxOption[] => {
  const seen = new Set<string>()

  return rows.value
    .map((row) => String(row[key] ?? '').trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
    .map((value) => ({
      label: toLabel(value),
      value,
    }))
}

const resolveFilterOptions = (filter: DirectoryFilterSpec): AComboboxOption[] => {
  const fromSpec = asComboboxOptions(filter.component?.options?.options)
  if (fromSpec.length) return fromSpec

  return optionsForKeyFromRows(filter.key)
}

const resolveCreateFieldOptions = (field: ModelUIFieldSpec): AComboboxOption[] => {
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

const searchCreateFieldOptions = async (field: ModelUIFieldSpec, query: string): Promise<AComboboxOption[]> => {
  const source = resolveCreateFieldOptions(field)
  const q = query.trim().toLowerCase()
  if (!q) return []

  await new Promise(resolve => setTimeout(resolve, 120))

  return source.filter(option => {
    const label = option.label.toLowerCase()
    const value = option.value.toLowerCase()
    return label.includes(q) || value.includes(q)
  })
}

const resolveFieldComponent = (name: string) => {
  if (name === 'ACombobox') return ACombobox
  if (name === 'AComboboxAsync') return AComboboxAsync
  if (name === 'AColorPicker') return AColorPicker
  return AInput
}

const resolveCreateDialogOverride = (modelKey: string) => {
  const normalized = String(modelKey || '').trim().toLowerCase()
  if (!normalized) return null

  const suffix = `components/admin/overrides/${normalized}/CreateDialog.vue`
  const match = Object.keys(createDialogOverrideModules).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(createDialogOverrideModules[match] as any)
}

const resolveCreateRecordOverride = async (modelKey: string): Promise<ModelCreateRecordOverride | null> => {
  const normalized = String(modelKey || '').trim().toLowerCase()
  if (!normalized) return null

  const suffixBase = `components/admin/overrides/${normalized}/createRecord`
  const match = Object.keys(createRecordOverrideModules).find((key) =>
    key.endsWith(`${suffixBase}.ts`)
    || key.endsWith(`${suffixBase}.js`)
    || key.endsWith(`${suffixBase}.mjs`))
  if (!match) return null

  const loaded = await (createRecordOverrideModules[match] as any)()
  const override = (loaded as any)?.default ?? loaded
  return typeof override === 'function' ? (override as ModelCreateRecordOverride) : null
}

const createDialogOverrideComponent = computed(() => resolveCreateDialogOverride(modelParam.value))

const resolveCreateFieldProps = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field)
  const base = {
    label: field.label || toLabel(key),
    helperText: `field=${field.field}`,
  }

  const options = field.component?.options || {}
  const placeholder = String(options.placeholder ?? `Enter ${toLabel(key).toLowerCase()}`).trim()

  if (field.component.name === 'AColorPicker') {
    return {
      ...base,
      helperText: options.helperText || base.helperText,
    }
  }

  if (field.component.name === 'ACombobox') {
    return {
      ...base,
      placeholder,
      options: resolveCreateFieldOptions(field),
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
      helperText: options.helperText || base.helperText,
    }
  }

  if (field.component.name === 'AComboboxAsync') {
    return {
      ...base,
      placeholder,
      search: (query: string) => searchCreateFieldOptions(field, query),
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
      minChars: Number(options.minChars ?? 1),
      helperText: options.helperText || base.helperText,
    }
  }

  return {
    ...base,
    type: String(options.type ?? 'text'),
    placeholder,
    helperText: options.helperText || base.helperText,
  }
}

const setCreateValue = (field: ModelUIFieldSpec, value: unknown) => {
  const key = resolveFieldKey(field)
  createDraft.value = {
    ...createDraft.value,
    [key]: value,
  }
}

const setCreateDraft = (value: Record<string, any>) => {
  createDraft.value = {
    ...(value || {}),
  }
}

const getCellValue = (row: DirectoryRecord, key: string) => {
  if (key === 'rid') return row.rid
  return row[key]
}

const resolveDirectoryCellOverrideProps = (row: DirectoryRecord, column: { key: string, label?: string }) => {
  const key = String(column.key || '').trim()
  const value = getCellValue(row, key)
  return {
    modelKey: modelParam.value,
    columnKey: key,
    columnLabel: String(column.label || toLabel(key)),
    column,
    row,
    rid: String(row.rid || ''),
    value,
    formattedValue: formatCell(value),
  }
}

const formatCell = (value: unknown) => {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (!value) return '—'
  return String(value)
}

const formatDateTime = (value: unknown) => {
  const raw = String(value ?? '').trim()
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw || '—'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const extractFirstObject = (value: any): Record<string, any> | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const entry of value) {
      const next = extractFirstObject(entry)
      if (next) return next
    }
    return null
  }
  if (typeof value === 'object') return value as Record<string, any>
  return null
}

const statusTone = (value: unknown) => {
  const text = String(value ?? '').trim().toLowerCase()
  if (text.includes('publish')) return 'published'
  if (text.includes('review')) return 'review'
  return 'draft'
}

const filteredRows = computed(() => {
  const baseRows = rows.value
  const listingFields = spec.value?.directory.listing.fields ?? []
  const searchQuery = search.value.trim().toLowerCase()

  return baseRows.filter((row) => {
    if (searchQuery) {
      const match = listingFields.some((field) => {
        const key = String(field.key || '').trim()
        const value = formatCell(getCellValue(row, key)).toLowerCase()
        return value.includes(searchQuery)
      })

      if (!match) return false
    }

    const filters = spec.value?.directory.listing.filters ?? []
    for (const filter of filters) {
      const key = String(filter.key || '').trim()
      if (!key) continue
      const current = filterState.value[key]
      if (Array.isArray(current)) {
        if (!current.length) continue
        const rowValue = String(getCellValue(row, key) ?? '')
        if (!current.includes(rowValue)) return false
        continue
      }

      const query = String(current ?? '').trim().toLowerCase()
      if (!query) continue

      const rowValue = String(getCellValue(row, key) ?? '').trim().toLowerCase()
      if (!rowValue.includes(query)) return false
    }

    return true
  })
})

const isMissingRequiredValue = (value: unknown) => {
  if (value === null || typeof value === 'undefined') return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  return false
}

const resolveRequiredCreateKeys = () => {
  return (spec.value?.directory.createDialog.required ?? [])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)
}

const resolveCreateActionTarget = () => {
  const normalizedModel = String(modelParam.value || '').trim().toLowerCase()
  const raw = String(spec.value?.directory.createDialog.action || '').trim() || `${normalizedModel}.create`
  const segments = raw
    .split('.')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)

  if (!segments.length || segments.length > 2) {
    throw new Error(`Invalid create action "${raw}".`)
  }

  const procedure = segments.length === 1 ? segments[0]! : segments[1]!
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(procedure)) {
    throw new Error(`Invalid create action "${raw}".`)
  }

  if (segments.length === 2 && segments[0]!.toLowerCase() !== normalizedModel) {
    throw new Error(`Create action "${raw}" must target "${normalizedModel}".`)
  }

  return `${normalizedModel}.${procedure}`
}

const buildCreatePayload = () => {
  const currentSpec = spec.value
  if (!currentSpec) return {}

  const payload: Record<string, any> = {}
  for (const field of currentSpec.directory.createDialog.fields || []) {
    const key = resolveFieldKey(field)
    if (!key) continue
    payload[key] = normalizePayloadValue(field, createDraft.value[key])
  }
  return payload
}

const processCreatePayload = async (payload: Record<string, any>) => {
  const action = resolveCreateActionTarget()
  return await $process(action, payload, {
    authority: modelDataMode.value,
    autoToast: false,
    consoleLogging: true,
    trackAttempts: false,
    throwOnFailure: true,
  })
}

const syncCreatedRecord = async (record: Record<string, any>) => {
  return await $fetch<ModelCreateRecordSyncResponse>(`/api/models/runtime/${modelParam.value}/sync`, {
    method: 'POST',
    body: {
      record,
    },
  })
}

const navigateAfterCreateSync = async (syncResponse: ModelCreateRecordSyncResponse) => {
  if (syncResponse.redirectTo) {
    await router.push(syncResponse.redirectTo)
    return
  }

  if (syncResponse.slug) {
    const routeBase = String(spec.value?.directory?.route || `/admin/${modelParam.value}`)
      .trim()
      .replace(/\/+$/, '')
    await router.push(`${routeBase}/${encodeURIComponent(syncResponse.slug)}`)
  }
}

const runDefaultCreateRecord = async (context: ModelCreateRecordContext) => {
  const payload = context.buildPayload()
  const required = context.requiredKeys
  const missing = required.filter((key) => isMissingRequiredValue(payload[key]))

  if (missing.length) {
    throw new Error(`Missing required create fields: ${missing.join(', ')}`)
  }

  context.logger.info('[model-create] request', {
    model: context.modelKey,
    payload,
    required,
  })

  const createdRaw = await context.processCreate(payload)
  const createdRecord = context.extractFirstObject(createdRaw)
  if (!createdRecord) {
    throw new Error('Create succeeded but no record was returned.')
  }

  context.logger.info('[model-create] response', {
    model: context.modelKey,
    createdRecord,
  })

  const syncResponse = await context.syncRecord(createdRecord)
  context.logger.info('[model-create] sync', {
    model: context.modelKey,
    syncResponse,
  })

  await context.refreshDirectory()
  context.closeCreateDialog()
  context.resetCreateDraft()
  await context.navigateAfterSync(syncResponse)
}

const buildCreateRecordContext = (): ModelCreateRecordContext => {
  if (!spec.value) {
    throw new Error('Model spec must be loaded before creating records.')
  }

  const logger = {
    info: (message: string, payload?: any) => console.info(message, payload),
    warn: (message: string, payload?: any) => console.warn(message, payload),
    error: (message: string, payload?: any) => console.error(message, payload),
  }

  const context: ModelCreateRecordContext = {
    modelKey: modelParam.value,
    spec: spec.value,
    requiredKeys: resolveRequiredCreateKeys(),
    createDraft: { ...createDraft.value },
    getCreateDraft: () => ({ ...createDraft.value }),
    setCreateDraft: (draft) => setCreateDraft(draft),
    setCreateError: (message) => {
      createError.value = String(message || '')
    },
    resolveFieldKey,
    normalizePayloadValue,
    buildPayload: buildCreatePayload,
    processCreate: processCreatePayload,
    extractFirstObject,
    syncRecord: syncCreatedRecord,
    refreshDirectory: async () => await refreshDirectory(),
    closeCreateDialog: () => {
      createOpen.value = false
    },
    resetCreateDraft: () => {
      initDraftFromSpec()
    },
    navigateAfterSync: navigateAfterCreateSync,
    defaultCreateRecord: async () => {},
    logger,
  }

  context.defaultCreateRecord = async () => {
    await runDefaultCreateRecord(context)
  }

  return context
}

const createRecord = async () => {
  if (!spec.value) return

  creating.value = true
  createError.value = ''

  try {
    const context = buildCreateRecordContext()
    const override = await resolveCreateRecordOverride(modelParam.value)

    if (override) {
      context.logger.info('[model-create] override detected', {
        model: context.modelKey,
        override: `components/admin/overrides/${context.modelKey}/createRecord.ts`,
      })
      await override(context)
      return
    }

    await context.defaultCreateRecord()
  }
  catch (error: any) {
    console.error('[model-create] failed', {
      model: modelParam.value,
      statusMessage: error?.data?.statusMessage,
      debug: error?.data?.data,
      error,
    })
    createError.value = error?.data?.statusMessage ?? error?.message ?? 'Create failed.'
  }
  finally {
    creating.value = false
  }
}

const readSubIdFromUnknown = (value: unknown): string | null => {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (trimmed.includes(':')) return trimmed.split(':').slice(1).join(':') || null
    return trimmed
  }
  if (value && typeof value === 'object') {
    const nested = (value as Record<string, any>).id
    const nestedTable = (value as Record<string, any>).tb
    if (typeof nested === 'string' || typeof nested === 'number') {
      const sub = String(nested).trim()
      if (!sub) return null
      if (String(nestedTable || '').trim().length) return sub
      if (sub.includes(':')) return sub.split(':').slice(1).join(':') || null
      return sub
    }
  }
  return null
}

const readRecordValueByKey = (row: DirectoryRecord, key: string): unknown => {
  if (!key) return undefined
  if (Object.hasOwn(row, key)) return row[key]
  const target = key.toLowerCase()
  const match = Object.keys(row).find(entry => entry.toLowerCase() === target)
  return match ? row[match] : undefined
}

const slugifyToken = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resolveRowSlug = (row: DirectoryRecord) => {
  const policyRaw = String(spec.value?.directory?.slugPolicy || 'rid').trim()
  const policy = policyRaw.toLowerCase()

  const rid = String(row.rid ?? '').trim()
  const subId = String(
    row.__subId
    ?? readSubIdFromUnknown(row.id)
    ?? readSubIdFromUnknown(row.rid)
    ?? '',
  ).trim()

  if (!policy || policy === 'rid') {
    return rid || (subId ? `${String(row.__table || modelParam.value).trim()}:${subId}` : '')
  }

  if (policy === 'subid' || policy === 'sub-id' || policy === 'sub_id' || policy === 'id') {
    return subId || (rid.includes(':') ? rid.split(':').slice(1).join(':') : rid)
  }

  if (policy === 'slug' || policy === 'custom') {
    const direct = String(row.slug ?? row.key ?? row.title ?? row.name ?? '').trim()
    return slugifyToken(direct)
  }

  const fieldToken = String(readRecordValueByKey(row, policyRaw) ?? '').trim()
  if (fieldToken) return fieldToken

  return subId || rid
}

const toRecordRoute = (row: DirectoryRecord) => {
  const routeBase = String(spec.value?.directory?.route || `/admin/${modelParam.value}`)
    .trim()
    .replace(/\/+$/, '')
  const slug = String(resolveRowSlug(row) || '').trim()
  if (!slug) return routeBase
  return `${routeBase}/${encodeURIComponent(slug)}`
}
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero directory-header">
      <div>
        <h1 class="a-title">{{ spec?.directory.title || `${modelLabel} Overview` }}</h1>
        <p class="a-copy">{{ spec?.directory.description || `Manage ${modelLabel.toLowerCase()} records.` }}</p>
      </div>
      <div class="directory-header__actions">
        <button class="a-btn a-btn--subtle" type="button" @click="openRefreshDialog">
          <AdminIcon name="refresh" :size="15" />
          Refresh
        </button>
        <button
          v-if="spec?.directory.createDialog.enabled"
          class="a-btn a-btn--primary"
          type="button"
          @click="createOpen = true"
        >
          <AdminIcon name="plus" :size="15" />
          {{ spec?.directory.createDialog.submitLabel || `Create ${modelLabel}` }}
        </button>
      </div>
    </header>

    <section class="a-card directory-card">
      <div class="directory-controls">
        <label class="a-field">
          <span class="a-field__label">Search</span>
          <div class="a-input-wrap">
            <AdminIcon name="search" :size="15" />
            <input
              v-model="search"
              class="a-input"
              type="text"
              :placeholder="`Search ${modelLabel} records...`"
            >
          </div>
        </label>

        <template v-for="filter in spec?.directory.listing.filters || []" :key="filter.key">
          <ACombobox
            v-if="filter.component?.name === 'ACombobox'"
            v-model="filterState[filter.key]"
            :label="filter.label || toLabel(filter.key)"
            :placeholder="`Filter ${filter.label || toLabel(filter.key)}`"
            :options="resolveFilterOptions(filter)"
            :grouped="Boolean(filter.component.options?.grouped)"
            :multiple="Boolean(filter.component.options?.multiple)"
            :highlight-match="Boolean(filter.component.options?.highlightMatch)"
            :clearable="Boolean(filter.component.options?.clearable ?? true)"
            :show-indicator="Boolean(filter.component.options?.showIndicator ?? true)"
            :helper-text="''"
          />

          <label v-else class="a-field">
            <span class="a-field__label">{{ filter.label || toLabel(filter.key) }}</span>
            <input
              v-model="filterState[filter.key]"
              class="a-input"
              type="text"
              :placeholder="`Filter ${filter.label || toLabel(filter.key)}`"
            >
          </label>
        </template>
      </div>

      <div class="a-table-wrap smt-075">
        <table class="a-table directory-table">
          <thead>
            <tr>
              <th v-for="column in spec?.directory.listing.fields || []" :key="`head-${column.key}`">
                {{ column.label || toLabel(column.key) }}
              </th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.rid">
              <td v-for="column in spec?.directory.listing.fields || []" :key="`row-${row.rid}-${column.key}`">
                <template v-if="resolveDirectoryCellOverrideComponent(modelParam, column.key)">
                  <component
                    :is="resolveDirectoryCellOverrideComponent(modelParam, column.key)"
                    v-bind="resolveDirectoryCellOverrideProps(row, column)"
                  />
                </template>
                <template v-else-if="column.key.toLowerCase().includes('status')">
                  <span class="a-status" :class="`a-status--${statusTone(getCellValue(row, column.key))}`">
                    {{ formatCell(getCellValue(row, column.key)) }}
                  </span>
                </template>
                <template v-else-if="column.key.toLowerCase().includes('updated') || column.key.toLowerCase().includes('created')">
                  {{ formatDateTime(getCellValue(row, column.key)) }}
                </template>
                <template v-else>
                  {{ formatCell(getCellValue(row, column.key)) }}
                </template>
              </td>
              <td class="text-right">
                <NuxtLink class="a-link" :to="toRecordRoute(row)">Manage</NuxtLink>
              </td>
            </tr>
            <tr v-if="!specPending && !directoryPending && filteredRows.length === 0">
              <td :colspan="(spec?.directory.listing.fields.length || 0) + 1" class="empty-row">
                No records match your filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="specError" class="directory-error smt-050">
        Failed to load model layout. Check
        <code>/models/{{ modelParam }}</code>
        and commit a spec.
      </p>
      <p v-else-if="directoryError" class="directory-error smt-050">
        Failed to load directory records. Check model TypeSense configuration in
        <code>/models/{{ modelParam }}</code>.
        <br>
        <span v-if="directoryErrorMessage">{{ directoryErrorMessage }}</span>
      </p>
    </section>

    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="refreshOpen" class="refresh-overlay" @click.self="refreshOpen = false">
          <section class="refresh-modal a-card">
            <div class="refresh-header">
              <h2 class="drawer-title">Refresh {{ modelLabel }} Directory</h2>
              <button class="a-btn a-btn--ghost drawer-close" type="button" @click="refreshOpen = false">
                <AdminIcon name="close" :size="16" />
              </button>
            </div>

            <p class="a-copy smt-025">
              Pull TypeSense resources from the correct database target for this model authority.
            </p>

            <div class="refresh-chips smt-050">
              <span class="a-chip">{{ `Authority: ${modelDataMode}` }}</span>
              <span class="a-chip">{{ `Source DB: ${sourceDbKey || 'unknown'}` }}</span>
              <span class="a-chip" :class="refreshTypesenseReady ? 'a-chip--success' : 'a-chip--warning'">
                {{ refreshTypesenseReady ? 'Typesense Ready' : 'Typesense Missing' }}
              </span>
              <span v-if="refreshStatusBusy" class="a-chip">Checking status…</span>
              <span v-else class="a-chip">{{ `Collection Count: ${Number(refreshStatus?.count || 0)}` }}</span>
            </div>

            <div class="refresh-form smt-075">
              <label class="a-field">
                <span class="a-field__label">Refresh Mode</span>
                <select v-model="refreshMode" class="a-input">
                  <option v-for="modeOption in refreshModeOptions" :key="modeOption.value" :value="modeOption.value">
                    {{ modeOption.label }}
                  </option>
                </select>
              </label>

              <label v-if="refreshModeResolved === 'tenant-single'" class="a-field">
                <span class="a-field__label">Tenant Database</span>
                <select v-model="refreshTenantTarget" class="a-input">
                  <option value="all" disabled>Select tenant</option>
                  <option v-for="tenantKey in tenantDbKeys" :key="tenantKey" :value="tenantKey">
                    {{ tenantKey }}
                  </option>
                </select>
              </label>

              <label v-if="refreshModeResolved === 'source-instance'" class="a-field">
                <span class="a-field__label">Instance Tag Filter</span>
                <select v-model="refreshInstanceFilter" class="a-input">
                  <option value="all" disabled>Select instance tag</option>
                  <option v-for="tenantKey in tenantDbKeys" :key="`tag-${tenantKey}`" :value="tenantKey">
                    {{ tenantKey }}
                  </option>
                </select>
              </label>

              <label class="a-field">
                <span class="a-field__label">Batch Size</span>
                <input
                  v-model.number="refreshBatchSize"
                  class="a-input"
                  type="number"
                  min="1"
                  step="1"
                >
              </label>
            </div>

            <p v-if="refreshStatusError" class="directory-error smt-050">{{ refreshStatusError }}</p>
            <p v-if="refreshStep" class="a-copy smt-050">{{ refreshStep }}</p>

            <div v-if="refreshRuns.length" class="a-table-wrap smt-050">
              <table class="a-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Total</th>
                    <th>Fetched</th>
                    <th>Filtered</th>
                    <th>Upserted</th>
                    <th>Batches</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="run in refreshRuns" :key="`refresh-${run.target}`">
                    <td>{{ run.target }}</td>
                    <td>{{ run.total }}</td>
                    <td>{{ run.fetched }}</td>
                    <td>{{ run.filtered }}</td>
                    <td>{{ run.upserted }}</td>
                    <td>{{ run.batches }}</td>
                    <td>
                      <span class="a-status" :class="run.ok ? 'a-status--published' : 'a-status--draft'">
                        {{ run.ok ? 'ok' : 'failed' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="drawer-actions smt-075">
              <button class="a-btn a-btn--subtle" type="button" :disabled="refreshBusy" @click="refreshOpen = false">
                Close
              </button>
              <button
                class="a-btn a-btn--subtle"
                type="button"
                :disabled="refreshBusy || testSingleBusy || !canRunTestSingle"
                @click="runTestSingle"
              >
                {{ testSingleBusy ? 'Testing…' : 'Test Single' }}
              </button>
              <button
                class="a-btn a-btn--primary"
                type="button"
                :disabled="refreshBusy || testSingleBusy || !canRunRefresh"
                @click="runModelRefresh"
              >
                {{ refreshBusy ? 'Refreshing…' : 'Run Refresh' }}
              </button>
            </div>

            <p v-if="!canRunTestSingle" class="a-copy smt-025">
              Test Single requires one target. Use source mode or select a single tenant.
            </p>

            <pre v-if="testSingleResult" class="refresh-json smt-050">{{ JSON.stringify(testSingleResult, null, 2) }}</pre>

            <p v-if="refreshError" class="directory-error smt-050">{{ refreshError }}</p>
            <p v-else-if="refreshNotice" class="a-copy smt-050">{{ refreshNotice }}</p>
          </section>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="drawer-fade">
        <div v-if="createOpen" class="drawer-overlay" @click.self="createOpen = false">
          <aside class="drawer-panel">
            <div class="drawer-header">
              <h2 class="drawer-title">{{ spec?.directory.createDialog.title || `Create ${modelLabel}` }}</h2>
              <button class="a-btn a-btn--ghost drawer-close" type="button" @click="createOpen = false">
                <AdminIcon name="close" :size="16" />
              </button>
            </div>

            <p class="a-copy smt-025">
              Create dialog generated from model spec fields.
            </p>

            <component
              :is="createDialogOverrideComponent"
              v-if="createDialogOverrideComponent"
              :model="modelParam"
              :open="createOpen"
              :title="spec?.directory.createDialog.title || `Create ${modelLabel}`"
              :submit-label="spec?.directory.createDialog.submitLabel || `Create ${modelLabel}`"
              :fields="spec?.directory.createDialog.fields || []"
              :draft="createDraft"
              :creating="creating"
              :error="createError"
              @update:open="createOpen = $event"
              @update:draft="setCreateDraft"
              @submit="createRecord"
              @cancel="createOpen = false"
            />

            <template v-else>
              <div class="drawer-form smt-050">
                <component
                  :is="resolveFieldComponent(field.component.name)"
                  v-for="field in spec?.directory.createDialog.fields || []"
                  :key="field.id"
                  :model-value="createDraft[resolveFieldKey(field)]"
                  v-bind="resolveCreateFieldProps(field)"
                  @update:model-value="setCreateValue(field, $event)"
                />
              </div>

              <div class="drawer-actions smt-075">
                <button class="a-btn a-btn--subtle" type="button" @click="createOpen = false">Cancel</button>
                <button class="a-btn a-btn--primary" type="button" :disabled="creating" @click="createRecord">
                  {{ creating ? 'Creating…' : spec?.directory.createDialog.submitLabel || `Create ${modelLabel}` }}
                </button>
              </div>
              <p v-if="createError" class="directory-error smt-050">{{ createError }}</p>
            </template>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.directory-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.directory-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.directory-card {
  display: grid;
  gap: 0.62rem;
}

.directory-controls {
  display: grid;
  gap: 0.52rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.directory-error {
  margin: 0;
  color: var(--admin-danger);
  font-size: var(--fs--075, 0.86rem);
}

.refresh-overlay {
  position: fixed;
  inset: 0;
  z-index: 1710;
  background: rgba(10, 19, 38, 0.36);
  display: grid;
  place-items: center;
  padding: 0.9rem;
}

.refresh-modal {
  width: min(44rem, 100%);
  max-height: min(92vh, 46rem);
  overflow-y: auto;
  padding: 0.9rem;
  display: grid;
  align-content: start;
  gap: 0.4rem;
}

.refresh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.refresh-chips {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.refresh-form {
  display: grid;
  gap: 0.55rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.refresh-json {
  margin: 0;
  max-height: 14rem;
  overflow: auto;
  background: var(--admin-surface-soft);
  border: 1px solid var(--admin-border);
  border-radius: 0.5rem;
  padding: 0.6rem;
  font-size: 0.75rem;
  line-height: 1.3;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1700;
  background: rgba(10, 19, 38, 0.36);
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: min(34rem, 100%);
  max-width: 100%;
  height: 100%;
  background: var(--admin-surface);
  border-left: 1px solid var(--admin-border-strong);
  padding: 0.9rem;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  overflow-y: auto;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.drawer-title {
  margin: 0;
  font-size: var(--fs-050, 1.18rem);
  letter-spacing: -0.01em;
  color: var(--admin-text);
}

.drawer-close {
  min-width: 2.5rem;
  width: 2.5rem;
  padding: 0;
}

.drawer-form {
  display: grid;
  gap: 0.6rem;
  align-content: start;
}

.drawer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 140ms ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .refresh-form {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1100px) {
  .directory-header {
    flex-direction: column;
  }

  .directory-controls {
    grid-template-columns: 1fr;
  }
}
</style>
