<script setup lang="ts">
import { createControllers } from '~~/modules/schema-kit/runtime'
import { dbInstances, defaultDbInstance } from '@schema/db'
import { useSchemaSpec } from '~/composables/demo/useSchemaSpec'
import { useTrpcEndpoint } from '~/composables/demo/useTrpcEndpoint'

definePageMeta({
  layout: 'demo',
  title: 'Controller Tests',
})

type LogLevel = 'info' | 'success' | 'error' | 'warn'

type LogEntry = {
  id: string
  level: LogLevel
  message: string
  time: string
  data?: any
}

type Capability = {
  id: string
  group: string
  label: string
  description: string
  steps: string[]
  run: () => Promise<void>
}

const { data: modelsList } = await useFetch<any[]>('/api/schema/models')

const selectedModel = ref('')
watch(
  modelsList,
  (value) => {
    if (!selectedModel.value && value?.length) {
      const user = value.find((item: any) => item.modelKey === 'user')
      selectedModel.value = user?.modelKey ?? value[0].modelKey
    }
  },
  { immediate: true }
)

const { data: schemaSpec } = useSchemaSpec(selectedModel)
const controllers = createControllers()
const { callEndpoint } = useTrpcEndpoint()

const instanceKeys = computed(() => Object.keys(dbInstances || {}))
const defaultInstance = computed(() => {
  if (instanceKeys.value.includes('test')) return 'test'
  if (defaultDbInstance && instanceKeys.value.includes(defaultDbInstance)) return defaultDbInstance
  return instanceKeys.value[0] || 'pm'
})

const selectedInstance = ref('')
watchEffect(() => {
  if (!selectedInstance.value) selectedInstance.value = defaultInstance.value
})

const activeCapability = ref('delete')
const running = ref(false)
const armed = ref(false)
const logs = ref<LogEntry[]>([])
const rawMode = ref(true)
const allowRecordPlaceholders = ref(true)

const currentModel = computed(() => {
  const list = modelsList.value || []
  return list.find((item: any) => item.modelKey === selectedModel.value)
})

const isRemote = computed(() => currentModel.value?.data === 'remote')
const requiresConfirm = computed(() => selectedInstance.value && selectedInstance.value !== 'test')
const canRun = computed(() => Boolean(schemaSpec.value) && (!requiresConfirm.value || armed.value) && !running.value)

watch(selectedInstance, () => {
  armed.value = false
})

const toPascal = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const modelLabel = computed(() => schemaSpec.value?.modelKey ?? '')
const modelPascal = computed(() => toPascal(modelLabel.value))

const log = (level: LogLevel, message: string, data?: any) => {
  logs.value.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    message,
    time: new Date().toLocaleTimeString(),
    data,
  })
}

const clearLogs = () => {
  logs.value = []
}

const unwrapQueryResult = (value: any) => {
  if (Array.isArray(value)) {
    const first = value[0]
    return first?.result ?? first
  }
  return value
}

const dbFunctionCache = ref<Record<string, any> | null>(null)
const dbFunctionCacheInstance = ref('')

const queryDb = async (query: string, vars?: Record<string, any>) => {
  return callEndpoint('api.db.query', 'mutate', {
    data: { query, vars },
    instance: selectedInstance.value,
  })
}

const loadDbFunctions = async () => {
  if (dbFunctionCache.value && dbFunctionCacheInstance.value === selectedInstance.value) {
    return dbFunctionCache.value
  }

  const result = await queryDb('INFO FOR DB;')
  const info = unwrapQueryResult(result) ?? {}
  const functions =
    info?.functions ||
    info?.FUNCTIONS ||
    info?.function ||
    info?.Function ||
    info?.fn ||
    {}

  dbFunctionCache.value = functions || {}
  dbFunctionCacheInstance.value = selectedInstance.value
  return dbFunctionCache.value
}

const requireDbFunction = async (name: string) => {
  const functions = await loadDbFunctions()
  const normalized = name.startsWith('fn::') ? name : `fn::${name}`
  const exists = Boolean(functions?.[normalized] || functions?.[name])
  if (!exists) {
    throw new Error(`Missing database function ${normalized}`)
  }
}

const checkDbFunction = async (name: string) => {
  try {
    await requireDbFunction(name)
    log('success', `Found database function ${name}`)
    return true
  } catch (error: any) {
    log(rawMode.value ? 'warn' : 'error', error?.message ?? String(error))
    if (!rawMode.value) throw error
    return false
  }
}

const resolveRecordType = (field: any) => {
  const raw = String(field.typeRaw || '')
  const match = raw.match(/record<([^>]+)>/)
  return match ? match[1] : null
}

const randomToken = () => Math.random().toString(36).slice(2, 8)

class SkipTestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SkipTestError'
  }
}

const fixturesByModel: Record<string, Record<string, any>> = {}

const buildValueForField = (field: any) => {
  const key = String(field.key || '').toLowerCase()
  const token = randomToken()

  if (field.isArray) {
    if (key === 'instances') return [selectedInstance.value]
    return [`${key}-${token}-1`, `${key}-${token}-2`]
  }

  if (field.type === 'boolean') return true
  if (field.type === 'number') return Math.floor(Math.random() * 100) + 1

  if (key.includes('email')) return `qa-${token}@example.com`
  if (key.includes('password')) return `Pass-${token}`
  if (key.includes('name')) return `QA ${token}`
  if (key.includes('title')) return `QA ${token}`
  if (key.includes('status')) return 'draft'
  if (key.includes('date') || key.includes('time')) return new Date().toISOString()
  if (key.includes('key')) return `qa-${token}`

  const recordType = resolveRecordType(field)
  if (field.isRecord && recordType) return `${recordType}:${token}`

  return `sample-${key}-${token}`
}

const buildRequiredPayload = (
  fields: any[],
  fixtures: Record<string, any> = {},
  skipKeys: string[] = [],
  allowPlaceholders = false
) => {
  const payload: Record<string, any> = {}
  const missing: string[] = []
  const skip = new Set(skipKeys)
  for (const field of fields) {
    if (field.isId) continue
    if (!field.required) continue
    if (skip.has(field.key)) continue
    if (field.isRecord) {
      if (fixtures[field.key] !== undefined) {
        payload[field.key] = fixtures[field.key]
      } else if (allowPlaceholders) {
        payload[field.key] = buildValueForField(field)
      } else {
        missing.push(field.key)
      }
      continue
    }
    payload[field.key] = buildValueForField(field)
  }
  return { payload, missing }
}

const pickUpdateField = () => {
  const fields = schemaSpec.value?.fields || []
  return fields.find((field: any) => !field.isId && !field.isRecord) || fields.find((field: any) => !field.isId)
}

const buildUpdatePayload = (field: any, record: any) => {
  if (!field) return {}
  const payload: Record<string, any> = {}
  const current = record?.[field.key]

  if (field.isArray) {
    const base = Array.isArray(current) ? current : []
    payload[field.key] = [...base, buildValueForField(field)]
    return payload
  }

  if (field.type === 'number') {
    payload[field.key] = typeof current === 'number' ? current + 1 : Math.floor(Math.random() * 100) + 1
    return payload
  }

  if (field.type === 'boolean') {
    payload[field.key] = typeof current === 'boolean' ? !current : true
    return payload
  }

  payload[field.key] = `${current ?? field.key}-${randomToken()}`
  return payload
}

const buildSubtablePayload = (subtable: any) => {
  const modelFixtures = fixturesByModel[`${selectedModel.value}.${subtable.routerName}`]
    || fixturesByModel[selectedModel.value]
    || {}
  const skipKeys = [subtable.parent].filter(Boolean)
  return buildRequiredPayload(
    subtable.fields || [],
    modelFixtures,
    skipKeys,
    allowRecordPlaceholders.value || rawMode.value
  )
}

const normalizeEndpointKeys = (raw: any[] = []) => {
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry
      if (entry && typeof entry === 'object') {
        return Object.keys(entry)[0]
      }
      return null
    })
    .filter(Boolean) as string[]
}

const getController = () => {
  const routerName = schemaSpec.value?.routerName
  if (!routerName) return null
  return (controllers as any)[routerName] || (controllers as any)[selectedModel.value]
}

const buildOptions = () => ({
  instance: selectedInstance.value,
  rootInstance: selectedInstance.value,
  bypassMothership: isRemote.value,
})

const createRecord = async () => {
  const controller = getController()
  if (!controller) throw new Error('Controller not available')
  const modelFixtures = fixturesByModel[selectedModel.value] || {}
  const { payload, missing } = buildRequiredPayload(
    schemaSpec.value?.fields || [],
    modelFixtures,
    [],
    allowRecordPlaceholders.value || rawMode.value
  )
  if (missing.length) {
    throw new SkipTestError(`Missing required record fixtures: ${missing.join(', ')}`)
  }
  log('info', 'Create payload', payload)
  const record = await controller.create(payload, buildOptions())
  if (!record) throw new Error('Create returned no record')
  return record
}

const deleteRecord = async (record: any) => {
  const controller = getController()
  if (!controller) throw new Error('Controller not available')
  await controller.delete(record, buildOptions())
}

const verifyUserDeleteCleanup = async (record: any) => {
  const result = await queryDb(
    `LET $rid = fn::ridParam("u", $id);
RETURN {
  user: (SELECT * FROM $rid),
  profile: (SELECT * FROM uProfile WHERE id = type::record("uProfile", record::id($rid))),
  profileEdges: (SELECT * FROM UserProfile WHERE in = $rid),
  examDateEdges: (SELECT * FROM UserExamDate WHERE in = $rid)
};`,
    { id: record?.id ?? record }
  )

  const info = unwrapQueryResult(result)
  const hasUser = Array.isArray(info?.user) && info.user.length > 0
  const hasProfile = Array.isArray(info?.profile) && info.profile.length > 0
  const hasProfileEdges = Array.isArray(info?.profileEdges) && info.profileEdges.length > 0
  const hasExamEdges = Array.isArray(info?.examDateEdges) && info.examDateEdges.length > 0

  if (hasUser || hasProfile || hasProfileEdges || hasExamEdges) {
    throw new Error('Delete cleanup failed for user relationships')
  }
}

const runCreateTest = async () => {
  await checkDbFunction(`fn::create${modelPascal.value}`)

  const record = await createRecord()
  log('success', 'Create succeeded', record)

  if (!rawMode.value) {
    await checkAutoCreateSubtables(record)
  }

  await deleteRecord(record)
  log('success', 'Cleanup delete succeeded')
}

const runUpdateTest = async () => {
  await checkDbFunction(`fn::update${modelPascal.value}`)

  const record = await createRecord()
  const field = pickUpdateField()
  if (!field) throw new Error('No updateable field found')

  const payload = buildUpdatePayload(field, record)
  log('info', `Updating ${field.key}`, payload)

  const controller = getController()
  if (!controller) throw new Error('Controller not available')
  const updated = await controller.update(record, payload, buildOptions())
  if (!updated) throw new Error('Update returned no record')

  if (!rawMode.value) {
    const expected = payload[field.key]
    if (expected !== undefined && updated?.[field.key] !== expected) {
      throw new Error(`Update did not persist ${field.key}`)
    }
  }

  log('success', 'Update succeeded', updated)

  await deleteRecord(record)
  log('success', 'Cleanup delete succeeded')
}

const runResourceTest = async () => {
  const resources = schemaSpec.value?.resources || []
  if (resources.length === 0) {
    log('warn', 'No resources configured for this model')
    return
  }

  const record = await createRecord()
  const controller = getController()
  if (!controller) throw new Error('Controller not available')

  for (const resource of resources) {
    log('info', `Fetching resource ${resource}`)
    const response = await controller.get(record, resource, buildOptions())
    if (!response) throw new Error(`Resource ${resource} returned no data`)
    log('success', `Resource ${resource} ok`, response)
  }

  await deleteRecord(record)
  log('success', 'Cleanup delete succeeded')
}

const checkAutoCreateSubtables = async (record: any) => {
  const subtables = schemaSpec.value?.subTables || []
  const autoCreateTables = subtables.filter(
    (table: any) => table.autoCreate || table.tableType === 'subsingle'
  )
  if (autoCreateTables.length === 0) return

  const controller = getController()
  if (!controller) throw new Error('Controller not available')

  for (const subtable of autoCreateTables) {
    const endpoints = normalizeEndpointKeys(Array.isArray(subtable.endpoints) ? subtable.endpoints : [])
    if (!endpoints.includes('list')) {
      log('warn', `Auto-create check skipped for ${subtable.routerName} (list endpoint missing)`)
      continue
    }
    const sub = controller.subtable(subtable.routerName)
    try {
      const list = await sub.list(record, { start: 0, limit: 5 }, buildOptions())
      const items = Array.isArray(list) ? list : list ? [list] : []
      if (items.length === 0) {
        throw new Error(`Auto-create subtable ${subtable.routerName} did not return records`)
      }
      log('success', `Auto-create subtable ${subtable.routerName} ok`, items[0])
    } catch (error: any) {
      throw new Error(`Auto-create subtable ${subtable.routerName} failed: ${error?.message ?? String(error)}`)
    }
  }
}

const runSubtableTest = async (subtable: any) => {
  const controller = getController()
  if (!controller) throw new Error('Controller not available')

  const endpoints = normalizeEndpointKeys(Array.isArray(subtable.endpoints) ? subtable.endpoints : [])
  if (!endpoints.includes('create')) {
    throw new SkipTestError(`Subtable ${subtable.routerName} create not enabled`)
  }

  const record = await createRecord()
  const sub = controller.subtable(subtable.routerName)

  const { payload, missing } = buildSubtablePayload(subtable)
  if (missing.length) {
    throw new SkipTestError(`Missing subtable fixtures: ${missing.join(', ')}`)
  }

  log('info', `Subtable ${subtable.routerName} payload`, payload)
  const created = await sub.create(record, payload, buildOptions())
  if (!created) throw new Error(`Subtable ${subtable.routerName} create returned no record`)

  const updateField = (subtable.fields || []).find((field: any) => !field.isId && !field.isRecord)
    || (subtable.fields || []).find((field: any) => !field.isId)
  if (updateField && endpoints.includes('update')) {
    const updatePayload = buildUpdatePayload(updateField, created)
    await sub.update(created, updatePayload, buildOptions())
    log('success', `Subtable ${subtable.routerName} updated`, updatePayload)
  }

  if (endpoints.includes('get')) {
    const fetched = await sub.get(created, buildOptions())
    if (!fetched) throw new Error(`Subtable ${subtable.routerName} get returned no record`)
    log('success', `Subtable ${subtable.routerName} get ok`, fetched)
  }

  if (endpoints.includes('list')) {
    const list = await sub.list(record, { start: 0, limit: 10 }, buildOptions())
    log('success', `Subtable ${subtable.routerName} list ok`, list)
  }

  if (endpoints.includes('delete')) {
    await sub.delete(created, buildOptions())
    log('success', `Subtable ${subtable.routerName} delete ok`)
  }

  await deleteRecord(record)
  log('success', 'Cleanup delete succeeded')
}

const runTaxonomyTest = async (taxonomy: any) => {
  const controller = getController()
  if (!controller) throw new Error('Controller not available')
  const record = await createRecord()

  const taxonomyController = controller.taxonomy(taxonomy.key)
  const token = randomToken()
  const normalizeTermResult = (value: any) => (Array.isArray(value) ? value[0] : value)

  log('info', `Creating taxonomy ${taxonomy.key}`)
  await taxonomyController.createTaxonomy({}, buildOptions())

  let parentTerm: any = null
  if (taxonomy.hierarchical) {
    const parentPayload = {
      key: `${taxonomy.key}-parent-${token}`,
      label: `Parent ${token}`,
    }
    parentTerm = normalizeTermResult(await taxonomyController.addTerm(parentPayload, buildOptions()))
  }

  const termPayload: Record<string, any> = {
    key: `${taxonomy.key}-term-${token}`,
    label: `Term ${token}`,
  }
  if (taxonomy.hierarchical && parentTerm) {
    termPayload.parent = parentTerm.key || parentTerm.id || parentTerm.slug
  }

  const term = normalizeTermResult(await taxonomyController.addTerm(termPayload, buildOptions()))
  const termRef = term || termPayload

  await taxonomyController.attach(record, termRef, buildOptions())
  log('success', `Attached term to ${taxonomy.key}`)

  const recordTerms = await taxonomyController.getRecordTerms(record, buildOptions())
  log('success', `Record terms for ${taxonomy.key}`, recordTerms)

  await taxonomyController.detach(record, termRef, buildOptions())
  log('success', `Detached term from ${taxonomy.key}`)

  await taxonomyController.removeTerm(termRef, buildOptions())
  log('success', `Removed term from ${taxonomy.key}`)

  await deleteRecord(record)
  log('success', 'Cleanup delete succeeded')
}

const runDeleteTest = async () => {
  await checkDbFunction(`fn::delete${modelPascal.value}`)

  const record = await createRecord()
  await deleteRecord(record)
  log('success', 'Delete succeeded')

  if (!rawMode.value && selectedModel.value === 'user') {
    await verifyUserDeleteCleanup(record)
    log('success', 'User relationships cleaned')
  }
}

const capabilities = computed<Capability[]>(() => {
  if (!schemaSpec.value) return []

  const list: Capability[] = []

  list.push({
    id: 'create',
    group: 'CRUD',
    label: 'Create',
    description: 'Create a record with required fields.',
    steps: [
      `Check database has fn::create${modelPascal.value}`,
      'Build payload from required fields',
      'Call controller.create',
      'Verify auto-create subtables',
      'Delete record for cleanup',
    ],
    run: runCreateTest,
  })

  list.push({
    id: 'update',
    group: 'CRUD',
    label: 'Update',
    description: 'Update a single field and confirm it changes.',
    steps: [
      `Check database has fn::update${modelPascal.value}`,
      'Create record',
      'Call controller.update with one field',
      'Verify updated field',
      'Delete record for cleanup',
    ],
    run: runUpdateTest,
  })

  if (schemaSpec.value.resources?.length) {
    list.push({
      id: 'resources',
      group: 'Resources',
      label: 'Resources',
      description: 'Fetch resource views for a record.',
      steps: [
        'Create record',
        'Call controller.get for each resource',
        'Verify response shape',
        'Delete record for cleanup',
      ],
      run: runResourceTest,
    })
  }

  list.push({
    id: 'delete',
    group: 'CRUD',
    label: 'Delete',
    description: 'Delete record and verify cleanup.',
    steps: [
      `Check database has fn::delete${modelPascal.value}`,
      'Create record',
      'Call controller.delete',
      'Verify relationships cleanup',
    ],
    run: runDeleteTest,
  })

  const taxonomies = schemaSpec.value.taxonomies || []
  taxonomies.forEach((taxonomy: any) => {
    list.push({
      id: `taxonomy:${taxonomy.key}`,
      group: 'Taxonomies',
      label: `Taxonomy: ${taxonomy.key}`,
      description: taxonomy.description || 'Attach/detach taxonomy terms.',
      steps: [
        'Create record',
        'Create taxonomy (if needed)',
        'Add term',
        'Attach term to record',
        'Fetch record terms',
        'Detach term',
        'Remove term',
        'Delete record for cleanup',
      ],
      run: () => runTaxonomyTest(taxonomy),
    })
  })

  const subtables = schemaSpec.value.subTables || []
  subtables.forEach((subtable: any) => {
    list.push({
      id: `subtable:${subtable.routerName}`,
      group: 'Subtables',
      label: `Subtable: ${subtable.routerName}`,
      description: subtable.label || 'Create/list/update/delete subtable records.',
      steps: [
        'Create parent record',
        'Create subtable record',
        'Update subtable record',
        'Fetch subtable record',
        'List subtable records',
        'Delete subtable record',
        'Delete parent record',
      ],
      run: () => runSubtableTest(subtable),
    })
  })

  return list
})

const capabilityGroups = computed(() => {
  const groups = new Map<string, Capability[]>()
  capabilities.value.forEach((capability) => {
    if (!groups.has(capability.group)) {
      groups.set(capability.group, [])
    }
    groups.get(capability.group)?.push(capability)
  })
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
})

watch(capabilities, (value) => {
  if (!value.find((item) => item.id === activeCapability.value)) {
    activeCapability.value = value[0]?.id ?? 'create'
  }
})

watch(activeCapability, () => {
  clearLogs()
})

watch(selectedModel, () => {
  clearLogs()
})

watch(selectedInstance, () => {
  clearLogs()
})

watch([rawMode, allowRecordPlaceholders], () => {
  clearLogs()
})

const activeCapabilityConfig = computed(() => {
  return capabilities.value.find((item) => item.id === activeCapability.value) || null
})

const executeCapability = async (capability: Capability) => {
  try {
    await capability.run()
  } catch (error: any) {
    if (error?.name === 'SkipTestError') {
      log('warn', error?.message ?? String(error))
      return
    }
    log('error', error?.message ?? String(error), error)
  }
}

const runCapability = async (capability?: Capability) => {
  if (!capability || !canRun.value) return
  running.value = true
  try {
    await executeCapability(capability)
  } finally {
    running.value = false
  }
}

const runAll = async () => {
  if (!canRun.value) return
  running.value = true
  try {
    for (const capability of capabilities.value) {
      await executeCapability(capability)
    }
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="page stack">
    <div class="surface page-hero">
      <div class="stack">
        <div class="badge">Controller Tests</div>
        <h1>Schema Kit Controller Test Console</h1>
        <p class="muted">
          Select a model, choose a capability, and run the controller checks. Each test creates data and cleans up.
        </p>
      </div>
    </div>

    <div class="card stack">
      <div class="grid grid-3">
        <label class="field">
          <span class="label">Model</span>
          <select v-model="selectedModel" class="select">
            <option v-for="model in modelsList || []" :key="model.modelKey" :value="model.modelKey">
              {{ model.label }} ({{ model.modelKey }})
            </option>
          </select>
        </label>
        <label class="field">
          <span class="label">Instance</span>
          <select v-model="selectedInstance" class="select">
            <option v-for="instance in instanceKeys" :key="instance" :value="instance">
              {{ instance.toUpperCase() }}
            </option>
          </select>
        </label>
        <div class="field">
          <span class="label">Actions</span>
          <div class="row">
            <button class="btn primary" :disabled="!canRun" @click="runAll">Run all</button>
            <button class="btn outline" :disabled="running" @click="clearLogs">Clear log</button>
          </div>
          <div class="row" style="margin-top: var(--space-2); flex-wrap: wrap;">
            <label class="row">
              <input type="checkbox" v-model="rawMode" />
              <span>Simple mode (skip strict checks)</span>
            </label>
            <label class="row">
              <input type="checkbox" v-model="allowRecordPlaceholders" />
              <span>Allow record placeholders</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="requiresConfirm" class="alert warning">
        Warning: running against <strong>{{ selectedInstance }}</strong> will create, update, and delete data.
      </div>
      <label v-if="requiresConfirm" class="row">
        <input type="checkbox" v-model="armed" />
        <span>I understand these tests are destructive.</span>
      </label>
    </div>

    <div class="grid grid-3">
      <div class="card stack">
        <div class="spread">
          <h3>Capabilities</h3>
          <span class="tag tag-muted">{{ modelLabel }}</span>
        </div>
        <div class="stack">
          <div v-for="group in capabilityGroups" :key="group.label" class="stack" style="gap: var(--space-2);">
            <div class="muted" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em;">
              {{ group.label }}
            </div>
            <button
              v-for="capability in group.items"
              :key="capability.id"
              class="btn"
              :class="{ primary: capability.id === activeCapability }"
              @click="activeCapability = capability.id"
            >
              {{ capability.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="card stack">
        <div class="spread">
          <div>
            <h3>{{ activeCapabilityConfig?.label || 'Select a capability' }}</h3>
            <p class="muted">{{ activeCapabilityConfig?.description }}</p>
          </div>
          <button
            class="btn primary"
            :disabled="!canRun || !activeCapabilityConfig"
            @click="runCapability(activeCapabilityConfig || undefined)"
          >
            {{ running ? 'Running…' : 'Run test' }}
          </button>
        </div>

        <div v-if="rawMode" class="alert warning">
          Simple mode is on: database function checks are warnings and strict validations are skipped.
        </div>

        <div class="panel" v-if="activeCapabilityConfig">
          <strong>Steps</strong>
          <ol>
            <li v-for="step in activeCapabilityConfig.steps" :key="step">{{ step }}</li>
          </ol>
        </div>

        <div v-else class="muted">Select a capability to view details.</div>
      </div>

      <div class="card stack">
        <div class="spread">
          <h3>Console</h3>
          <span class="tag tag-muted">{{ logs.length }} entries</span>
        </div>

        <div v-if="logs.length === 0" class="muted">No output yet.</div>

        <div v-else class="stack">
          <div v-for="entry in logs" :key="entry.id" class="inset">
            <div class="spread">
              <strong>{{ entry.time }}</strong>
              <span
                class="badge"
                :class="{
                  success: entry.level === 'success',
                  danger: entry.level === 'error',
                  warning: entry.level === 'warn',
                  info: entry.level === 'info',
                }"
              >
                {{ entry.level }}
              </span>
            </div>
            <div class="muted">{{ entry.message }}</div>
            <pre v-if="entry.data">{{ JSON.stringify(entry.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
