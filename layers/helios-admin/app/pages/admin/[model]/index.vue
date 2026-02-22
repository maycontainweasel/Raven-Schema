<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
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

const route = useRoute()
const router = useRouter()
const { $process } = useCRUD()

const modelParam = computed(() => {
  const fromParams = String(route.params.model ?? '').trim().toLowerCase()
  if (fromParams) return fromParams

  const fromMeta = String((route.meta as any)?.modelKey ?? '').trim().toLowerCase()
  return fromMeta
})
const search = ref('')
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const createDraft = ref<Record<string, any>>({})
const filterState = ref<Record<string, string | string[]>>({})
const createDialogOverrideModules = import.meta.glob('@/components/admin/overrides/**/CreateDialog.vue')
const createRecordOverrideModules = import.meta.glob('@/components/admin/overrides/**/createRecord.{ts,js,mjs}')

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
    dataLocation: 'local',
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
    await router.push(`/admin/${modelParam.value}/${encodeURIComponent(syncResponse.slug)}`)
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

const toRecordRoute = (row: DirectoryRecord) => {
  const rid = String(row.rid ?? '').trim()
  if (!rid) return `/admin/${modelParam.value}`
  return `/admin/${modelParam.value}/${encodeURIComponent(rid)}`
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
        <span class="a-chip">
          {{ `Source: ${String(directoryData?.runtime?.source || 'unknown')}` }}
        </span>
        <span
          class="a-chip"
          :class="spec?.directory.typesense.enabled ? 'a-chip--success' : 'a-chip--warning'"
        >
          {{ spec?.directory.typesense.enabled ? 'Typesense Ready' : 'Typesense Missing' }}
        </span>
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
                <template v-if="column.key.toLowerCase().includes('status')">
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

@media (max-width: 1100px) {
  .directory-header {
    flex-direction: column;
  }

  .directory-controls {
    grid-template-columns: 1fr;
  }
}
</style>
