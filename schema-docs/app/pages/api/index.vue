<script setup lang="ts">
import ApiConsolePanel from '~/components/api/ApiConsolePanel.vue'
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/vue'
import { useCRUD, useTypesense } from '@schema'
import * as SchemaTypes from '~/types/schema/generated'
import docsManifest from '~/data/docs-manifest.json'
import routerManifest from '~/data/router-manifest.json'
import { InstanceCode_z } from '@schema'
import { useSchemaSpec } from '~/composables/demo/useSchemaSpec'

const { $api } = useNuxtApp()
const { $process, $processResult } = useCRUD()
let typesense: ReturnType<typeof useTypesense> | null = null
if (process.client) {
  try {
    typesense = useTypesense()
  } catch (error) {
    console.warn('[schema-docs] Typesense not available', error)
    typesense = null
  }
}

type DocsField = {
  key: string
  type: string
  rawType?: string
  format?: string
  isId?: boolean
  assign?: boolean
  ignorePayload?: boolean
  required: boolean
  nullable?: boolean
  default?: unknown
  description?: string
  items?: DocsField
  fields?: DocsField[]
}

type DocsTable = {
  key: string
  name: string
  model: string
  description?: string
  data: 'local' | 'remote'
  fields: DocsField[]
  capabilities: {
    router: boolean
    crud: { create: boolean; update: boolean; delete: boolean }
    typesense: boolean
    taxonomies: string[]
    edges: boolean
    relations: boolean
    subtables: boolean
  }
  taxonomies?: Array<{
    key: string
    cardinality?: 'one' | 'many'
    payloadField?: string
    labels?: { singular?: string; plural?: string }
    taxonomy?: { fields?: DocsField[] }
    term?: { fields?: DocsField[] }
  }>
  taxonomies?: Array<{
    key: string
    hierarchical?: boolean
    cardinality?: 'one' | 'many'
    storeOnModel?: boolean
    required?: boolean
    processor?: 'functions' | 'events' | 'none'
    payloadField?: string
    labels?: { singular?: string; plural?: string }
    taxonomy?: { model?: string; fields?: DocsField[] }
    term?: { model?: string; fields?: DocsField[] }
  }>
  subTables?: Array<{
    key: string
    name?: string
    model?: string
    tableType?: 'subsingle' | 'submany'
    description?: string
    fields?: DocsField[]
  }>
  docs: {
    types: string
  }
  id?: {
    type?: string
    structure?: string | string[]
    source?: string | string[]
    exportName?: string
    exportType?: boolean
    exportZodName?: string
  }
}

type DocsManifest = {
  generatedAt: string
  source: string
  instances: {
    default: string
    active: string[]
    all: string[]
  }
  tables: Record<string, DocsTable>
}

type ManifestEndpoint = {
  path: string
  name: string
  method: 'query' | 'mutation'
  input?: { wrapper?: string; schema?: string; raw?: string } | null
  fields?: Record<string, any> | null
  router: string
  file: string
  subtableKey?: string
}

type RouterManifest = {
  models: Record<string, { endpoints: ManifestEndpoint[] }>
}

type ProcessGroup = {
  id: string
  label: string
  description: string
  enabled: boolean
  processes: ManifestEndpoint[]
}

type ConsoleEntry = {
  id: string
  time: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  detail?: unknown
}

const docs = docsManifest as DocsManifest
const routers = routerManifest as RouterManifest
const runtimeTypes = SchemaTypes as Record<string, any>
const instanceState = {
  ...docs.instances,
  all: docs.instances.active.length ? docs.instances.active : docs.instances.all,
}
const logInit = (label: string) => {
  console.info(`[schema-docs/api] ${label}`, {
    instances: instanceState,
    tableCount: Object.keys(docs.tables || {}).length,
    tables: Object.keys(docs.tables || {}),
    routerModelCount: Object.keys(routers.models || {}).length,
  })
}
if (process.server) {
  logInit('init (server)')
}
if (process.client) {
  logInit('init (client)')
}

const modelKeys = Object.keys(docs.tables).sort((a, b) => a.localeCompare(b))
const selectedModelId = ref(modelKeys[0] || '')
const { data: schemaSpec } = useSchemaSpec(selectedModelId)
const selectedInstanceIds = ref<string[]>([])
const resolveDefaultInstance = () => {
  const preferred = 'pm'
  if (instanceState.all.includes(preferred)) return preferred
  if (instanceState.active.includes(preferred)) return preferred
  return instanceState.active[0] || docs.instances.default || preferred
}
const initialInstance = resolveDefaultInstance()
if (initialInstance) {
  selectedInstanceIds.value = [initialInstance]
}
const relatedLeftModelId = ref('')
const relatedRightModelId = ref('')
const storageMode = ref('local')
const runMode = ref('write')

const autoClearConsole = ref(false)
const autoScrollConsole = ref(true)
const showFullResponse = ref(false)
const consoleMode = ref<'console' | 'code'>('console')
const consoleFontSize = ref(13)

const increaseConsoleFont = () => {
  consoleFontSize.value = Math.min(consoleFontSize.value + 1, 18)
}

const decreaseConsoleFont = () => {
  consoleFontSize.value = Math.max(consoleFontSize.value - 1, 11)
}
const codeSelection = ref('all')
const includeRouterInCode = ref(false)
const includeDefaultsInCode = ref(true)
const includeInstancesInCode = ref(false)
const explicitSettingsInCode = ref(false)
const includeAllSettingsInCode = ref(false)

const processForms = reactive<Record<string, Record<string, any>>>({})
const globalState = reactive({
  recordId: '',
  leftEdgeCount: 0,
  rightEdgeCount: 0,
  taxonomyScope: '',
  note: '',
})
const consoleLogs = ref<ConsoleEntry[]>([])
let logCounter = 0

const groupMode = ref<'assets' | 'utility'>('assets')
const activeGroupId = ref('')
const activeSubtableKey = ref('')
const subtableMenuOpen = ref(true)
const headerExpanded = ref(false)
const globalStateOpen = ref(true)

const typesenseMeta = reactive({
  key: '',
  name: '',
  localSchema: null as null | Record<string, any>,
  remoteCollection: null as null | Record<string, any>,
  exists: null as null | boolean,
  error: '' as string,
})

const typesenseFetch = reactive({
  id: '',
})

const typesenseStatus = computed(() => {
  if (typesenseMeta.error) return { label: 'Unavailable', tone: 'warning' }
  if (typesenseMeta.exists === true) return { label: 'Collection exists', tone: 'success' }
  if (typesenseMeta.exists === false) return { label: 'Collection missing', tone: 'warning' }
  return { label: 'Unknown', tone: 'muted' }
})

const instanceOptions = computed(() => {
  const active = instanceState.active.length ? instanceState.active : InstanceCode_z.options
  return active.map((code) => ({ label: code.toUpperCase(), value: code }))
})
const instanceQuery = ref('')
const filteredInstanceOptions = computed(() => {
  const query = instanceQuery.value.trim().toLowerCase()
  if (!query) return instanceOptions.value
  return instanceOptions.value.filter((option) => option.label.toLowerCase().includes(query))
})
const instanceLabelMap = computed(() => {
  const map = new Map<string, string>()
  instanceOptions.value.forEach((option) => {
    map.set(option.value, option.label)
  })
  return map
})
const instanceFieldQuery = reactive<Record<string, string>>({})
const getInstanceQueryKey = (endpoint: ManifestEndpoint, field: DocsField) =>
  `${endpoint.path}:${field.key}`
const getInstanceQuery = (endpoint: ManifestEndpoint, field: DocsField) =>
  instanceFieldQuery[getInstanceQueryKey(endpoint, field)] ?? ''
const setInstanceQuery = (endpoint: ManifestEndpoint, field: DocsField, value: string) => {
  instanceFieldQuery[getInstanceQueryKey(endpoint, field)] = value
}
const filteredInstanceOptionsFor = (query: string) => {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return instanceOptions.value
  return instanceOptions.value.filter((option) => option.label.toLowerCase().includes(normalized))
}
const removeInstance = (value: string) => {
  selectedInstanceIds.value = selectedInstanceIds.value.filter((item) => item !== value)
}

watch(selectedInstanceIds, () => {
  instanceQuery.value = ''
})

const toTitle = (value: string) =>
  value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const toReadableLabel = (value: string) =>
  toTitle(value.replace(/([a-z0-9])([A-Z])/g, '$1 $2'))

const toPascalCase = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?:^|\s)(\w)/g, (_, char: string) => char.toUpperCase())
    .replace(/\s+/g, '')

const selectedTable = computed(() => docs.tables[selectedModelId.value])

const mapSchemaFieldToDocsField = (field: any): DocsField => ({
  key: field.key,
  type: field.type ?? 'string',
  rawType: field.typeRaw,
  required: Boolean(field.required),
  isId: field.isId,
})

const subtableSpecByKey = computed(() => {
  const entries = schemaSpec.value?.subTables ?? []
  const map = new Map<string, (typeof entries)[number]>()
  entries.forEach((entry) => {
    if (entry.routerName) {
      map.set(entry.routerName, entry)
    }
    if (entry.model) {
      map.set(entry.model, entry)
    }
  })
  return map
})
const tableTypeBase = computed(() => {
  const name = selectedTable.value?.name || selectedModelId.value
  return toPascalCase(name || '')
})
const relationshipLabel = computed(() => selectedTable.value?.data ?? 'local')
const bypassMothership = computed(() => selectedTable.value?.data === 'remote')

const routerEndpoints = computed(() => {
  if (!selectedTable.value?.capabilities.router) return []
  return routers.models?.[selectedModelId.value]?.endpoints ?? []
})

const taxonomyOps = new Set([
  'createTaxonomy',
  'addTerm',
  'removeTerm',
  'attach',
  'detach',
  'getTerms',
  'getRecordTerms',
])

const crudOps = new Set(['create', 'update', 'delete'])
const subtableOps = new Set(['create', 'update', 'delete', 'get', 'list'])
const resourceOps = new Set(['resource', 'list', 'count', 'integrity', 'fetch', 'get'])
const isCrudEndpoint = (endpoint: ManifestEndpoint) =>
  crudOps.has(endpoint.name) &&
  endpoint.path.split('.').length === 2 &&
  endpoint.path.startsWith(`${selectedModelId.value}.`)
const isTaxonomyEndpoint = (endpoint: ManifestEndpoint) => taxonomyOps.has(endpoint.name)
const taxonomyKeyForEndpoint = (endpoint: ManifestEndpoint) => {
  const parts = endpoint.path.split('.')
  return parts.length > 2 ? parts[1] : ''
}

const subtableMetaByKey = computed(() => {
  const entries = selectedTable.value?.subTables ?? []
  const map = new Map<string, (typeof entries)[number]>()
  entries.forEach((entry) => {
    const spec = subtableSpecByKey.value.get(entry.key)
    const fields = entry.fields?.length
      ? entry.fields
      : spec?.fields?.length
        ? spec.fields.map(mapSchemaFieldToDocsField)
        : []
    map.set(entry.key, {
      ...entry,
      name: entry.name ?? spec?.label ?? entry.model ?? entry.key,
      model: entry.model ?? spec?.model,
      tableType: entry.tableType ?? (spec?.tableType as DocsTable['subTables'][number]['tableType']),
      fields,
    })
  })
  return map
})

const subtableEndpoints = computed<ManifestEndpoint[]>(() => {
  const entries = selectedTable.value?.subTables ?? []
  const endpoints: ManifestEndpoint[] = []
  entries.forEach((entry) => {
    const key = entry.key
    const modelEndpoints = routers.models?.[key]?.endpoints ?? []
    modelEndpoints.forEach((endpoint) => {
      endpoints.push({ ...endpoint, subtableKey: key })
    })
  })
  return endpoints
})

const subtableGroups = computed(() => {
  const groups = new Map<string, ManifestEndpoint[]>()
  subtableEndpoints.value
    .filter((endpoint) => subtableOps.has(endpoint.name))
    .forEach((endpoint) => {
    const key = endpoint.subtableKey ?? endpoint.path.split('.')[0]
    const list = groups.get(key) ?? []
    list.push(endpoint)
    groups.set(key, list)
  })
  return Array.from(groups.entries()).map(([key, processes]) => ({
    key,
    meta: subtableMetaByKey.value.get(key),
    processes,
  }))
})

const formatSubtableType = (tableType?: string) =>
  tableType === 'submany' ? 'many' : 'single'

const formatSubtableLabel = (meta: DocsTable['subTables'][number] | undefined, key: string) => {
  const name = meta?.name ?? meta?.model ?? key
  const label = toReadableLabel(name)
  const typeLabel = formatSubtableType(meta?.tableType)
  return `${label} (${typeLabel})`
}

const subtableMetaForEndpoint = (endpoint: ManifestEndpoint) => {
  const key = endpoint.subtableKey ?? endpoint.path.split('.')[0]
  return subtableMetaByKey.value.get(key)
}

const subtableFieldsForEndpoint = (endpoint: ManifestEndpoint) => {
  const meta = subtableMetaForEndpoint(endpoint)
  if (meta?.fields?.length) return meta.fields
  const key = endpoint.subtableKey ?? endpoint.path.split('.')[0]
  const spec = subtableSpecByKey.value.get(key)
  if (spec?.fields?.length) return spec.fields.map(mapSchemaFieldToDocsField)
  return []
}

const isSubtableCrudEndpoint = (endpoint: ManifestEndpoint) =>
  crudOps.has(endpoint.name) && Boolean(subtableMetaForEndpoint(endpoint))

const isCrudLikeEndpoint = (endpoint: ManifestEndpoint) =>
  isCrudEndpoint(endpoint) || isSubtableCrudEndpoint(endpoint)

const isResourceEndpoint = (endpoint: ManifestEndpoint) =>
  endpoint.name === 'resource' && !endpoint.path.includes('.typesense.')

const mapManifestField = (field: any): DocsField => ({
  key: field.key,
  type: field.type ?? 'string',
  required: Boolean(field.required),
  format: field.format,
  fields: field.fields ? Object.values(field.fields).map(mapManifestField) : undefined,
})

const taxonomyFieldKeys = computed(() => {
  const explicit = selectedTable.value?.taxonomies ?? []
  if (explicit.length) {
    return explicit
      .map((tax) => {
        if (tax.payloadField) return tax.payloadField
        if (tax.cardinality === 'one') return tax.key
        return tax.key.endsWith('s') ? tax.key : `${tax.key}s`
      })
      .filter(Boolean)
  }
  const keys = selectedTable.value?.capabilities.taxonomies ?? []
  return keys.map((key) => (key.endsWith('s') ? key : `${key}s`))
})

const isTaxonomyField = (field: DocsField) => {
  const raw = String(field.rawType ?? '')
  const type = String(field.type ?? '')
  return raw.includes('record<term') || type.includes('record<term')
}

const filterPayloadFields = (fields: DocsField[]) => {
  const taxonomyKeys = new Set(taxonomyFieldKeys.value)
  return fields.filter(
    (field) =>
      !(
        field.isId ||
        field.key === 'id' ||
        field.ignorePayload ||
        taxonomyKeys.has(field.key) ||
        isTaxonomyField(field)
      )
  )
}

const resolveSubtablePayloadFields = (endpoint: ManifestEndpoint) => {
  const metaFields = subtableFieldsForEndpoint(endpoint)
  if (metaFields.length) return filterPayloadFields(metaFields)

  if (endpoint.name === 'update') {
    const payloadFields = endpoint.fields?.payload?.fields
      ? Object.values(endpoint.fields.payload.fields).map(mapManifestField)
      : []
    if (payloadFields.length) return payloadFields
  }

  const fields = endpoint.fields ? Object.values(endpoint.fields) : []
  const mapped = fields.map(mapManifestField)
  return filterPayloadFields(mapped)
}

const payloadFieldsForEndpoint = (endpoint: ManifestEndpoint) => {
  if (isSubtableCrudEndpoint(endpoint)) return resolveSubtablePayloadFields(endpoint)
  if (isCrudEndpoint(endpoint)) return crudInputFields.value
  if (isResourceEndpoint(endpoint)) {
    return [
      { key: 'id', type: 'string', required: true },
      { key: 'resourceKey', type: 'string', required: true },
    ] as DocsField[]
  }
  const fields = endpoint.fields ? Object.values(endpoint.fields) : []
  return fields.map(mapManifestField)
}

const activeTaxonomyMeta = computed(() => {
  const table = selectedTable.value
  if (!table?.taxonomies?.length) return null
  const key = activeGroup.value?.id?.startsWith('taxonomy-')
    ? activeGroup.value.id.replace('taxonomy-', '')
    : ''
  return table.taxonomies.find((tax) => tax.key === key) ?? null
})

const taxonomyMetaForEndpoint = (endpoint: ManifestEndpoint) => {
  const key = taxonomyKeyForEndpoint(endpoint)
  return selectedTable.value?.taxonomies?.find((tax) => tax.key === key) ?? null
}

const taxonomyTermTableFor = (taxonomyKey: string) => {
  const model = selectedTable.value?.model
  if (!model || !taxonomyKey) return ''
  return `t_${model}_${taxonomyKey}`
}

const taxonomyFieldsForEndpoint = (endpoint: ManifestEndpoint) => {
  const meta = taxonomyMetaForEndpoint(endpoint)
  if (!meta) return []
  if (endpoint.name === 'createTaxonomy') {
    return (meta.taxonomy?.fields ?? []).map(mapManifestField).map((field) => ({
      ...field,
      required: field.required || ['key', 'label'].includes(field.key),
    }))
  }
  if (endpoint.name === 'addTerm') {
    return (meta.term?.fields ?? []).map(mapManifestField).map((field) => ({
      ...field,
      required: field.required || field.key === 'label',
    }))
  }
  return []
}

const crudInputFields = computed<DocsField[]>(() => {
  const fields = selectedTable.value?.fields ?? []
  return filterPayloadFields(fields)
})

const crudEndpoints = computed(() => routerEndpoints.value.filter(isCrudEndpoint))

const activeCodeProcesses = computed(() => {
  const group = activeGroup.value
  if (!group || group.id === 'types') return []
  if (group.id === 'subtables') {
    return activeSubtableGroup.value?.processes ?? []
  }
  return group.processes ?? []
})

const buildGroups = (endpoints: ManifestEndpoint[], table: DocsTable | undefined): ProcessGroup[] => {
  const groups: ProcessGroup[] = [
    {
      id: 'types',
      label: 'Types',
      description: 'Field types, defaults, and type references.',
      enabled: true,
      processes: [],
    },
  ]

  if (!table?.capabilities.router || endpoints.length === 0) {
    return groups
  }

  const typesense = endpoints.filter((endpoint) => endpoint.path.includes('.typesense.'))
  if (typesense.length && table.capabilities.typesense) {
    groups.push({
      id: 'typesense',
      label: 'Typesense',
      description: 'Search collection management and refresh routines.',
      enabled: true,
      processes: typesense,
    })
  }

  const crud = endpoints.filter((endpoint) => crudOps.has(endpoint.name) && endpoint.path.split('.').length === 2)
  if (crud.length && (table.capabilities.crud.create || table.capabilities.crud.update || table.capabilities.crud.delete)) {
    groups.push({
      id: 'crud',
      label: 'Core CRUD',
      description: 'Generated create/update/delete routes.',
      enabled: true,
      processes: crud,
    })
  }

  const taxonomyGroups = new Map<string, ManifestEndpoint[]>()
  endpoints.forEach((endpoint) => {
    if (!taxonomyOps.has(endpoint.name)) return
    const parts = endpoint.path.split('.')
    const segment = parts.length > 2 ? parts[1] : 'taxonomy'
    const list = taxonomyGroups.get(segment) ?? []
    list.push(endpoint)
    taxonomyGroups.set(segment, list)
  })

  taxonomyGroups.forEach((processes, key) => {
    groups.push({
      id: `taxonomy-${key}`,
      label: `Taxonomy: ${key}`,
      description: 'Taxonomy terms and attachments for this model.',
      enabled: true,
      processes,
    })
  })

  const resources = endpoints.filter((endpoint) => resourceOps.has(endpoint.name) && endpoint.path.split('.').length === 2)
  if (resources.length) {
    groups.push({
      id: 'resources',
      label: 'Resources',
      description: 'Views and helper endpoints for this model.',
      enabled: true,
      processes: resources,
    })
  }

  const subtables = subtableEndpoints.value.filter((endpoint) => subtableOps.has(endpoint.name))
  if (subtables.length) {
    groups.push({
      id: 'subtables',
      label: 'Subtables',
      description: 'Subtable CRUD helpers attached to this model.',
      enabled: true,
      processes: subtables,
    })
  }

  const views = endpoints.filter((endpoint) => {
    if (endpoint.path.includes('.typesense.')) return false
    if (endpoint.path.split('.').length !== 2) return false
    if (crudOps.has(endpoint.name)) return false
    if (resourceOps.has(endpoint.name)) return false
    return true
  })
  if (views.length) {
    groups.push({
      id: 'views',
      label: 'Views',
      description: 'Generated views for this model.',
      enabled: true,
      processes: views,
    })
  }

  return groups
}

const assetGroups = computed(() => buildGroups(routerEndpoints.value, selectedTable.value))

const utilityGroups = computed<ProcessGroup[]>(() => [
  {
    id: 'utility-count',
    label: 'Count',
    description: 'Utility helpers that apply across models.',
    enabled: true,
    processes: [],
  },
])

const visibleGroups = computed(() => (groupMode.value === 'utility' ? utilityGroups.value : assetGroups.value))

const pickFirstGroup = () => visibleGroups.value.find((group) => group.enabled) ?? visibleGroups.value[0]

const activeGroup = computed(() => {
  const current = visibleGroups.value.find((group) => group.id === activeGroupId.value)
  return current ?? pickFirstGroup()
})

const activeSubtableGroup = computed(() => {
  if (!subtableGroups.value.length) return null
  const match = subtableGroups.value.find((group) => group.key === activeSubtableKey.value)
  return match ?? subtableGroups.value[0]
})

const isTypesenseGroup = computed(() => activeGroup.value?.id === 'typesense')
let hasSeenGroup = false

watch([selectedModelId, groupMode], () => {
  const nextGroup = pickFirstGroup()
  activeGroupId.value = nextGroup?.id ?? ''
})

watch(
  activeGroup,
  (group) => {
    if (!group) return
    if (!activeGroupId.value) {
      activeGroupId.value = group.id
    }
    if (hasSeenGroup) {
      globalStateOpen.value = false
    } else {
      hasSeenGroup = true
    }
    group.processes.forEach(initProcessForm)
  },
  { immediate: true }
)

watch(subtableGroups, (groups) => {
  if (!groups.length) {
    activeSubtableKey.value = ''
    return
  }
  const exists = groups.some((group) => group.key === activeSubtableKey.value)
  if (!activeSubtableKey.value || !exists) {
    activeSubtableKey.value = groups[0].key
  }
}, { immediate: true })

const resolveQueryBy = (schema: any) => {
  const settingsQuery = schema?.settings?.queryBy ?? schema?.settings?.query_by
  if (Array.isArray(settingsQuery) && settingsQuery.length) {
    return settingsQuery.join(',')
  }
  const fields = Array.isArray(schema?.fields) ? schema.fields : []
  const stringFields = fields
    .filter((field: any) => field?.type === 'string' && field?.name !== 'id')
    .map((field: any) => field.name)
  if (stringFields.length) return stringFields.join(',')
  const allFields = fields
    .map((field: any) => field.name)
    .filter((name: string) => Boolean(name) && name !== 'id')
  return allFields[0] || 'id'
}

const resolveDocsField = (key: string) => selectedTable.value?.fields.find((field) => field.key === key)

const isInstanceField = (field: DocsField) => field.key?.toLowerCase() === 'instances'
const isJsonFieldType = (field: DocsField) =>
  ['array', 'object', 'record', 'any', 'union'].includes(field.type)

const buildDefaultValueFromFields = (fields?: DocsField[]) => {
  if (!fields || !fields.length) return undefined
  const output: Record<string, any> = {}
  fields.forEach((child) => {
    const childValue = resolveFieldDefault(child)
    if (childValue !== undefined) {
      output[child.key] = childValue
    }
  })
  return output
}

function resolveFieldDefault(field: DocsField): any {
  if (field.default !== undefined) return field.default
  if (field.type === 'array') return []
  if (field.type === 'object' || field.type === 'record') {
    const nested = buildDefaultValueFromFields(field.fields)
    return nested ?? {}
  }
  return undefined
}

const defaultFormValueForField = (field: DocsField) => {
  if (isInstanceField(field)) {
    const seeded = selectedInstanceIds.value.length
      ? [...selectedInstanceIds.value]
      : instanceState.active.length
        ? [...instanceState.active]
        : []
    return seeded
  }
  const base = resolveFieldDefault(field)
  if (isJsonFieldType(field)) {
    if (base === undefined) return ''
    return JSON.stringify(base, null, 2)
  }
  if (field.type === 'boolean') return Boolean(base ?? false)
  if (base !== undefined) return base
  return ''
}

const resolveInputType = (field: any) => {
  const docsField = resolveDocsField(field.key)
  const format = docsField?.format ?? docsField?.rawType ?? field.format
  if (format === 'email') return 'email'
  if (format === 'password') return 'text'
  if (field.type === 'number') return 'number'
  if (field.type === 'boolean') return 'checkbox'
  return 'text'
}

const updateTypesenseMeta = async () => {
  if (!isTypesenseGroup.value) return
  typesenseMeta.exists = null
  if (!typesense) {
    typesenseMeta.error = 'Typesense client not available on server'
    return
  }
  const key = selectedModelId.value
  typesenseMeta.error = ''
  typesenseMeta.key = key

  try {
    typesenseMeta.name = typesense.getCollectionName(key)
    typesenseMeta.localSchema = typesense.getCollectionSchema(key) as Record<string, any>
  } catch (error: any) {
    typesenseMeta.error = error?.message ?? String(error)
    typesenseMeta.localSchema = null
    typesenseMeta.name = ''
  }

  try {
    const remoteCollections = await typesense.getRemoteCollections()
    const match = remoteCollections.find((collection: any) => collection?.name === typesenseMeta.name)
    typesenseMeta.remoteCollection = match ?? null
    typesenseMeta.exists = Boolean(match)
  } catch {
    typesenseMeta.remoteCollection = null
    typesenseMeta.exists = null
    if (!typesenseMeta.error) {
      typesenseMeta.error = 'Unable to check remote collection state'
    }
  }
}

const resetTypesenseCollection = async () => {
  if (!typesense) {
    typesenseMeta.error = 'Typesense client not available on server'
    pushLog({ level: 'error', message: 'Typesense unavailable', detail: 'Missing client' })
    return
  }
  const key = selectedModelId.value
  try {
    await typesense.clearCollection(key)
    pushLog({ level: 'success', message: `Typesense collection reset (${key})` })
    await updateTypesenseMeta()
  } catch (error: any) {
    typesenseMeta.error = error?.message ?? String(error)
    pushLog({ level: 'error', message: 'Typesense reset failed', detail: error?.message ?? error })
  }
}

watch([selectedModelId, isTypesenseGroup], () => {
  updateTypesenseMeta()
})

watch(selectedModelId, () => {
  codeSelection.value = 'all'
})

watch(activeGroupId, () => {
  codeSelection.value = 'all'
})

watch(activeGroupId, (value) => {
  if (value !== 'subtables') return
  if (!subtableMenuOpen.value) subtableMenuOpen.value = true
  if (!activeSubtableKey.value && subtableGroups.value.length) {
    activeSubtableKey.value = subtableGroups.value[0].key
  }
})

watch(explicitSettingsInCode, (value) => {
  if (value) {
    includeInstancesInCode.value = true
  }
})

const getProcessForm = (processId: string) => {
  if (!processForms[processId]) {
    processForms[processId] = {}
  }
  return processForms[processId]
}

function initProcessForm(endpoint: ManifestEndpoint) {
  const form = getProcessForm(endpoint.path)
  if (isTaxonomyEndpoint(endpoint)) {
    const fields = taxonomyFieldsForEndpoint(endpoint)
    fields.forEach((field) => {
      if (form[field.key] !== undefined) return
      form[field.key] = defaultFormValueForField(field)
    })
    if (endpoint.name === 'removeTerm' || endpoint.name === 'attach' || endpoint.name === 'detach') {
      if (form.termKey === undefined) form.termKey = ''
    }
    if (endpoint.name === 'attach' || endpoint.name === 'detach' || endpoint.name === 'getRecordTerms') {
      if (form.recordId === undefined) form.recordId = ''
    }
    return
  }
  if (isCrudLikeEndpoint(endpoint)) {
    if (endpoint.name === 'update' || endpoint.name === 'delete') {
      if (form.recordId === undefined) {
        form.recordId = ''
      }
    }
    if (endpoint.name === 'update') {
      if (!form.payloadMode) {
        form.payloadMode = 'fields'
      }
      if (form.payloadJson === undefined) {
        form.payloadJson = ''
      }
    }
    const payloadFields = payloadFieldsForEndpoint(endpoint)
    payloadFields.forEach((field) => {
      if (form[field.key] !== undefined) return
      form[field.key] = defaultFormValueForField(field)
    })
    return
  }
  const fields = payloadFieldsForEndpoint(endpoint)
  fields.forEach((field: any) => {
    if (form[field.key] !== undefined) return
    form[field.key] = defaultFormValueForField(field)
  })
}

const defaultValueForField = (field: DocsField) => {
  const resolved = resolveFieldDefault(field)
  if (resolved !== undefined) return resolved
  if (field.type === 'boolean') return false
  if (field.type === 'number') return 0
  if (field.type === 'array') return []
  if (['object', 'record', 'any', 'union'].includes(field.type)) return {}
  return ''
}

const resolveInputPlaceholder = (field: DocsField) => {
  if (field.key === 'resourceKey') return 'Admin'
  if (field.key.toLowerCase().includes('id')) return 'Record sub-id (record.id)'
  return ''
}

const formatFlag = (value?: boolean | null) => {
  if (value === true) return 'yes'
  if (value === false) return 'no'
  return 'unknown'
}

const formatCardinality = (value?: string | null) => (value ? value : 'unknown')

const buildPayloadFromFields = (
  fields: DocsField[],
  form: Record<string, any>,
  includeEmpty = false
) => {
  const payload: Record<string, any> = {}

  fields.forEach((field) => {
    let value = form[field.key]

    if ((value === '' || value === undefined) && includeEmpty) {
      value = defaultValueForField(field)
    }

    if (value === '' || value === undefined) {
      if (includeEmpty) {
        payload[field.key] = value === undefined ? defaultValueForField(field) : value
      } else if (field.type === 'boolean') {
        payload[field.key] = Boolean(value)
      }
      return
    }

    if (field.type === 'number') {
      const parsed = typeof value === 'string' ? Number(value) : value
      payload[field.key] = Number.isNaN(parsed) ? defaultValueForField(field) : parsed
      return
    }

    if (field.type === 'boolean') {
      payload[field.key] = Boolean(value)
      return
    }

    if (['array', 'object', 'record', 'any', 'union'].includes(field.type)) {
      if (typeof value === 'string' && value.trim()) {
        try {
          payload[field.key] = JSON.parse(value)
        } catch {
          payload[field.key] = value
        }
      } else {
        payload[field.key] = value
      }
      return
    }

    payload[field.key] = value
  })

  return payload
}

const resolveRecordSubId = (form: Record<string, any>) =>
  form.recordId || globalState.recordId || ''

const buildCrudPayload = (endpoint: ManifestEndpoint, includeEmpty = false) => {
  const form = getProcessForm(endpoint.path)
  const payloadFields = payloadFieldsForEndpoint(endpoint)
  if (endpoint.name === 'create') {
    return buildPayloadFromFields(payloadFields, form, includeEmpty)
  }

  const recordId = resolveRecordSubId(form)

  if (endpoint.name === 'delete') {
    return { id: recordId }
  }

  if (endpoint.name === 'update') {
    const mode = form.payloadMode ?? 'fields'
    let payload: Record<string, any> = {}

    if (mode === 'json' && typeof form.payloadJson === 'string' && form.payloadJson.trim()) {
      try {
        payload = JSON.parse(form.payloadJson)
      } catch {
        payload = {}
      }
    } else {
      payload = buildPayloadFromFields(payloadFields, form, includeEmpty)
    }

    if (payload && typeof payload === 'object') {
      delete payload.id
    }
    return { id: recordId, ...payload }
  }

  return {}
}

const parseJsonField = (value: string) => {
  if (!value || !value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const buildDataPayload = (endpoint: ManifestEndpoint) => {
  if (isTaxonomyEndpoint(endpoint)) {
    const form = getProcessForm(endpoint.path)
    if (endpoint.name === 'createTaxonomy' || endpoint.name === 'addTerm') {
      return buildPayloadFromFields(taxonomyFieldsForEndpoint(endpoint), form, false)
    }
    if (endpoint.name === 'removeTerm') {
      return form.termKey || ''
    }
    if (endpoint.name === 'attach' || endpoint.name === 'detach') {
      return {
        id: resolveRecordSubId(form),
        term: form.termKey || '',
      }
    }
    if (endpoint.name === 'getRecordTerms') {
      return { id: resolveRecordSubId(form) }
    }
    return {}
  }
  if (isCrudLikeEndpoint(endpoint)) {
    return buildCrudPayload(endpoint, false)
  }
  if (isResourceEndpoint(endpoint)) {
    const form = getProcessForm(endpoint.path)
    const idValue = form.id || resolveRecordSubId(form) || globalState.recordId || ''
    const resourceKey = form.resourceKey || form.key || form.resource || ''
    return { id: idValue ? String(idValue) : '', resource: resourceKey }
  }
  const form = getProcessForm(endpoint.path)
  const fields = endpoint.fields ? Object.values(endpoint.fields) : []
  const payload: Record<string, any> = {}

  fields.forEach((field: any) => {
    let value = form[field.key]

    if (
      (value === '' || value === undefined) &&
      field.key.toLowerCase().includes('id') &&
      globalState.recordId
    ) {
      value = globalState.recordId
    }

    if (field.type === 'number') {
      if (value === '' || value === undefined || value === null) {
        return
      }
      const parsed = typeof value === 'string' ? Number(value) : value
      if (!Number.isNaN(parsed)) {
        payload[field.key] = parsed
      }
      return
    }

    if (field.type === 'boolean') {
      payload[field.key] = Boolean(value)
      return
    }

    if (['array', 'object', 'record', 'any', 'union'].includes(field.type)) {
      if (typeof value === 'string' && value.trim()) {
        try {
          payload[field.key] = JSON.parse(value)
        } catch {
          payload[field.key] = value
        }
      } else if (value !== '') {
        payload[field.key] = value
      }
      return
    }

    if (value !== '') {
      payload[field.key] = value
    }
  })

  return payload
}

const randomString = () => `sample-${Math.random().toString(36).slice(2, 8)}`
const randomNumber = () => Math.floor(Math.random() * 1000)

const seedValueForField = (field: any) => {
  const format = field.format ?? resolveDocsField(field.key)?.format ?? field.rawType
  const key = field.key?.toLowerCase?.() ?? ''
  const firstNames = ['Alex', 'Sam', 'Jamie', 'Taylor', 'Jordan', 'Casey', 'Morgan', 'Riley']
  const lastNames = ['Johnson', 'Smith', 'Brown', 'Williams', 'Taylor', 'Lee', 'Walker', 'Clark']
  const first = firstNames[Math.floor(Math.random() * firstNames.length)]
  const last = lastNames[Math.floor(Math.random() * lastNames.length)]

  if (key.includes('password') || format === 'password') return 'password'
  if (key.includes('email') || format === 'email') {
    return `${first.toLowerCase()}.${last.toLowerCase()}@example.com`
  }
  if (key.includes('resourcekey')) return 'Admin'
  if (key.includes('firstname')) return first
  if (key.includes('surname') || key.includes('lastname')) return last
  if (key.includes('role')) return 'student'
  if (key === 'instances') {
    const seeded = selectedInstanceIds.value.length
      ? [...selectedInstanceIds.value]
      : instanceState.active.length
        ? [...instanceState.active]
        : []
    return seeded
  }
  if (key.includes('customer')) return `cust_${randomNumber()}`
  if (field.key.toLowerCase().includes('id')) return randomString()
  if (field.enumValues?.length) return field.enumValues[0]
  if (field.type === 'boolean') return true
  if (field.type === 'number') return randomNumber()
  if (field.type === 'array') return JSON.stringify([randomString()], null, 2)
  if (['object', 'record', 'any', 'union'].includes(field.type)) {
    return JSON.stringify({ value: randomString() }, null, 2)
  }
  return randomString()
}

const populateProcessForm = (endpoint: ManifestEndpoint) => {
  const form = getProcessForm(endpoint.path)
  if (isTaxonomyEndpoint(endpoint)) {
    const meta = taxonomyMetaForEndpoint(endpoint)
    const key = meta?.key ?? taxonomyKeyForEndpoint(endpoint) ?? 'taxonomy'
    const label = meta?.labels?.singular ?? toTitle(key)
    const fields = taxonomyFieldsForEndpoint(endpoint)
    fields.forEach((field) => {
      form[field.key] = seedValueForField(field)
    })
    if (endpoint.name === 'createTaxonomy') {
      if (form.key === '') form.key = key
      if (form.label === '') form.label = label
      if (form.permalink === '') form.permalink = String(key).toLowerCase()
      if (form.description === '') form.description = meta?.labels?.plural ? `${label} terms` : ''
      if (meta?.hierarchical && form.parent === undefined) form.parent = ''
      return
    }
    if (endpoint.name === 'addTerm') {
      if (form.key === '') form.key = `${key}-term`
      if (form.label === '') form.label = `${label} Term`
      if (form.permalink === '') form.permalink = `${key}-term`
      if (meta?.hierarchical && form.parent === undefined) form.parent = ''
      return
    }
    if (endpoint.name === 'removeTerm') {
      form.termKey = form.termKey || `${key}-term`
      return
    }
    if (endpoint.name === 'attach' || endpoint.name === 'detach') {
      form.recordId = resolveRecordSubId(form) || randomString()
      form.termKey = form.termKey || `${key}-term`
      return
    }
    if (endpoint.name === 'getRecordTerms') {
      form.recordId = resolveRecordSubId(form) || randomString()
      return
    }
    return
  }
  if (isCrudLikeEndpoint(endpoint)) {
    const payloadFields = payloadFieldsForEndpoint(endpoint)
    payloadFields.forEach((field) => {
      form[field.key] = seedValueForField(field)
    })

    if (endpoint.name === 'update' || endpoint.name === 'delete') {
      form.recordId = resolveRecordSubId(form) || randomString()
    }

    if (endpoint.name === 'update' && form.payloadMode === 'json') {
      const payload = buildPayloadFromFields(payloadFields, form, true)
      form.payloadJson = JSON.stringify(payload, null, 2)
    }
    return
  }
  const fields = payloadFieldsForEndpoint(endpoint)
  fields.forEach((field: any) => {
    form[field.key] = seedValueForField(field)
  })
}

const resetProcessForm = (endpoint: ManifestEndpoint) => {
  delete processForms[endpoint.path]
  initProcessForm(endpoint)
}

const resolveSelectedInstances = () => {
  const ids = selectedInstanceIds.value.filter(Boolean)
  if (ids.length > 0) return ids
  const fallback = docs.instances.default || 'test'
  return fallback ? [fallback] : []
}

const resolveRootInstance = () => resolveSelectedInstances()[0] || docs.instances.default || 'test'

const logTypes = () => {
  pushLog({
    level: 'info',
    message: `TYPES → ${selectedModelId.value}`,
    detail: {
      model: selectedTable.value?.model,
      id: selectedTable.value?.id,
      fields: selectedTable.value?.fields,
    },
  })
}

const copyTypes = async () => {
  const payload = JSON.stringify(selectedTable.value?.fields ?? [], null, 2)
  await navigator.clipboard.writeText(payload)
  pushLog({ level: 'success', message: `Copied types for ${selectedModelId.value}` })
}

const copySnippet = async (endpoint: ManifestEndpoint) => {
  const data = buildDataPayload(endpoint)
  const instances = resolveSelectedInstances()
  const method = endpoint.method === 'mutation' ? 'mutate' : 'query'
  let snippet = `const { processRecordForInstances } = useCRUD()\n\nawait processRecordForInstances({\n  endpoint: '${endpoint.path}',\n  method: '${method}',\n  data: ${JSON.stringify(data, null, 2)},\n  instances: ${JSON.stringify(instances)},\n  options: { bypassMothership: ${bypassMothership.value} }\n})\n`

  if (endpoint.path.includes('.typesense.')) {
    const key = endpoint.path.split('.')[0]
    const queryBy = typesense ? resolveQueryBy(typesense.getCollectionSchema(key)) : 'id'
    switch (endpoint.name) {
      case 'collection':
        snippet = `const typesense = useTypesense()\nconst local = typesense.getCollectionSchema('${key}')\nconst remote = (await typesense.getRemoteCollections()).find(c => c?.name === typesense.getCollectionName('${key}'))\n`
        break
      case 'count':
        snippet = `const typesense = useTypesense()\nconst result = await typesense.search('${key}', { q: '*', query_by: '${queryBy}', per_page: 1 })\nconst count = result?.found ?? 0\n`
        break
      case 'list':
        snippet = `const typesense = useTypesense()\nconst result = await typesense.search('${key}', { q: '*', query_by: '${queryBy}', per_page: ${typeof data?.limit === 'number' ? data.limit : 10} })\n`
        break
      case 'refresh':
        snippet = `const typesense = useTypesense()\nawait typesense.ensureCollection('${key}')\n`
        break
      case 'resource':
        snippet = `const typesense = useTypesense()\nawait typesense.search('${key}', { q: '*', query_by: 'id', filter_by: 'id:=<record-id>' })\n`
        break
      default:
        snippet = `const typesense = useTypesense()\nawait typesense.search('${key}', { q: '*', query_by: '${queryBy}' })\n`
    }
  }

  await navigator.clipboard.writeText(snippet)
  pushLog({ level: 'success', message: `Copied snippet for ${endpoint.path}` })
}

const formatSurqlObject = (payload: Record<string, any>) => {
  const json = JSON.stringify(payload, null, 2)
  return json.replace(/\"([A-Za-z0-9_]+)\":/g, '$1:')
}

const buildSurqlSnippet = (endpoint: ManifestEndpoint) => {
  const model = selectedTable.value?.model ?? selectedModelId.value
  const varName = selectedModelId.value || 'record'
  const recordId = resolveRecordSubId(getProcessForm(endpoint.path)) || 'record-id'
  const recordThing = `type::record('${model}', ${JSON.stringify(recordId)})`
  const fnName = `${endpoint.name}${tableTypeBase.value}`
  const includeEmpty = includeDefaultsInCode.value

  if (isTaxonomyEndpoint(endpoint)) {
    const taxKey = taxonomyKeyForEndpoint(endpoint)
    const modelName = toPascalCase(selectedModelId.value)
    const taxName = toPascalCase(taxKey)
    const fnPrefix = `${modelName}${taxName}`
    const termKey = getProcessForm(endpoint.path).termKey || 'term-key'
    const termTable = taxonomyTermTableFor(taxKey) || 'term'

    if (endpoint.name === 'createTaxonomy') {
      const payload = buildPayloadFromFields(
        taxonomyFieldsForEndpoint(endpoint),
        getProcessForm(endpoint.path),
        includeEmpty
      )
      return `let $taxonomy = fn::create${fnPrefix}Taxonomy(${formatSurqlObject(payload)});`
    }

    if (endpoint.name === 'addTerm') {
      const payload = buildPayloadFromFields(
        taxonomyFieldsForEndpoint(endpoint),
        getProcessForm(endpoint.path),
        includeEmpty
      )
      return `let $term = fn::add${fnPrefix}Term(${formatSurqlObject(payload)});`
    }

    if (endpoint.name === 'removeTerm') {
      return [
        `let $term = type::record('${termTable}', ${JSON.stringify(termKey)});`,
        `fn::remove${fnPrefix}Term($term);`,
      ].join('\n')
    }

    if (endpoint.name === 'attach' || endpoint.name === 'detach') {
      const action = endpoint.name === 'attach' ? 'attach' : 'detach'
      return [
        `let $rid = ${recordThing};`,
        `let $term = type::record('${termTable}', ${JSON.stringify(termKey)});`,
        `fn::${action}${fnPrefix}Term($rid, $term);`,
      ].join('\n')
    }

    if (endpoint.name === 'getTerms') {
      return `fn::get${fnPrefix}Terms();`
    }

    if (endpoint.name === 'getRecordTerms') {
      return `fn::get${fnPrefix}s(${recordThing});`
    }
  }

  if (endpoint.name === 'delete') {
    return `fn::${fnName}(${recordThing});`
  }

  if (endpoint.name === 'update') {
    const form = getProcessForm(endpoint.path)
    const mode = form.payloadMode ?? 'fields'
    let payload: Record<string, any> = {}
    if (mode === 'json' && typeof form.payloadJson === 'string' && form.payloadJson.trim()) {
      try {
        payload = JSON.parse(form.payloadJson)
      } catch {
        payload = {}
      }
    } else {
      payload = buildPayloadFromFields(crudInputFields.value, form, includeEmpty)
    }
    return `let $${varName} = fn::${fnName}(${recordThing}, ${formatSurqlObject(payload)});`
  }

  const payload = buildPayloadFromFields(crudInputFields.value, getProcessForm(endpoint.path), includeEmpty)
  return `let $${varName} = fn::${fnName}(${formatSurqlObject(payload)});`
}

const buildRouterSnippet = (endpoint: ManifestEndpoint) => {
  let payload: any
  if (isTaxonomyEndpoint(endpoint)) {
    if (endpoint.name === 'createTaxonomy' || endpoint.name === 'addTerm') {
      payload = buildPayloadFromFields(
        taxonomyFieldsForEndpoint(endpoint),
        getProcessForm(endpoint.path),
        includeDefaultsInCode.value
      )
    } else if (endpoint.name === 'removeTerm') {
      payload = getProcessForm(endpoint.path).termKey || ''
    } else if (endpoint.name === 'attach' || endpoint.name === 'detach') {
      payload = {
        id: resolveRecordSubId(getProcessForm(endpoint.path)) || 'record-id',
        term: getProcessForm(endpoint.path).termKey || '',
      }
    } else if (endpoint.name === 'getRecordTerms') {
      payload = { id: resolveRecordSubId(getProcessForm(endpoint.path)) || 'record-id' }
    } else {
      payload = {}
    }
  } else if (isCrudLikeEndpoint(endpoint)) {
    payload = buildCrudPayload(endpoint, includeDefaultsInCode.value)
  } else {
    payload = buildPayloadFromFields(
      payloadFieldsForEndpoint(endpoint),
      getProcessForm(endpoint.path),
      includeDefaultsInCode.value
    )
  }
  const endpointPath = endpoint.path
  const instances = resolveSelectedInstances()
  const instanceArg =
    instances.length > 1
      ? JSON.stringify(instances)
      : JSON.stringify(instances[0] || docs.instances.default || 'test')

  const baseOptions: Record<string, any> = {
    dataLocation: relationshipLabel.value,
  }

  if (includeInstancesInCode.value) {
    if (instances.length > 1) {
      baseOptions.instances = instances
    } else if (instances[0]) {
      baseOptions.instance = instances[0]
    }
  }

  const allOptions: Record<string, any> = {
    ...baseOptions,
    rootInstance: docs.instances.default || 'pm',
    retryAttempts: 0,
    retryDelay: 1000,
    retryFailedAttempts: 0,
    retryFailedDelay: 1500,
    concurrency: 4,
    trackAttempts: false,
    consoleLogging: false,
    logFailures: false,
    returnType: 'record',
  }

  const optionsArg = explicitSettingsInCode.value
    ? JSON.stringify(includeAllSettingsInCode.value ? allOptions : baseOptions, null, 2)
    : includeInstancesInCode.value
      ? instanceArg
      : null

  const payloadArg =
    isCrudLikeEndpoint(endpoint) && endpoint.name === 'delete' && !explicitSettingsInCode.value
      ? JSON.stringify(resolveRecordSubId(getProcessForm(endpoint.path)) || 'record-id')
      : JSON.stringify(payload, null, 2)

  const lines = [
    `const { $process } = useCRUD()`,
    `const record = await $process('${endpointPath}', ${payloadArg}${optionsArg ? `, ${optionsArg}` : ''})`,
  ]

  return lines.join('\n')
}

const buildCodeSnippet = (endpoint: ManifestEndpoint) => {
  if (isTaxonomyEndpoint(endpoint)) {
    return includeRouterInCode.value ? buildRouterSnippet(endpoint) : buildSurqlSnippet(endpoint)
  }
  if (!isCrudLikeEndpoint(endpoint)) return buildRouterSnippet(endpoint)
  return includeRouterInCode.value ? buildRouterSnippet(endpoint) : buildSurqlSnippet(endpoint)
}

const openCodeFor = (endpoint: ManifestEndpoint) => {
  if (!isCrudEndpoint(endpoint)) return
  consoleMode.value = 'code'
  codeSelection.value = endpoint.path
}

const codeEndpoints = computed(() => {
  const list = activeCodeProcesses.value
  if (codeSelection.value === 'all') return list
  return list.filter((endpoint) => endpoint.path === codeSelection.value)
})

const copyCodeSnippet = async (endpoint: ManifestEndpoint) => {
  const snippet = buildCodeSnippet(endpoint)
  await navigator.clipboard.writeText(snippet)
  pushLog({ level: 'success', message: `Copied code for ${endpoint.path}` })
}

const callDirect = async (endpoint: ManifestEndpoint) => {
  const parts = endpoint.path.split('.')
  let current: any = $api
  for (let i = 0; i < parts.length - 1; i++) {
    current = current?.[parts[i]]
  }
  const fn = current?.[parts[parts.length - 1]]
  if (!fn) throw new Error(`Endpoint not found: ${endpoint.path}`)
  if (endpoint.method === 'mutation') {
    return await fn.mutate()
  }
  return await fn.query()
}

const extractRecordSubId = (record: any) => {
  if (!record) return null
  if (typeof record === 'string') return record
  if (typeof record === 'object') {
    if (typeof record.id === 'string') return record.id
    if (record.id && typeof record.id === 'object') {
      const nested = record.id.id ?? record.id.value
      if (typeof nested === 'string') return nested
    }
  }
  return null
}

const buildInstanceOptions = () => {
  const instances = resolveSelectedInstances()
  const rootInstance = resolveRootInstance()
  const isLocal = relationshipLabel.value === 'local'

  if (instances.length === 0) {
    return { instance: rootInstance, dataLocation: relationshipLabel.value }
  }
  if (instances.length === 1) {
    return { instance: instances[0], dataLocation: relationshipLabel.value }
  }
  if (isLocal) {
    return {
      rootInstance,
      instances: instances.filter((code) => code !== rootInstance),
      dataLocation: relationshipLabel.value,
    }
  }
  return { instances, dataLocation: relationshipLabel.value }
}

const runTypesenseAction = async (endpoint: ManifestEndpoint) => {
  if (!typesense) throw new Error('Typesense client not available')
  const key = endpoint.path.split('.')[0]
  const schema = typesense.getCollectionSchema(key)
  const queryBy = resolveQueryBy(schema)
  const data = buildDataPayload(endpoint)
  const instanceOptions = buildInstanceOptions()

  switch (endpoint.name) {
    case 'collection': {
      const remoteCollections = await typesense.getRemoteCollections()
      const collectionName = typesense.getCollectionName(key)
      const remote = remoteCollections.find((collection: any) => collection?.name === collectionName)
      return { local: schema, remote }
    }
    case 'count': {
      const response = await typesense.search(key, { q: '*', query_by: queryBy, per_page: 1 })
      return { found: response?.found ?? 0 }
    }
    case 'list': {
      return await $process(endpoint.path, data, { ...instanceOptions, method: 'query' })
    }
    case 'refresh': {
      const method = endpoint.name === 'refresh' || endpoint.method === 'mutation' ? 'mutate' : 'query'
      return await $process(endpoint.path, data, { ...instanceOptions, method })
    }
    case 'resource': {
      const id = data?.id ?? data?.recordId
      if (!id) throw new Error('Typesense resource requires id')
      return await $process(endpoint.path, { id }, instanceOptions)
    }
    default:
      return await typesense.search(key, { q: '*', query_by: queryBy })
  }
}

const fetchTypesenseById = async () => {
  if (!typesense) {
    pushLog({ level: 'error', message: 'Typesense unavailable', detail: 'Missing client' })
    return
  }
  const id = typesenseFetch.id.trim()
  if (!id) {
    pushLog({ level: 'warning', message: 'Typesense lookup requires an id' })
    return
  }
  const key = selectedModelId.value
  const queryBy = resolveQueryBy(typesense.getCollectionSchema(key))
  try {
    const result = await typesense.search(key, {
      q: '*',
      query_by: queryBy,
      filter_by: `id:=${id}`,
      per_page: 1,
    })
    pushLog({ level: 'success', message: `Typesense record ${id}`, detail: result })
  } catch (error: any) {
    pushLog({ level: 'error', message: 'Typesense lookup failed', detail: error?.message || error })
  }
}

const refreshTypesenseRecord = async () => {
  if (!typesense) {
    pushLog({ level: 'error', message: 'Typesense unavailable', detail: 'Missing client' })
    return
  }
  const id = typesenseFetch.id.trim()
  if (!id) {
    pushLog({ level: 'warning', message: 'Typesense refresh requires an id' })
    return
  }
  const key = selectedModelId.value
  try {
    const instanceOptions = buildInstanceOptions()
    const result = await $process(`${key}.typesense.resource`, { id }, instanceOptions)
    const record = Array.isArray(result) ? result[0] : result
    if (!record) {
      pushLog({ level: 'warning', message: 'No record found for refresh', detail: { id } })
      return
    }
    await typesense.upsertDocument(key, record, id)
    pushLog({ level: 'success', message: 'Typesense record refreshed', detail: record })
  } catch (error: any) {
    pushLog({ level: 'error', message: 'Typesense refresh failed', detail: error?.message || error })
  }
}

const fetchTypesenseRandom = async () => {
  if (!typesense) {
    pushLog({ level: 'error', message: 'Typesense unavailable', detail: 'Missing client' })
    return
  }
  const key = selectedModelId.value
  const schema = typesense.getCollectionSchema(key)
  const queryBy = resolveQueryBy(schema)
  try {
    const countResponse = await typesense.search(key, { q: '*', query_by: queryBy, per_page: 1, page: 1 })
    const total = countResponse?.found ?? 0
    if (!total) {
      pushLog({ level: 'warning', message: 'No Typesense records found' })
      return
    }
    const page = Math.max(1, Math.floor(Math.random() * total) + 1)
    const result = await typesense.search(key, { q: '*', query_by: queryBy, per_page: 1, page })
    pushLog({ level: 'success', message: 'Random Typesense record', detail: result })
  } catch (error: any) {
    pushLog({ level: 'error', message: 'Random Typesense fetch failed', detail: error?.message || error })
  }
}

const runProcess = async (endpoint: ManifestEndpoint) => {
  if (autoClearConsole.value) consoleLogs.value = []

  const data = buildDataPayload(endpoint)
  const instances = resolveSelectedInstances()
  const method = endpoint.method === 'mutation' ? 'mutate' : 'query'
  const instanceOptions = buildInstanceOptions()

  pushLog({
    level: 'info',
    message: `REQUEST → ${endpoint.path}`,
    detail: {
      endpoint: endpoint.path,
      method,
      instances,
      options: instanceOptions,
      data,
    },
  })

  try {
    let result: any
    if (endpoint.path.includes('.typesense.')) {
      result = await runTypesenseAction(endpoint)
    } else if (endpoint.input?.wrapper === 'RequestSchema') {
      result = showFullResponse.value
        ? await $processResult(endpoint.path, data, instanceOptions)
        : await $process(endpoint.path, data, instanceOptions)
    } else {
      result = await callDirect(endpoint)
    }

    const recordId = extractRecordSubId(result?.record ?? result?.id ?? result?.data ?? result)

    if (recordId) {
      globalState.recordId = recordId
    }

    const hasFailures = Array.isArray(result?.summary?.failed) && result.summary.failed.length > 0
    const hasRecord =
      result?.record !== undefined
        ? Boolean(result.record)
        : result !== null && result !== undefined
    const logLevel = hasFailures ? 'warning' : 'success'
    const responseDetail =
      showFullResponse.value || endpoint.path.includes('.typesense.') || !endpoint.input?.wrapper
        ? result
        : result?.record ?? result
    pushLog({
      level: logLevel,
      message: `RESPONSE ← ${endpoint.path}`,
      detail: responseDetail,
    })
    if (hasFailures) {
      pushLog({
        level: 'error',
        message: `Failures ← ${endpoint.path}`,
        detail: result?.instances ?? result,
      })
    } else if (!hasRecord) {
      pushLog({
        level: 'warning',
        message: `No record returned ← ${endpoint.path}`,
        detail: result,
      })
    }
  } catch (error: any) {
    pushLog({
      level: 'error',
      message: `ERROR ← ${endpoint.path}`,
      detail: {
        error: error?.message || error,
        raw: error,
      },
    })
  }
}

const pushLog = (entry: Omit<ConsoleEntry, 'id' | 'time'>) => {
  consoleLogs.value.push({
    id: `${Date.now()}-${logCounter++}`,
    time: new Date().toLocaleTimeString(),
    ...entry,
  })
}

const clearConsole = () => {
  consoleLogs.value = []
}

type TypeEntry = {
  name: string
  kind: 'zod' | 'ts'
  available: boolean
  value?: any
}

const buildTypeEntry = (
  name: string,
  kind: 'zod' | 'ts',
  value?: any,
  availableOverride?: boolean
): TypeEntry => ({
  name,
  kind,
  available: availableOverride ?? (kind === 'zod' ? value !== undefined : true),
  value,
})

const getZodDef = (schema: any) => schema?._def ?? schema?.def ?? schema

const formatZodSignature = (schema: any): string => {
  const def = getZodDef(schema)
  const type = def?.type ?? def?.typeName
  if (!type) return 'unknown'

  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'any') return type
  if (type === 'literal') {
    const value = def?.value ?? def?.literal
    return typeof value === 'string' ? `"${value}"` : String(value)
  }
  if (type === 'enum') {
    const values = def?.values ?? def?.options ?? []
    return values.length ? values.map((val: any) => JSON.stringify(val)).join(' | ') : 'enum'
  }
  if (type === 'array') {
    const inner = def?.element ?? def?.innerType ?? def?.items
    return `${formatZodSignature(inner)}[]`
  }
  if (type === 'tuple') {
    const items = def?.items ?? def?.itemsType ?? []
    return `[${items.map((item: any) => formatZodSignature(item)).join(', ')}]`
  }
  if (type === 'union') {
    const options = def?.options ?? def?.items ?? []
    return options.length ? options.map((opt: any) => formatZodSignature(opt)).join(' | ') : 'union'
  }
  if (type === 'record') {
    const valueType = def?.valueType ?? def?.value
    return `Record<string, ${formatZodSignature(valueType)}>`
  }
  if (type === 'optional') {
    return formatZodSignature(def?.innerType ?? def?.schema ?? def?.type)
  }
  if (type === 'nullable') {
    return `${formatZodSignature(def?.innerType ?? def?.schema ?? def?.type)} | null`
  }
  if (type === 'object') {
    return formatZodSignatureObject(schema)
  }

  return type
}

const formatZodExpression = (schema: any): string => {
  const def = getZodDef(schema)
  const type = def?.type ?? def?.typeName

  if (type === 'string') return 'z.string()'
  if (type === 'number') return 'z.number()'
  if (type === 'boolean') return 'z.boolean()'
  if (type === 'any') return 'z.any()'
  if (type === 'literal') {
    const value = def?.value ?? def?.literal
    return `z.literal(${JSON.stringify(value)})`
  }
  if (type === 'enum') {
    const values = def?.values ?? def?.options ?? []
    return `z.enum([${values.map((val: any) => JSON.stringify(val)).join(', ')}])`
  }
  if (type === 'array') {
    const inner = def?.element ?? def?.innerType ?? def?.items
    return `z.array(${formatZodExpression(inner)})`
  }
  if (type === 'tuple') {
    const items = def?.items ?? def?.itemsType ?? []
    return `z.tuple([${items.map((item: any) => formatZodExpression(item)).join(', ')}])`
  }
  if (type === 'union') {
    const options = def?.options ?? def?.items ?? []
    return `z.union([${options.map((opt: any) => formatZodExpression(opt)).join(', ')}])`
  }
  if (type === 'record') {
    const valueType = def?.valueType ?? def?.value
    return `z.record(${formatZodExpression(valueType)})`
  }
  if (type === 'optional') {
    const inner = def?.innerType ?? def?.schema ?? def?.type
    return `${formatZodExpression(inner)}.optional()`
  }
  if (type === 'nullable') {
    const inner = def?.innerType ?? def?.schema ?? def?.type
    return `${formatZodExpression(inner)}.nullable()`
  }
  if (type === 'object') {
    return `z.object(${formatZodObject(schema)})`
  }

  return 'z.any()'
}

const formatZodObject = (schema: any): string => {
  const def = getZodDef(schema)
  const shape = typeof def?.shape === 'function' ? def.shape() : def?.shape ?? {}
  const entries = Object.entries(shape).map(([key, value]) => {
    const innerDef = getZodDef(value)
    const isOptional = innerDef?.type === 'optional'
    const resolved = isOptional ? innerDef?.innerType ?? value : value
    const label = `${key}: ${formatZodExpression(resolved)}${isOptional ? '.optional()' : ''}`
    return label
  })
  return `{ ${entries.join(', ')} }`
}

const formatZodSignatureObject = (schema: any): string => {
  const def = getZodDef(schema)
  const shape = typeof def?.shape === 'function' ? def.shape() : def?.shape ?? {}
  const entries = Object.entries(shape).map(([key, value]) => {
    const innerDef = getZodDef(value)
    const isOptional = innerDef?.type === 'optional'
    const resolved = isOptional ? innerDef?.innerType ?? value : value
    return `${key}${isOptional ? '?' : ''}: ${formatZodSignature(resolved)}`
  })
  return `{ ${entries.join('; ')} }`
}

const showCoreTypes = ref(false)

const typeSections = computed(() => {
  const entries: { id: string; label: string; description: string; entries: TypeEntry[] }[] = []
  const recordEntries: TypeEntry[] = []
  if (runtimeTypes.RecordID_z && showCoreTypes.value) {
    recordEntries.push(buildTypeEntry('RecordID_z', 'zod', runtimeTypes.RecordID_z))
    recordEntries.push(buildTypeEntry('RecordID', 'ts'))
  }

  const base = tableTypeBase.value
  const modelEntries: TypeEntry[] = []
  if (base) {
    const zodName = `Z_${base}`
    const zodValue = runtimeTypes[zodName]
    modelEntries.push(buildTypeEntry(zodName, 'zod', zodValue))
    modelEntries.push(buildTypeEntry(base, 'ts', undefined, Boolean(zodValue)))

    const idExportName =
      selectedTable.value?.id?.exportName ||
      selectedTable.value?.id?.exportZodName?.replace(/_z$/, '') ||
      `${base}Id`
    const idZodName =
      selectedTable.value?.id?.exportZodName ||
      `${idExportName}_z`
    const idZodValue = runtimeTypes[idZodName] ?? runtimeTypes[`${idExportName}_z`]
    const resolvedIdName = idZodValue ? idZodName : idZodName
    const idBase = idExportName
    modelEntries.push(buildTypeEntry(resolvedIdName, 'zod', idZodValue))
    modelEntries.push(buildTypeEntry(idBase, 'ts', undefined, Boolean(idZodValue)))
  }

  if (recordEntries.length) {
    entries.push({
      id: 'record',
      label: 'Core record ID types',
      description: 'Shared identifier types (optional).',
      entries: recordEntries,
    })
  }

  if (modelEntries.length) {
    entries.push({
      id: 'model',
      label: 'Model types',
      description: `Types generated for ${base || 'this model'}.`,
      entries: modelEntries,
    })
  }

  return entries
})

const isViewsGroup = computed(() => activeGroup.value?.id === 'views')

const buildViewQueryPreview = (endpoint: ManifestEndpoint) => {
  const rawName = endpoint.name.replace(/count$/i, '')
  const viewSuffix = toPascalCase(rawName)
  const viewName = `${tableTypeBase.value}${viewSuffix}`
  const form = getProcessForm(endpoint.path)
  const limit = Number.isFinite(Number(form.limit)) ? Number(form.limit) : -1
  const start = Number.isFinite(Number(form.start)) ? Number(form.start) : -1
  let query = `SELECT * FROM ${viewName}`
  if (limit >= 0) query += ` LIMIT ${limit}`
  if (start >= 0) query += ` START ${start}`
  query += ';'
  return query
}

const copyTypeName = async (entry: TypeEntry) => {
  if (!entry.available) return
  await navigator.clipboard.writeText(entry.name)
  pushLog({ level: 'success', message: `Copied ${entry.name}` })
}

const copyTypeImport = async (entry: TypeEntry) => {
  if (!entry.available) return
  const statement =
    entry.kind === 'zod'
      ? `import { ${entry.name} } from '@schema/types'`
      : `import type { ${entry.name} } from '@schema/types'`
  await navigator.clipboard.writeText(statement)
  pushLog({ level: 'success', message: `Copied import for ${entry.name}` })
}

const logTypeEntry = (entry: TypeEntry) => {
  if (!entry.available) {
    pushLog({
      level: 'warning',
      message: `TYPE → ${entry.name}`,
      detail: 'Type not generated for this model yet.',
    })
    return
  }
  if (entry.kind === 'zod' && entry.value !== undefined) {
    const signature = formatZodSignature(entry.value)
    const zod = formatZodExpression(entry.value)
    pushLog({
      level: 'info',
      message: `TYPE → ${entry.name}`,
      detail: { signature, zod },
    })
    return
  }
  pushLog({
    level: 'info',
    message: `TYPE → ${entry.name}`,
    detail: {
      note: 'TypeScript types are erased at runtime. Import from @schema/types.',
    },
  })
}

const formatIdStructure = (value?: string | string[]) => {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}
</script>

<template>
  <div class="workspace fade-in">
    <section class="widget">
      <header class="widget-header">
        <div class="stack">
          <strong>SchemaDocs API Console</strong>
          <small class="muted">TRPC testing surface</small>
        </div>

        <div class="row header-controls">
          <div class="field compact">
            <label class="label">Primary model</label>
            <select v-model="selectedModelId" class="select">
              <option v-for="model in modelKeys" :key="model" :value="model">
                {{ toTitle(model) }}
              </option>
            </select>
          </div>

          <div class="field compact">
            <label class="label">Instance</label>
            <Combobox v-model="selectedInstanceIds" multiple>
              <div class="combo">
                <div class="combo-row">
                  <div class="combo-input">
                    <ComboboxInput
                      class="input"
                      :display-value="() => ''"
                      placeholder="Type to add instance"
                      @change="instanceQuery = $event.target.value"
                    />
                    <ComboboxButton class="button outline small">▾</ComboboxButton>
                  </div>
                  <div v-if="selectedInstanceIds.length" class="combo-chips">
                    <button
                      v-for="item in selectedInstanceIds"
                      :key="item"
                      type="button"
                      class="chip"
                      @click="removeInstance(item)"
                    >
                      {{ instanceLabelMap.get(item) || item }}
                      <span class="chip-remove">×</span>
                    </button>
                  </div>
                </div>
                <ComboboxOptions class="combo-options">
                  <ComboboxOption
                    v-for="option in filteredInstanceOptions"
                    :key="option.value"
                    :value="option.value"
                    v-slot="{ active, selected }"
                  >
                    <li class="combo-option" :class="{ active, selected }">
                      <span>{{ option.label }}</span>
                      <span v-if="selected" class="tag">Selected</span>
                    </li>
                  </ComboboxOption>
                </ComboboxOptions>
              </div>
            </Combobox>
            <small class="help">Type to filter, click to select multiple.</small>
          </div>
        </div>

        <button class="button outline small" @click="headerExpanded = !headerExpanded">
          {{ headerExpanded ? 'Hide settings' : 'More settings' }}
        </button>
      </header>

      <div class="widget-body collapse-panel" :class="{ 'is-open': headerExpanded }">
        <div class="grid grid-3">
          <div class="field">
            <label class="label">Storage mode</label>
            <select v-model="storageMode" class="select">
              <option value="local">Local only</option>
              <option value="remote">Remote only</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <p class="help">Controls where writes should land when routers support it.</p>
          </div>

          <div class="field">
            <label class="label">Related model (left)</label>
            <select v-model="relatedLeftModelId" class="select">
              <option value="">None</option>
              <option v-for="model in modelKeys" :key="model" :value="model">
                {{ toTitle(model) }}
              </option>
            </select>
            <p class="help">Placeholder for graph edge traversal.</p>
          </div>

          <div class="field">
            <label class="label">Related model (right)</label>
            <select v-model="relatedRightModelId" class="select">
              <option value="">None</option>
              <option v-for="model in modelKeys" :key="model" :value="model">
                {{ toTitle(model) }}
              </option>
            </select>
            <p class="help">Use this to test nested relations later.</p>
          </div>

          <div class="field">
            <label class="label">Run mode</label>
            <select v-model="runMode" class="select">
              <option value="write">Write</option>
              <option value="dry-run">Dry run</option>
              <option value="validate">Validate only</option>
            </select>
            <p class="help">Simulates how the router should behave.</p>
          </div>

          <div class="field">
            <label class="label">Relationship</label>
            <div class="row">
              <span class="tag">{{ relationshipLabel }}</span>
              <span class="tag">Bypass mothership: {{ bypassMothership ? 'true' : 'false' }}</span>
            </div>
          </div>
        </div>
      </div>

      <section class="layout-3 widget-main">
        <aside class="stack">
          <div class="card">
            <h4>Process groups</h4>
            <p class="help">Pick a capability set to test.</p>
            <div class="field" style="margin-top: 0.75rem;">
              <label class="label">Mode</label>
              <select v-model="groupMode" class="select">
                <option value="assets">Assets</option>
                <option value="utility">Utility</option>
              </select>
            </div>
            <div class="stack process-groups-scroll">
              <template v-for="group in visibleGroups" :key="group.id">
                <button
                  v-if="group.id !== 'subtables'"
                  class="button block"
                  :class="{ primary: group.id === activeGroupId, ghost: group.id !== activeGroupId }"
                  :disabled="!group.enabled"
                  @click="activeGroupId = group.id"
                >
                  <div class="spread">
                    <span>{{ group.label }}</span>
                    <span class="tag">{{ group.processes.length }}</span>
                  </div>
                  <small class="muted">{{ group.description }}</small>
                </button>

                <div v-else class="stack">
                  <button
                    class="button block"
                    :class="{ primary: group.id === activeGroupId, ghost: group.id !== activeGroupId }"
                    :disabled="!group.enabled"
                    @click="activeGroupId = group.id; subtableMenuOpen = !subtableMenuOpen"
                  >
                    <div class="spread">
                      <span>{{ group.label }}</span>
                      <span class="tag">{{ group.processes.length }}</span>
                    </div>
                    <small class="muted">{{ group.description }}</small>
                  </button>

                  <div v-if="subtableMenuOpen" class="stack" style="margin-left: 0.5rem;">
                    <button
                      v-for="subtable in subtableGroups"
                      :key="subtable.key"
                      class="button block"
                      :class="{
                        primary: activeGroupId === 'subtables' && activeSubtableKey === subtable.key,
                        ghost: !(activeGroupId === 'subtables' && activeSubtableKey === subtable.key),
                      }"
                      @click="activeGroupId = 'subtables'; activeSubtableKey = subtable.key"
                    >
                      <div class="spread">
                        <span>{{ formatSubtableLabel(subtable.meta, subtable.key) }}</span>
                        <span class="tag">{{ subtable.processes.length }}</span>
                      </div>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </aside>

        <main class="stack center-scroll">
          <div class="card">
            <div class="spread">
              <div>
                <h3>{{ activeGroup?.label }}</h3>
                <p class="help">{{ activeGroup?.description }}</p>
              </div>
              <span class="badge">$api.{{ selectedModelId }}</span>
            </div>
          </div>

          <details
            class="accordion card"
            :open="globalStateOpen"
            @toggle="globalStateOpen = ($event.target as HTMLDetailsElement).open"
          >
            <summary class="accordion-header">
              <div>
                <strong>Global state</strong>
                <p class="help">Shared context applied to all process runs.</p>
              </div>
              <span class="tag">Globals</span>
            </summary>
            <div class="accordion-body">
              <div class="grid grid-2">
                <div class="field">
                  <label class="label">Record ID</label>
                  <input v-model="globalState.recordId" class="input" placeholder="record sub-id" />
                </div>
                <div class="field">
                  <label class="label">Taxonomy scope</label>
                  <input v-model="globalState.taxonomyScope" class="input" placeholder="taxonomy key" />
                </div>
                <div class="field">
                  <label class="label">Left edge count</label>
                  <input v-model="globalState.leftEdgeCount" class="input" type="number" />
                </div>
                <div class="field">
                  <label class="label">Right edge count</label>
                  <input v-model="globalState.rightEdgeCount" class="input" type="number" />
                </div>
                <div class="field" style="grid-column: 1 / -1;">
                  <label class="label">Note</label>
                  <input v-model="globalState.note" class="input" placeholder="Shared context for all processes" />
                </div>
              </div>
            </div>
          </details>

          <div v-if="isTypesenseGroup" class="card">
            <div class="spread">
              <div>
                <h4>Typesense metadata</h4>
                <p class="help">Local schema + live collection details.</p>
              </div>
              <div class="row">
                <span class="tag">Data: {{ relationshipLabel }}</span>
                <span class="tag" :class="`tag-${typesenseStatus.tone}`">{{ typesenseStatus.label }}</span>
                <button class="button outline small" @click="resetTypesenseCollection">Reset collection</button>
                <button class="button outline small" @click="updateTypesenseMeta">Refresh</button>
              </div>
            </div>
            <div v-if="typesenseMeta.error" class="alert warning" style="margin-top: 0.75rem;">
              {{ typesenseMeta.error }}
            </div>
            <div class="grid grid-2" style="margin-top: 0.75rem;">
              <div class="field">
                <label class="label">Collection key</label>
                <div class="inset">{{ typesenseMeta.key || selectedModelId }}</div>
              </div>
              <div class="field">
                <label class="label">Collection name</label>
                <div class="inset">{{ typesenseMeta.name || 'Unknown' }}</div>
              </div>
              <div class="field">
                <label class="label">Local fields</label>
                <div class="inset">{{ typesenseMeta.localSchema?.fields?.length ?? 0 }}</div>
              </div>
              <div class="field">
                <label class="label">Remote docs</label>
                <div class="inset">{{ typesenseMeta.remoteCollection?.num_documents ?? 'n/a' }}</div>
              </div>
            </div>
            <div v-if="selectedTable?.typesense?.schema?.settings" class="inset" style="margin-top: 0.75rem;">
              <strong>Typesense settings</strong>
              <pre class="code-block" style="margin: 0.5rem 0 0;">{{ JSON.stringify(selectedTable.typesense.schema.settings, null, 2) }}</pre>
            </div>
          </div>

          <div v-if="isTypesenseGroup" class="card">
            <div class="spread">
              <div>
                <h4>Typesense fetch</h4>
                <p class="help">Grab a Typesense document by id or at random.</p>
              </div>
            </div>
            <div class="field" style="margin-top: 0.75rem;">
              <label class="label">Record id</label>
              <input v-model="typesenseFetch.id" class="input" placeholder="record id" />
            </div>
            <div class="row" style="margin-top: 0.75rem;">
              <button class="button" @click="fetchTypesenseById">Fetch by id</button>
              <button class="button outline" @click="refreshTypesenseRecord">Refresh record</button>
              <button class="button outline" @click="fetchTypesenseRandom">Fetch random</button>
            </div>
          </div>

          <div v-if="activeGroup?.id === 'types'" class="stack">
            <div class="card">
              <div class="spread">
                <div>
                  <h4>Types</h4>
                  <p class="help">Exported Zod schemas and TypeScript types.</p>
                </div>
                <div class="row">
                  <label class="toggle" style="margin: 0;">
                    <input v-model="showCoreTypes" type="checkbox" />
                    <span>Show core types</span>
                  </label>
                  <span class="badge">@schema/types</span>
                </div>
              </div>

              <div v-for="section in typeSections" :key="section.id" style="margin-top: 1rem;">
                <div class="spread" style="align-items: baseline;">
                  <strong>{{ section.label }}</strong>
                  <small class="muted">{{ section.description }}</small>
                </div>
                <table class="table" style="margin-top: 0.5rem;">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Kind</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="entry in section.entries" :key="entry.name">
                      <td>
                        <span>{{ entry.name }}</span>
                        <span v-if="!entry.available" class="tag" style="margin-left: 0.5rem;">Missing</span>
                      </td>
                      <td>{{ entry.kind === 'zod' ? 'Zod schema' : 'TypeScript type' }}</td>
                      <td>
                        <div class="row">
                          <button class="button outline small" :disabled="!entry.available" @click="logTypeEntry(entry)">Log</button>
                          <button class="button outline small" :disabled="!entry.available" @click="copyTypeName(entry)">Copy name</button>
                          <button class="button small" :disabled="!entry.available" @click="copyTypeImport(entry)">Copy import</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="selectedTable?.id" class="inset" style="margin-top: 1rem;">
                <strong>ID structure</strong>
                <div class="help" style="margin-top: 0.35rem;">
                  <span v-if="selectedTable.id.source">Source: {{ formatIdStructure(selectedTable.id.source) }}</span>
                  <span v-else-if="selectedTable.id.structure">Structure: {{ formatIdStructure(selectedTable.id.structure) }}</span>
                  <span v-else>Uses default ID strategy.</span>
                </div>
              </div>
            </div>

            <div class="card">
              <h4>Field types</h4>
              <table class="table" style="margin-top: 0.75rem;">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Default</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in selectedTable?.fields" :key="field.key">
                    <td>
                      {{ field.key }}
                      <span v-if="field.ignorePayload" class="tag" style="margin-left: 0.5rem;">Ignored in payload</span>
                    </td>
                  <td>
                    <span>{{ field.rawType ?? field.type }}</span>
                    <span v-if="field.format" class="tag" style="margin-left: 0.5rem;">{{ field.format }}</span>
                  </td>
                    <td>{{ field.required ? 'yes' : 'no' }}</td>
                    <td>{{ field.default ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="row" style="margin-top: 1rem;">
                <button class="button" @click="logTypes">Log types</button>
                <button class="button outline" @click="copyTypes">Copy types</button>
                <a v-if="selectedTable?.docs?.types" class="button ghost" :href="'/' + selectedTable.docs.types">Open docs</a>
              </div>
            </div>
          </div>

          <div v-else-if="activeGroup?.id === 'subtables'" class="stack">
            <div v-if="!subtableGroups.length" class="alert info">
              No subtables defined for this model.
            </div>
            <template v-else>
              <div v-if="activeSubtableGroup" class="card">
                <div class="spread">
                  <div>
                    <h4>{{ formatSubtableLabel(activeSubtableGroup.meta, activeSubtableGroup.key) }}</h4>
                    <p class="help">
                      {{
                        activeSubtableGroup.meta?.description ??
                        `Subtable (${formatSubtableType(activeSubtableGroup.meta?.tableType)})`
                      }}
                    </p>
                  </div>
                  <span class="tag">{{ activeSubtableGroup.processes.length }} actions</span>
                </div>
              </div>
              <div v-else class="alert info">
                Select a subtable to view its actions.
              </div>

              <details
                v-for="endpoint in activeSubtableGroup?.processes ?? []"
                :key="endpoint.path"
                class="accordion card"
                open
              >
                <summary class="accordion-header">
                  <div>
                    <strong>{{ toTitle(endpoint.name) }}</strong>
                    <p class="help">{{ endpoint.path }}</p>
                  </div>
                  <span class="tag">{{ endpoint.method }}</span>
                </summary>
                <div class="accordion-body">
                  <div v-if="endpoint.name === 'update' || endpoint.name === 'delete'" class="field">
                    <label class="label">
                      Record ID
                      <span class="tag" style="margin-left: 0.5rem;">Sub-id</span>
                    </label>
                    <input
                      v-model="getProcessForm(endpoint.path).recordId"
                      class="input"
                      placeholder="record sub-id (record.id)"
                    />
                  </div>

                  <div v-if="endpoint.name === 'update'" class="field">
                    <label class="label">Payload mode</label>
                    <div class="row">
                      <button
                        class="button small"
                        :class="{ primary: getProcessForm(endpoint.path).payloadMode === 'fields' }"
                        @click="getProcessForm(endpoint.path).payloadMode = 'fields'"
                      >
                        Fields
                      </button>
                      <button
                        class="button small"
                        :class="{ primary: getProcessForm(endpoint.path).payloadMode === 'json' }"
                        @click="getProcessForm(endpoint.path).payloadMode = 'json'"
                      >
                        JSON
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="endpoint.name === 'update' && getProcessForm(endpoint.path).payloadMode === 'json'"
                    class="field"
                  >
                    <label class="label">Payload JSON</label>
                    <textarea
                      v-model="getProcessForm(endpoint.path).payloadJson"
                      class="input"
                      rows="6"
                      placeholder='{"field": "value"}'
                      style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                    />
                  </div>

                  <div
                    v-if="endpoint.name !== 'delete' && getProcessForm(endpoint.path).payloadMode !== 'json'"
                    class="stack"
                  >
                    <div v-if="!payloadFieldsForEndpoint(endpoint).length" class="alert info">
                      No payload fields defined for this subtable.
                    </div>
                    <div v-else v-for="field in payloadFieldsForEndpoint(endpoint)" :key="field.key" class="field">
                      <label class="label">
                        {{ field.key }}
                        <span v-if="field.required" class="tag" style="margin-left: 0.5rem;">Required</span>
                      </label>
                      <template v-if="isInstanceField(field)">
                        <Combobox v-model="getProcessForm(endpoint.path)[field.key]" multiple>
                          <div class="combo">
                            <div class="combo-row">
                              <div class="combo-input">
                                <ComboboxInput
                                  class="input"
                                  :display-value="() => ''"
                                  placeholder="Type to add instance"
                                  @change="setInstanceQuery(endpoint, field, $event.target.value)"
                                />
                                <ComboboxButton class="button outline small">▾</ComboboxButton>
                              </div>
                              <div v-if="getProcessForm(endpoint.path)[field.key]?.length" class="combo-chips">
                                <button
                                  v-for="item in getProcessForm(endpoint.path)[field.key]"
                                  :key="item"
                                  type="button"
                                  class="chip"
                                  @click="getProcessForm(endpoint.path)[field.key] = getProcessForm(endpoint.path)[field.key].filter((code: string) => code !== item)"
                                >
                                  {{ instanceLabelMap.get(item) || item }}
                                  <span class="chip-remove">×</span>
                                </button>
                              </div>
                            </div>
                            <ComboboxOptions class="combo-options">
                              <ComboboxOption
                                v-for="option in filteredInstanceOptionsFor(getInstanceQuery(endpoint, field))"
                                :key="option.value"
                                :value="option.value"
                                v-slot="{ active, selected }"
                              >
                                <li class="combo-option" :class="{ active, selected }">
                                  <span>{{ option.label }}</span>
                                  <span v-if="selected" class="tag">Selected</span>
                                </li>
                              </ComboboxOption>
                            </ComboboxOptions>
                          </div>
                        </Combobox>
                        <small class="help">Choose one or more available instances.</small>
                      </template>
                      <template v-else-if="isJsonFieldType(field)">
                        <textarea
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          rows="5"
                          :placeholder="resolveInputPlaceholder(field)"
                          style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                        />
                        <small class="help">Provide JSON for {{ field.type }} payloads.</small>
                      </template>
                      <template v-else>
                        <input
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          :type="resolveInputType(field)"
                          :placeholder="resolveInputPlaceholder(field)"
                        />
                      </template>
                    </div>
                  </div>

                  <div class="row" style="margin-top: 1rem;">
                    <button class="button" @click="populateProcessForm(endpoint)">Populate</button>
                    <button class="button" @click="resetProcessForm(endpoint)">Reset</button>
                    <button class="button outline" @click="copySnippet(endpoint)">Copy snippet</button>
                    <button class="button primary" @click="runProcess(endpoint)">Run process</button>
                  </div>
                </div>
              </details>
            </template>
          </div>

          <div v-else class="stack">
            <details
              v-for="endpoint in activeGroup?.processes"
              :key="endpoint.path"
              class="accordion card"
              open
            >
              <summary class="accordion-header">
                <div>
                  <strong>{{ toTitle(endpoint.name) }}</strong>
                  <p class="help">{{ endpoint.path }}</p>
                </div>
                <span class="tag">{{ endpoint.method }}</span>
              </summary>
              <div class="accordion-body">
                <template v-if="isTaxonomyEndpoint(endpoint)">
                  <div class="stack">
                    <div v-if="activeTaxonomyMeta" class="inset">
                      <strong>{{ toTitle(activeTaxonomyMeta.key) }}</strong>
                      <div class="help" style="margin-top: 0.35rem;">
                        <span>Hierarchical: {{ formatFlag(activeTaxonomyMeta.hierarchical) }}</span>
                        <span style="margin-left: 0.75rem;">Cardinality: {{ formatCardinality(activeTaxonomyMeta.cardinality) }}</span>
                        <span style="margin-left: 0.75rem;">Store on model: {{ formatFlag(activeTaxonomyMeta.storeOnModel) }}</span>
                        <span style="margin-left: 0.75rem;">Term table: {{ taxonomyTermTableFor(activeTaxonomyMeta.key) || 't_<model>_<taxonomy>' }}</span>
                      </div>
                    </div>

                    <template v-if="endpoint.name === 'createTaxonomy' || endpoint.name === 'addTerm'">
                      <div v-if="!taxonomyFieldsForEndpoint(endpoint).length" class="alert info">
                        No payload fields defined for this taxonomy.
                      </div>
                      <div
                        v-else
                        v-for="field in taxonomyFieldsForEndpoint(endpoint)"
                        :key="field.key"
                        class="field"
                      >
                        <label class="label">
                          {{ field.key }}
                          <span v-if="field.required" class="tag" style="margin-left: 0.5rem;">Required</span>
                        </label>
                        <template v-if="isInstanceField(field)">
                          <Combobox v-model="getProcessForm(endpoint.path)[field.key]" multiple>
                            <div class="combo">
                              <div class="combo-row">
                                <div class="combo-input">
                                  <ComboboxInput
                                    class="input"
                                    :display-value="() => ''"
                                    placeholder="Type to add instance"
                                    @change="setInstanceQuery(endpoint, field, $event.target.value)"
                                  />
                                  <ComboboxButton class="button outline small">▾</ComboboxButton>
                                </div>
                                <div v-if="getProcessForm(endpoint.path)[field.key]?.length" class="combo-chips">
                                  <button
                                    v-for="item in getProcessForm(endpoint.path)[field.key]"
                                    :key="item"
                                    type="button"
                                    class="chip"
                                    @click="getProcessForm(endpoint.path)[field.key] = getProcessForm(endpoint.path)[field.key].filter((code: string) => code !== item)"
                                  >
                                    {{ instanceLabelMap.get(item) || item }}
                                    <span class="chip-remove">×</span>
                                  </button>
                                </div>
                              </div>
                              <ComboboxOptions class="combo-options">
                                <ComboboxOption
                                  v-for="option in filteredInstanceOptionsFor(getInstanceQuery(endpoint, field))"
                                  :key="option.value"
                                  :value="option.value"
                                  v-slot="{ active, selected }"
                                >
                                  <li class="combo-option" :class="{ active, selected }">
                                    <span>{{ option.label }}</span>
                                    <span v-if="selected" class="tag">Selected</span>
                                  </li>
                                </ComboboxOption>
                              </ComboboxOptions>
                            </div>
                          </Combobox>
                          <small class="help">Choose one or more available instances.</small>
                        </template>
                        <template v-else-if="isJsonFieldType(field)">
                          <textarea
                            v-model="getProcessForm(endpoint.path)[field.key]"
                            class="input"
                            rows="5"
                            style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                          />
                          <small class="help">Provide JSON for {{ field.type }} payloads.</small>
                        </template>
                        <template v-else>
                          <input
                            v-model="getProcessForm(endpoint.path)[field.key]"
                            class="input"
                            :type="resolveInputType(field)"
                          />
                        </template>
                      </div>
                      <div v-if="endpoint.name === 'addTerm'" class="help" style="margin-top: 0.35rem;">
                        Key is optional. When blank, it is derived from the label.
                      </div>
                    </template>

                    <template v-else-if="endpoint.name === 'removeTerm'">
                      <div class="field">
                        <label class="label">Term key</label>
                        <input
                          v-model="getProcessForm(endpoint.path).termKey"
                          class="input"
                          placeholder="term-key"
                        />
                      </div>
                    </template>

                    <template v-else-if="endpoint.name === 'attach' || endpoint.name === 'detach'">
                      <div class="field">
                        <label class="label">Record id (sub-id)</label>
                        <input v-model="getProcessForm(endpoint.path).recordId" class="input" placeholder="record sub-id" />
                      </div>
                      <div class="field">
                        <label class="label">Term key</label>
                        <input
                          v-model="getProcessForm(endpoint.path).termKey"
                          class="input"
                          placeholder="term-key"
                        />
                      </div>
                    </template>

                    <template v-else-if="endpoint.name === 'getRecordTerms'">
                      <div class="field">
                        <label class="label">Record id (sub-id)</label>
                        <input v-model="getProcessForm(endpoint.path).recordId" class="input" placeholder="record sub-id" />
                      </div>
                    </template>

                    <template v-else>
                      <div class="alert info">No inputs required for this process.</div>
                    </template>
                  </div>
                </template>

                <template v-else-if="isViewsGroup">
                  <div v-if="endpoint.name.toLowerCase().includes('count')" class="alert info">
                    View count endpoint. No inputs required.
                  </div>
                  <div v-else class="stack">
                    <div class="grid grid-2">
                      <div class="field">
                        <label class="label">Limit</label>
                        <input
                          v-model="getProcessForm(endpoint.path).limit"
                          class="input"
                          type="number"
                          placeholder="-1 for all"
                        />
                      </div>
                      <div class="field">
                        <label class="label">Start</label>
                        <input
                          v-model="getProcessForm(endpoint.path).start"
                          class="input"
                          type="number"
                          placeholder="-1 for default"
                        />
                      </div>
                    </div>
                    <div class="inset">
                      <div class="muted" style="margin-bottom: 0.35rem;">Query preview</div>
                      <pre class="code-block" style="margin: 0;">{{ buildViewQueryPreview(endpoint) }}</pre>
                    </div>
                  </div>
                </template>

                <template v-else-if="isCrudEndpoint(endpoint)">
                  <div v-if="endpoint.name === 'update' || endpoint.name === 'delete'" class="field">
                    <label class="label">
                      Record ID
                      <span class="tag" style="margin-left: 0.5rem;">Sub-id</span>
                    </label>
                    <input
                      v-model="getProcessForm(endpoint.path).recordId"
                      class="input"
                      placeholder="record sub-id (record.id)"
                    />
                  </div>

                  <div v-if="endpoint.name === 'update'" class="field">
                    <label class="label">Payload mode</label>
                    <div class="row">
                      <button
                        class="button small"
                        :class="{ primary: getProcessForm(endpoint.path).payloadMode === 'fields' }"
                        @click="getProcessForm(endpoint.path).payloadMode = 'fields'"
                      >
                        Fields
                      </button>
                      <button
                        class="button small"
                        :class="{ primary: getProcessForm(endpoint.path).payloadMode === 'json' }"
                        @click="getProcessForm(endpoint.path).payloadMode = 'json'"
                      >
                        JSON
                      </button>
                    </div>
                  </div>

                  <div
                    v-if="endpoint.name === 'update' && getProcessForm(endpoint.path).payloadMode === 'json'"
                    class="field"
                  >
                    <label class="label">Payload JSON</label>
                    <textarea
                      v-model="getProcessForm(endpoint.path).payloadJson"
                      class="input"
                      rows="6"
                      placeholder='{"field": "value"}'
                      style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                    />
                  </div>

                  <div
                    v-if="endpoint.name !== 'delete' && getProcessForm(endpoint.path).payloadMode !== 'json'"
                    class="stack"
                  >
                    <div v-if="!crudInputFields.length" class="alert info">
                      No payload fields defined for this model.
                    </div>
                    <div v-else v-for="field in crudInputFields" :key="field.key" class="field">
                      <label class="label">
                        {{ field.key }}
                        <span v-if="field.required" class="tag" style="margin-left: 0.5rem;">Required</span>
                      </label>
                      <template v-if="isInstanceField(field)">
                        <Combobox v-model="getProcessForm(endpoint.path)[field.key]" multiple>
                          <div class="combo">
                            <div class="combo-row">
                              <div class="combo-input">
                                <ComboboxInput
                                  class="input"
                                  :display-value="() => ''"
                                  placeholder="Type to add instance"
                                  @change="setInstanceQuery(endpoint, field, $event.target.value)"
                                />
                                <ComboboxButton class="button outline small">▾</ComboboxButton>
                              </div>
                              <div v-if="getProcessForm(endpoint.path)[field.key]?.length" class="combo-chips">
                                <button
                                  v-for="item in getProcessForm(endpoint.path)[field.key]"
                                  :key="item"
                                  type="button"
                                  class="chip"
                                  @click="getProcessForm(endpoint.path)[field.key] = getProcessForm(endpoint.path)[field.key].filter((code: string) => code !== item)"
                                >
                                  {{ instanceLabelMap.get(item) || item }}
                                  <span class="chip-remove">×</span>
                                </button>
                              </div>
                            </div>
                            <ComboboxOptions class="combo-options">
                              <ComboboxOption
                                v-for="option in filteredInstanceOptionsFor(getInstanceQuery(endpoint, field))"
                                :key="option.value"
                                :value="option.value"
                                v-slot="{ active, selected }"
                              >
                                <li class="combo-option" :class="{ active, selected }">
                                  <span>{{ option.label }}</span>
                                  <span v-if="selected" class="tag">Selected</span>
                                </li>
                              </ComboboxOption>
                            </ComboboxOptions>
                          </div>
                        </Combobox>
                        <small class="help">Choose one or more available instances.</small>
                      </template>
                      <template v-else-if="isJsonFieldType(field)">
                        <textarea
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          rows="5"
                          :placeholder="resolveInputPlaceholder(field)"
                          style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                        />
                        <small class="help">Provide JSON for {{ field.type }} payloads.</small>
                      </template>
                      <template v-else>
                        <input
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          :type="resolveInputType(field)"
                          :placeholder="resolveInputPlaceholder(field)"
                        />
                      </template>
                    </div>
                  </div>
                </template>

                <template v-else>
                  <div v-if="!payloadFieldsForEndpoint(endpoint).length" class="alert info">
                    No inputs required for this process.
                  </div>
                  <div v-else class="stack">
                    <div v-for="field in payloadFieldsForEndpoint(endpoint)" :key="field.key" class="field">
                      <label class="label">
                        {{ field.key }}
                        <span v-if="field.required" class="tag" style="margin-left: 0.5rem;">Required</span>
                      </label>
                      <template v-if="isInstanceField(field)">
                        <Combobox v-model="getProcessForm(endpoint.path)[field.key]" multiple>
                          <div class="combo">
                            <div class="combo-row">
                              <div class="combo-input">
                                <ComboboxInput
                                  class="input"
                                  :display-value="() => ''"
                                  placeholder="Type to add instance"
                                  @change="setInstanceQuery(endpoint, field, $event.target.value)"
                                />
                                <ComboboxButton class="button outline small">▾</ComboboxButton>
                              </div>
                              <div v-if="getProcessForm(endpoint.path)[field.key]?.length" class="combo-chips">
                                <button
                                  v-for="item in getProcessForm(endpoint.path)[field.key]"
                                  :key="item"
                                  type="button"
                                  class="chip"
                                  @click="getProcessForm(endpoint.path)[field.key] = getProcessForm(endpoint.path)[field.key].filter((code: string) => code !== item)"
                                >
                                  {{ instanceLabelMap.get(item) || item }}
                                  <span class="chip-remove">×</span>
                                </button>
                              </div>
                            </div>
                            <ComboboxOptions class="combo-options">
                              <ComboboxOption
                                v-for="option in filteredInstanceOptionsFor(getInstanceQuery(endpoint, field))"
                                :key="option.value"
                                :value="option.value"
                                v-slot="{ active, selected }"
                              >
                                <li class="combo-option" :class="{ active, selected }">
                                  <span>{{ option.label }}</span>
                                  <span v-if="selected" class="tag">Selected</span>
                                </li>
                              </ComboboxOption>
                            </ComboboxOptions>
                          </div>
                        </Combobox>
                        <small class="help">Choose one or more available instances.</small>
                      </template>
                      <template v-else-if="isJsonFieldType(field)">
                        <textarea
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          rows="5"
                          :placeholder="field.key.toLowerCase().includes('id') ? 'Record sub-id (record.id)' : ''"
                          style="font-family: 'SFMono-Regular', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;"
                        />
                        <small class="help">Provide JSON for {{ field.type }} payloads.</small>
                      </template>
                      <template v-else>
                        <input
                          v-model="getProcessForm(endpoint.path)[field.key]"
                          class="input"
                          :type="resolveInputType(field)"
                          :placeholder="field.key.toLowerCase().includes('id') ? 'Record sub-id (record.id)' : ''"
                        />
                      </template>
                    </div>
                  </div>
                </template>

                <div class="row" style="margin-top: 1rem;">
                  <button class="button" @click="populateProcessForm(endpoint)">Populate</button>
                  <button class="button" @click="resetProcessForm(endpoint)">Reset</button>
                  <button class="button outline" @click="copySnippet(endpoint)">Copy snippet</button>
                  <button v-if="isCrudEndpoint(endpoint)" class="button ghost" @click="openCodeFor(endpoint)">
                    Code
                  </button>
                  <button class="button primary" @click="runProcess(endpoint)">Run process</button>
                </div>
              </div>
            </details>
          </div>
        </main>

        <aside class="card console-panel">
          <div class="row console-controls">
            <button
              class="button small"
              :class="{ primary: consoleMode === 'console' }"
              @click="consoleMode = 'console'"
            >
              Console
            </button>
            <button
              class="button small"
              :class="{ primary: consoleMode === 'code' }"
              @click="consoleMode = 'code'"
            >
              Code
            </button>

            <template v-if="consoleMode === 'console'">
              <label class="toggle">
                <input v-model="autoClearConsole" type="checkbox" />
                <span>Clear before run</span>
              </label>
              <label class="toggle">
                <input v-model="autoScrollConsole" type="checkbox" />
                <span>Auto-scroll</span>
              </label>
              <label class="toggle">
                <input v-model="showFullResponse" type="checkbox" />
                <span>Full response</span>
              </label>
              <div class="row" style="align-items: center; gap: 0.35rem;">
                <button class="button outline small" type="button" @click="decreaseConsoleFont">-</button>
                <span class="tag">Font {{ consoleFontSize }}px</span>
                <button class="button outline small" type="button" @click="increaseConsoleFont">+</button>
              </div>
              <button class="button outline small" @click="clearConsole">Clear</button>
            </template>
          </div>

          <div v-if="consoleMode === 'code'" class="stack" style="margin-bottom: 0.75rem;">
            <div class="field">
              <label class="label">Process</label>
              <select v-model="codeSelection" class="select">
                <option value="all">All processes</option>
                <option v-for="endpoint in activeCodeProcesses" :key="endpoint.path" :value="endpoint.path">
                  {{ toTitle(endpoint.name) }}
                </option>
              </select>
            </div>
            <div class="row" style="gap: var(--space-3);">
              <label class="toggle" style="flex: 1;">
                <input v-model="includeRouterInCode" type="checkbox" />
                <span>Router functions</span>
              </label>
              <label class="toggle" style="flex: 1;">
                <input v-model="includeDefaultsInCode" type="checkbox" />
                <span>Include defaults in payload</span>
              </label>
            </div>
            <div v-if="includeRouterInCode" class="row" style="gap: var(--space-3);">
              <label class="toggle" style="flex: 1;">
                <input v-model="explicitSettingsInCode" type="checkbox" />
                <span>Explicit settings</span>
              </label>
              <label class="toggle" style="flex: 1;">
                <input v-model="includeInstancesInCode" type="checkbox" />
                <span>Include instances</span>
              </label>
            </div>
            <label v-if="includeRouterInCode && explicitSettingsInCode" class="toggle" style="width: 100%;">
              <input v-model="includeAllSettingsInCode" type="checkbox" />
              <span>Include all settings</span>
            </label>
          </div>

          <ApiConsolePanel
            v-if="consoleMode === 'console'"
            class="console-body"
            :logs="consoleLogs"
            :auto-scroll="autoScrollConsole"
            :font-size="consoleFontSize"
          />
          <div v-else class="console-body stack">
            <div v-if="!codeEndpoints.length" class="line">
              No CRUD processes available for this model.
            </div>
            <div v-for="endpoint in codeEndpoints" :key="endpoint.path" class="card" style="margin: 0;">
              <div class="spread">
                <strong>{{ toTitle(endpoint.name) }}</strong>
                <button class="button outline small" @click="copyCodeSnippet(endpoint)">Copy</button>
              </div>
              <pre class="code-block" style="margin-top: 0.5rem;">{{ buildCodeSnippet(endpoint) }}</pre>
            </div>
          </div>
        </aside>
      </section>
    </section>
  </div>
</template>
