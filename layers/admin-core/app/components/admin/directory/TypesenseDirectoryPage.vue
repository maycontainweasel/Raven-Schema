<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useCRUD, useTypesense, useTypesenseDirectory } from '@schema'
import { dbInstances, defaultDbInstance } from '@schema/db'
import AdminCreateDialog from '../CreateDialog.vue'
import UiCombobox from '../../ui/fields/UiCombobox.vue'
import { generatedUiSpecs } from '@/config/ui-specs.generated'

type UiSpec = (typeof generatedUiSpecs)[number]

type FilterLayoutField = { key: string; class?: string; label?: string }
type FilterLayoutRow = { id: string; class?: string; fields: FilterLayoutField[] }

type TableColumn = { key: string; label: string }

type DirectoryOverrideComponent = ReturnType<typeof defineAsyncComponent> | null

type DirectoryActionHandlers = {
  view: (record: any) => void
  delete: (record: any) => void
}

const props = defineProps<{
  modelKey?: string
  spec?: UiSpec
}>()

const resolveSpec = () => {
  if (props.spec) return props.spec
  const key = props.modelKey?.toLowerCase()
  if (!key) return undefined
  return generatedUiSpecs.find((entry) => entry.model?.toLowerCase() === key)
}

const spec = computed(() => resolveSpec())
const modelKey = computed(() => spec.value?.model ?? props.modelKey ?? '')
const namespace = computed(() => spec.value?.namespace ?? modelKey.value)

const overview = computed(() => spec.value?.overview ?? {})
const dialogCreate = computed(() => spec.value?.dialogs?.create ?? {})

const toTitleCase = (value: string) => {
  return String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase())
}

const resolveTableColumns = (columns: string[] | undefined, fallbackFields: any[]): string[] => {
  if (Array.isArray(columns) && columns.length > 0) return columns
  return fallbackFields.map((field) => field.key)
}

const resolveFilterLayout = (specValue?: UiSpec): FilterLayoutRow[] => {
  const layout = specValue?.overview?.filters?.layout
  if (!Array.isArray(layout) || layout.length === 0) {
    return [
      {
        id: 'filters-row-primary',
        class: 'flex flex-wrap items-end justify-between gap-4',
        fields: [
          { key: 'search', class: 'flex-1 min-w-[240px] max-w-xl' },
          { key: 'instances', class: 'min-w-[220px]' }
        ]
      }
    ]
  }

  const normalizeField = (entry: any): FilterLayoutField | null => {
    if (typeof entry === 'string') return { key: entry }
    if (entry && typeof entry === 'object') {
      const key = entry.key ?? entry.field ?? entry.name
      if (!key) return null
      return {
        key: String(key),
        class: entry.class ? String(entry.class) : undefined,
        label: entry.label === false ? '' : entry.label ? String(entry.label) : undefined
      }
    }
    return null
  }

  return layout
    .map((row: any, index: number) => {
      const fields = Array.isArray(row?.fields) ? row.fields : []
      const normalized = fields.map(normalizeField).filter(Boolean) as FilterLayoutField[]
      const rowId = row?.id ? String(row.id) : `filters-row-${index + 1}`
      return {
        id: rowId,
        class: row?.class ? String(row.class) : undefined,
        fields: normalized
      }
    })
    .filter((row: FilterLayoutRow) => row.fields.length)
}

const resolveRequiredFields = (specValue: UiSpec | undefined, fields: any[]) => {
  const required = specValue?.dialogs?.create?.required
  if (Array.isArray(required) && required.length > 0) return required
  return fields.filter((field) => field.required).map((field) => field.key)
}

const collectionId = computed(() => {
  const explicit = overview.value?.typesense?.collection
  if (explicit) return String(explicit)
  return modelKey.value
})

const pageTitle = computed(() => overview.value?.meta?.title ?? `${toTitleCase(namespace.value)} Overview`)
const pageSubtitle = computed(
  () => overview.value?.meta?.subtitle ?? `Typesense directory for the ${toTitleCase(modelKey.value)} model.`
)

const createFields = computed(() => (dialogCreate.value?.fields ?? []) as any[])
const createDefaults = computed(() => dialogCreate.value?.defaults ?? {})
const createRequired = computed(() => resolveRequiredFields(spec.value, createFields.value))

const tableColumns = computed<TableColumn[]>(() => {
  const raw = resolveTableColumns(overview.value?.table?.columns as any, createFields.value)
  return raw.map((column) => ({ key: column, label: toTitleCase(column) }))
})

const filterLayout = computed(() => resolveFilterLayout(spec.value))

const queryBy = computed(() => overview.value?.typesense?.queryBy ?? [])
const sortableFields = computed(() => overview.value?.typesense?.sortableFields ?? [])
const filterFields = computed(() => overview.value?.typesense?.filters ?? [])

const refreshMode = computed(() => overview.value?.typesense?.refreshMode ?? 'upsert')
const actionList = computed(() => overview.value?.actions ?? [])
const allowCreate = computed(() => actionList.value.length === 0 || actionList.value.includes('create'))
const allowRefresh = computed(() => actionList.value.length === 0 || actionList.value.includes('refresh'))

const resolveDefaultSort = () => {
  const sortBy = overview.value?.typesense?.sortBy
  let field = sortableFields.value[0] ?? ''
  let direction: 'asc' | 'desc' = 'asc'
  if (sortBy && typeof sortBy === 'string') {
    const [fieldToken, dirToken] = sortBy.split(':')
    if (fieldToken) field = fieldToken
    if (dirToken && dirToken.toLowerCase() === 'desc') direction = 'desc'
  }
  return { field, direction }
}

const directory = useTypesenseDirectory({
  collection: collectionId.value,
  queryBy: queryBy.value,
  sortableFields: sortableFields.value,
  filters: filterFields.value,
  perPage: 25,
  defaultSort: resolveDefaultSort(),
  enableFacets: true,
  ensureOnConnect: true
})

watch(
  () => [collectionId.value, queryBy.value, sortableFields.value, filterFields.value],
  () => {
    directory.collection = collectionId.value
    directory.queryBy = queryBy.value
    directory.sortableFields = sortableFields.value
    directory.filters = filterFields.value
  }
)

watch(
  () => directory.error,
  (next) => {
    if (!next) return
    if (hasShownErrorDebug.value) return
    showDebug.value = true
    hasShownErrorDebug.value = true
  }
)

const { $notify } = useNuxtApp()
const router = useRouter()
const { $process, updateTypesenseForRecord, deleteTypesenseDocument, resolveRecordSubId } = useCRUD()
const typesense = useTypesense()
const runtimeConfig = useRuntimeConfig()

console.info('[generated-ui] directory', namespace.value)

const notice = ref<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
const setNotice = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  notice.value = { message, type }
  setTimeout(() => {
    notice.value = null
  }, 3000)
}

const notifyError = (message: string, error?: unknown) => {
  console.error(message, error)
  if ($notify?.error) {
    $notify.error(message)
  } else {
    setNotice(message, 'error')
  }
}

const notifySuccess = (message: string) => {
  if ($notify?.success) {
    $notify.success(message)
  } else {
    setNotice(message, 'success')
  }
}

const refreshing = ref(false)
const recreating = ref(false)
const createOpen = ref(false)
const creating = ref(false)
const showDebug = ref(false)
const hasShownErrorDebug = ref(false)

const typesenseConfig = computed(() => {
  const publicCfg = runtimeConfig.public?.typesense ?? {}
  const privateCfg = (runtimeConfig as any)?.typesense ?? {}
  return {
    host: publicCfg.host ?? privateCfg.host ?? '',
    port: publicCfg.port ?? privateCfg.port ?? '',
    apiKey: publicCfg.apiKey ?? privateCfg.apiKey ?? '',
  }
})

const maskedApiKey = computed(() => {
  const key = String(typesenseConfig.value.apiKey ?? '')
  if (!key) return ''
  if (key.length <= 8) return `${key.slice(0, 2)}…${key.slice(-2)}`
  return `${key.slice(0, 4)}…${key.slice(-4)}`
})

const buildFilterBy = () => {
  const parts: string[] = []
  const fields = Array.isArray(directory.filterFields) ? directory.filterFields : []
  for (const field of fields) {
    const selected = (directory.filterSelections as any)?.[field] ?? []
    if (!Array.isArray(selected) || !selected.length) continue
    const tick = String.fromCharCode(96)
    const escaped = selected.map((value: any) =>
      tick + String(value ?? '').replaceAll(tick, `\\${tick}`) + tick
    )
    parts.push(`${field}:=[${escaped.join(',')}]`)
  }
  return parts.join(' && ')
}

const debugPayload = computed(() => {
  const filterBy = buildFilterBy()
  const queryByList = Array.isArray(queryBy.value) ? queryBy.value : []
  const facetBy = Array.isArray(directory.filterFields) ? directory.filterFields.join(',') : ''
  const sortBy =
    directory.sortField && String(directory.sortField).trim()
      ? `${directory.sortField}:${directory.sortDirection || 'asc'}`
      : ''

  return {
    modelKey: modelKey.value,
    namespace: namespace.value,
    collection: collectionId.value,
    typesense: {
      host: typesenseConfig.value.host,
      port: typesenseConfig.value.port,
      apiKey: maskedApiKey.value,
    },
    query: {
      q: String(directory.searchQuery ?? '').trim() || '*',
      query_by: queryByList.join(','),
      per_page: directory.perPage,
      page: directory.page,
      facet_by: facetBy || undefined,
      filter_by: filterBy || undefined,
      sort_by: sortBy || undefined,
    },
    results: {
      ready: directory.ready,
      loading: directory.loading,
      error: directory.error || undefined,
      total: directory.total,
      count: directory.results.length,
    },
  }
})

onMounted(() => {
  try {
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('debug')
    if (flag === '1' || flag === 'true' || flag === 'yes') {
      showDebug.value = true
    }
  } catch {}
})

const buildCreateForm = () => {
  const defaults = createDefaults.value as Record<string, any>
  const form: Record<string, any> = {}
  createFields.value.forEach((field) => {
    const isMulti = field.key === 'instances' || field.type === 'instances' || field.multiple
    form[field.key] = defaults[field.key] ?? (isMulti ? [] : '')
  })
  return form
}

const createForm = ref<Record<string, any>>(buildCreateForm())

watch(
  () => createFields.value,
  () => {
    createForm.value = buildCreateForm()
  }
)

const resolveDefaultInstance = () => {
  const entries = Object.entries(dbInstances as Record<string, any>)
  const rootEntry = entries.find(([, cfg]) => cfg?.root === true && cfg?.active === true)
  if (rootEntry) return rootEntry[0]
  if (defaultDbInstance && (dbInstances as Record<string, any>)[defaultDbInstance]?.active === true) {
    return defaultDbInstance
  }
  const activeEntry = entries.find(([, cfg]) => cfg?.active === true)
  if (activeEntry) return activeEntry[0]
  return defaultDbInstance ?? 'pm'
}

const defaultInstance = resolveDefaultInstance()

const instanceOptions = computed(() =>
  Object.keys(dbInstances as Record<string, any>).map((key) => ({
    value: key,
    label: String(key).toUpperCase()
  }))
)

const filterLayoutRows = computed(() => {
  return (filterLayout.value as any[])
    .map((row: any, index: number) => {
      const fields = Array.isArray(row?.fields) ? row.fields : []
      const activeFields = fields.filter((field: any) => {
        const key = field?.key
        if (!key) return false
        if (key === 'search') return true
        return directory.filterFields.includes(key)
      })
      const rowId = row?.id ? String(row.id) : `filters-row-${index + 1}`
      return {
        id: rowId,
        class: row?.class,
        fields: activeFields
      }
    })
    .filter((row: any) => row.fields.length)
})

const filterLayoutKeys = computed(() =>
  filterLayoutRows.value.flatMap((row: any) => row.fields.map((field: any) => field.key))
)

const remainingFilterFields = computed(() =>
  directory.filterFields.filter((field) => !filterLayoutKeys.value.includes(field))
)

const directoryOverrides = import.meta.glob('@/components/models/**/overrides/directory/**/*.vue')
const resolveOverride = (suffixes: string | string[]): DirectoryOverrideComponent => {
  const list = Array.isArray(suffixes) ? suffixes : [suffixes]
  const match = Object.keys(directoryOverrides).find((key) => list.some((suffix) => key.endsWith(suffix)))
  if (!match) return null
  return defineAsyncComponent(directoryOverrides[match] as any)
}

const resolveDirectoryCellOverride = (columnKey: string) => {
  if (!modelKey.value || !columnKey) return null
  return resolveOverride(`models/${modelKey.value}/overrides/directory/${columnKey}.vue`)
}

const resolveDirectoryPartOverride = (part: string) => {
  if (!modelKey.value || !part) return null
  return resolveOverride([
    `models/${modelKey.value}/overrides/directory/_${part}.vue`,
    `models/${modelKey.value}/overrides/directory/${part}.vue`
  ])
}

const directoryCellComponents = computed(() => {
  const map: Record<string, any> = {}
  tableColumns.value.forEach((column) => {
    map[column.key] = resolveDirectoryCellOverride(column.key)
  })
  return map
})

const directoryPartOverrides = computed(() => ({
  header: resolveDirectoryPartOverride('header'),
  filters: resolveDirectoryPartOverride('filters'),
  summary: resolveDirectoryPartOverride('summary'),
  table: resolveDirectoryPartOverride('table'),
  empty: resolveDirectoryPartOverride('empty'),
  pagination: resolveDirectoryPartOverride('pagination'),
  rowActions: resolveDirectoryPartOverride('row-actions')
}))

const resolveTokenValue = (source: any, path: string) => {
  return path.split('.').reduce((acc: any, key: string) => (acc ? acc[key] : undefined), source)
}

const routeTemplate = computed(() => spec.value?.route?.single ?? '')
const routeBase = computed(() => spec.value?.route?.base ?? `/${namespace.value}`)
const routeToken = computed(() => {
  const match = routeTemplate.value.match(/<([^>]+)>/)
  return match?.[1] ?? 'id'
})

const resolveRedirectValue = (record: any, payload: any) => {
  if (routeToken.value === 'id' || routeToken.value === 'id.id') {
    return (
      resolveRecordSubId(record) ??
      resolveRecordSubId(payload) ??
      resolveTokenValue(record, routeToken.value) ??
      resolveTokenValue(payload, routeToken.value)
    )
  }
  return resolveTokenValue(record, routeToken.value) ?? resolveTokenValue(payload, routeToken.value) ?? resolveRecordSubId(record)
}

const resolveDeleteId = (record: any) => {
  if (routeToken.value === 'id' || routeToken.value === 'id.id') {
    return resolveRecordSubId(record) ?? resolveTokenValue(record, routeToken.value)
  }
  return resolveTokenValue(record, routeToken.value) ?? resolveRecordSubId(record)
}

const fetchRecords = async () => {
  try {
    await directory.search()
    if (directory.error) {
      notifyError(`Failed to load ${toTitleCase(modelKey.value)} from Typesense`, directory.error)
    }
  } catch (error) {
    notifyError(`Failed to load ${toTitleCase(modelKey.value)} from Typesense`, error)
  }
}

const handleSearch = () => {
  directory.page = 1
  fetchRecords()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
const scheduleSearch = (immediate = false) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, immediate ? 0 : 300)
}

const handleRefresh = async () => {
  if (!allowRefresh.value) return
  refreshing.value = true
  try {
    const result = await $process({
      endpoint: `${modelKey.value}.typesense.refresh`,
      method: 'query',
      data: { limit: -1, start: -1 }
    })

    const records = Array.isArray(result)
      ? result
      : Array.isArray((result as any)?.result)
        ? (result as any).result
        : []

    if (refreshMode.value === 'clear') {
      await typesense.clearCollection(collectionId.value)
    }

    if (records.length) {
      await typesense.upsertDocuments(collectionId.value, records, 'upsert')
      notifySuccess(`${toTitleCase(modelKey.value)} Typesense refreshed`)
    } else {
      setNotice('No records to refresh', 'info')
    }

    await fetchRecords()
  } catch (error) {
    notifyError(`Failed to refresh ${toTitleCase(modelKey.value)} Typesense`, error)
  } finally {
    refreshing.value = false
  }
}

const handleRecreateCollection = async () => {
  if (recreating.value) return
  recreating.value = true
  try {
    await typesense.clearCollection(collectionId.value)
    await fetchRecords()
    notifySuccess(`${toTitleCase(modelKey.value)} collection recreated`)
  } catch (error) {
    notifyError(`Failed to recreate ${toTitleCase(modelKey.value)} collection`, error)
  } finally {
    recreating.value = false
  }
}

const handleCreate = async () => {
  const isEmptyValue = (value: any) => {
    if (value === '' || value === null || value === undefined) return true
    if (Array.isArray(value)) return value.length === 0
    return false
  }

  const missing = createRequired.value.filter((key) => {
    const value = (createForm.value as any)[key]
    if (!isEmptyValue(value)) return false
    const fallback = (createDefaults.value as any)?.[key]
    return isEmptyValue(fallback)
  })

  if (missing.length) {
    setNotice(`Please provide ${missing.join(', ')}`, 'error')
    return
  }

  creating.value = true
  try {
    const payload: Record<string, any> = { ...createDefaults.value }

    createFields.value.forEach((field) => {
      const rawValue = (createForm.value as any)[field.key]
      if (isEmptyValue(rawValue)) return
      if (field.type === 'number') {
        const parsed = Number(rawValue)
        payload[field.key] = Number.isNaN(parsed) ? rawValue : parsed
      } else {
        payload[field.key] = rawValue
      }
    })

    if (Array.isArray(payload.instances)) {
      payload.instances = payload.instances.map((value: any) =>
        value === '$rootInstance' || value === '<rootInstance>' ? defaultInstance : value
      )
    }

    if (import.meta.dev) {
      console.info(`[CRUD] ${modelKey.value}.create payload`, payload)
    }

    const instanceTargets = Array.isArray(payload.instances) && payload.instances.length ? payload.instances : undefined
    const record = instanceTargets
      ? await $process(`${modelKey.value}.create`, payload, { instances: instanceTargets })
      : await $process(`${modelKey.value}.create`, payload)

    if (record) {
      try {
        await updateTypesenseForRecord({
          collectionId: collectionId.value,
          record
        })
      } catch (error) {
        console.warn('Typesense update failed after create', error)
      }
    }

    notifySuccess(`${toTitleCase(modelKey.value)} created`)
    createOpen.value = false
    createForm.value = buildCreateForm()
    await fetchRecords()

    const redirectId = resolveRedirectValue(record, payload)
    if (redirectId) {
      router.push(`${routeBase.value}/${redirectId}`)
    }
  } catch (error) {
    notifyError(`There was an error creating the ${toTitleCase(modelKey.value)}`, error)
  } finally {
    creating.value = false
  }
}

const handleDelete = async (item: any) => {
  const id = resolveDeleteId(item)
  if (!id) return

  const confirmed = confirm(`Delete ${toTitleCase(modelKey.value)} ${id}? This cannot be undone.`)
  if (!confirmed) return

  try {
    await $process(`${modelKey.value}.delete`, { id })
    try {
      await deleteTypesenseDocument(collectionId.value, String(id))
    } catch (error) {
      console.warn('Typesense delete failed', error)
    }
    notifySuccess(`${toTitleCase(modelKey.value)} deleted`)
    await fetchRecords()
  } catch (error) {
    notifyError(`There was an error deleting the ${toTitleCase(modelKey.value)}`, error)
  }
}

const handleView = (item: any) => {
  const id = resolveDeleteId(item)
  if (id) router.push(`${routeBase.value}/${id}`)
}

const actionHandlers: DirectoryActionHandlers = {
  view: handleView,
  delete: handleDelete
}

const goToNextPage = () => {
  if (directory.page * directory.perPage < directory.total) {
    directory.page++
    fetchRecords()
  }
}

const goToPreviousPage = () => {
  if (directory.page > 1) {
    directory.page--
    fetchRecords()
  }
}

onMounted(() => {
  directory.connect()
})

watch(
  () => directory.searchQuery,
  () => {
    scheduleSearch()
  }
)

watch(
  () => [directory.sortField, directory.sortDirection],
  () => {
    scheduleSearch()
  }
)

watch(
  () => directory.filterSelections,
  () => {
    scheduleSearch()
  },
  { deep: true }
)
</script>

<template>
  <div v-if="!spec" class="card">
    <div class="card-body">
      <p class="text-muted">Directory spec not found.</p>
    </div>
  </div>
  <div v-else class="space-y-6">
    <component
      v-if="directoryPartOverrides.header"
      :is="directoryPartOverrides.header"
      :spec="spec"
      :model-key="modelKey"
      :namespace="namespace"
      :directory="directory"
      :actions="actionHandlers"
    />
    <div v-else class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ pageTitle }}</h1>
        <p class="text-sm text-muted">{{ pageSubtitle }}</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-ghost btn-sm" @click="showDebug = !showDebug">
          {{ showDebug ? 'Hide Debug' : 'Debug' }}
        </button>
        <button v-if="allowCreate" class="btn btn-primary btn-sm" @click="createOpen = true">
          Create {{ toTitleCase(modelKey) }}
        </button>
        <button
          v-if="allowRefresh"
          class="btn btn-outline btn-sm"
          :disabled="refreshing"
          @click="handleRefresh"
        >
          {{ refreshing ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </div>

    <div
      v-if="notice"
      class="alert"
      :class="notice.type === 'success' ? 'alert-success' : notice.type === 'error' ? 'alert-error' : 'alert-info'"
    >
      <span>{{ notice.message }}</span>
    </div>

    <component
      v-if="directoryPartOverrides.filters"
      :is="directoryPartOverrides.filters"
      :spec="spec"
      :model-key="modelKey"
      :directory="directory"
      :filter-layout="filterLayoutRows"
      :remaining-filters="remainingFilterFields"
      :instance-options="instanceOptions"
      @search="scheduleSearch"
    />
    <div v-else class="card">
      <div class="card-body space-y-4">
        <div
          v-for="row in filterLayoutRows"
          :key="row.id"
          :class="row.class ?? 'flex flex-wrap items-end justify-between gap-4'"
        >
          <div
            v-for="field in row.fields"
            :key="field.key"
            :class="field.class ?? (field.key === 'search' ? 'flex-1 min-w-[240px] max-w-xl' : 'min-w-[220px]')"
          >
            <template v-if="field.key === 'search'">
              <div class="flex items-center gap-2">
                <span v-if="field.label !== ''" class="text-xs text-muted">{{ field.label ?? 'search' }}</span>
                <input
                  v-model="directory.searchQuery"
                  type="text"
                  class="input input-sm w-full"
                  :placeholder="`Search ${toTitleCase(modelKey)}...`"
                  @input="scheduleSearch()"
                  @blur="handleSearch"
                />
              </div>
            </template>
            <template v-else>
              <label v-if="field.label !== ''" class="text-xs uppercase tracking-wide text-muted">
                {{ field.label ?? field.key }}
              </label>
              <UiCombobox
                v-if="field.key === 'instances'"
                v-model="directory.filterSelections[field.key]"
                :options="instanceOptions"
                multiple
                placeholder="Select instances"
              />
              <UiCombobox
                v-else
                v-model="directory.filterSelections[field.key]"
                :options="(directory.filterOptions[field.key] || []).map((option: any) => ({
                  value: option.value,
                  label: option.count != null ? `${option.value} (${option.count})` : String(option.value)
                }))"
                multiple
                :placeholder="`Select ${field.label ?? field.key}`"
              />
            </template>
          </div>
        </div>
        <div v-if="remainingFilterFields.length" class="flex flex-wrap gap-3">
          <div v-for="field in remainingFilterFields" :key="field" class="min-w-[220px]">
            <label class="text-xs uppercase tracking-wide text-muted">{{ field }}</label>
            <UiCombobox
              v-model="directory.filterSelections[field]"
              :options="(directory.filterOptions[field] || []).map((option: any) => ({
                value: option.value,
                label: option.count != null ? `${option.value} (${option.count})` : String(option.value)
              }))"
              multiple
              :placeholder="`Select ${field}`"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDebug" class="card">
      <div class="card-body space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Typesense Debug</h3>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-xs btn-outline"
              :disabled="recreating"
              @click="handleRecreateCollection"
            >
              {{ recreating ? 'Recreating...' : 'Recreate Collection' }}
            </button>
            <button class="btn btn-xs btn-ghost" @click="showDebug = false">Close</button>
          </div>
        </div>
        <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(debugPayload, null, 2) }}</pre>
      </div>
    </div>

    <component
      v-if="directoryPartOverrides.summary"
      :is="directoryPartOverrides.summary"
      :spec="spec"
      :model-key="modelKey"
      :directory="directory"
      :sortable-fields="sortableFields"
      @previous="goToPreviousPage"
      @next="goToNextPage"
    />
    <div v-else class="space-y-3">
      <div class="flex items-center justify-between text-sm text-muted">
        <span>Showing {{ directory.results.length }} of {{ directory.total }} results</span>
        <div class="flex items-center gap-2">
          <div v-if="sortableFields.length" class="flex items-center gap-2">
            <select v-model="directory.sortField" class="select select-sm">
              <option value="">Sort by</option>
              <option v-for="field in sortableFields" :key="field" :value="field">
                {{ field }}
              </option>
            </select>
            <select v-model="directory.sortDirection" class="select select-sm">
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
          </div>
          <button class="btn btn-xs" :disabled="directory.page === 1" @click="goToPreviousPage">Prev</button>
          <span>Page {{ directory.page }}</span>
          <button
            class="btn btn-xs"
            :disabled="directory.page * directory.perPage >= directory.total"
            @click="goToNextPage"
          >
            Next
          </button>
        </div>
      </div>

      <component
        v-if="directoryPartOverrides.empty && directory.results.length === 0"
        :is="directoryPartOverrides.empty"
        :spec="spec"
        :model-key="modelKey"
        :directory="directory"
      />
      <div v-else-if="directory.results.length === 0" class="card">
        <div class="card-body">
          <p class="text-muted">No {{ namespace }} found. Try a different search term.</p>
        </div>
      </div>

      <component
        v-if="directoryPartOverrides.table && directory.results.length"
        :is="directoryPartOverrides.table"
        :spec="spec"
        :model-key="modelKey"
        :directory="directory"
        :columns="tableColumns"
        :actions="actionHandlers"
      />
      <div v-else-if="directory.results.length" class="card">
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th v-for="column in tableColumns" :key="column.key">{{ column.label }}</th>
                <th style="width: 160px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in directory.results" :key="item.id">
                <td v-for="column in tableColumns" :key="column.key" class="text-muted">
                  <component
                    v-if="directoryCellComponents[column.key]"
                    :is="directoryCellComponents[column.key]"
                    :value="item[column.key]"
                    :record="item"
                    :column="column.key"
                  />
                  <template v-else>
                    {{ item[column.key] ?? '—' }}
                  </template>
                </td>
                <td>
                  <component
                    v-if="directoryPartOverrides.rowActions"
                    :is="directoryPartOverrides.rowActions"
                    :record="item"
                    :actions="actionHandlers"
                  />
                  <div v-else class="flex items-center gap-2">
                    <button class="btn btn-outline btn-xs" @click="handleView(item)">View</button>
                    <button class="btn btn-ghost btn-xs text-error" @click="handleDelete(item)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <component
      v-if="directoryPartOverrides.pagination"
      :is="directoryPartOverrides.pagination"
      :spec="spec"
      :model-key="modelKey"
      :directory="directory"
      @previous="goToPreviousPage"
      @next="goToNextPage"
    />

    <AdminCreateDialog
      v-if="allowCreate"
      :model="modelKey"
      v-model:open="createOpen"
      v-model:form="createForm"
      :title="`Create ${toTitleCase(modelKey)}`"
      :subtitle="`Provide the required fields to create a new ${modelKey}.`"
      :fields="createFields"
      :loading="creating"
      submit-label="Create"
      @submit="handleCreate"
    />
  </div>
</template>
