<script setup lang="ts">
import { useSchemaSpec } from '~/composables/demo/useSchemaSpec'
import { models } from '@schema/models'
import { useTrpcEndpoint } from '~/composables/demo/useTrpcEndpoint'

definePageMeta({
  layout: 'demo',
  title: 'Model Demo',
})

const route = useRoute()
const modelKey = computed(() => route.params.model as string)

const { data: schemaSpec } = useSchemaSpec(modelKey)
const { data: modelsList } = await useFetch<any[]>('/api/schema/models')

const typesense = useTypesense()
const typesenseSearch = useTypesenseSearch()
const { processRecordForInstances, updateTypesenseForRecord } = useCRUD()
const { callEndpoint } = useTrpcEndpoint()

const instanceOptions = ['pm', 'uk', 'za', 'au', 'us', 'ca', 'ph']

const activeInstance = ref('pm')
const searchQuery = ref('')
const results = ref<any[]>([])
const totalResults = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const refreshCount = ref(50)
const refreshClear = ref(false)

const createOpen = ref(false)
const creating = ref(false)
const form = reactive<Record<string, any>>({})

const currentModel = computed(() => {
  const list = modelsList.value || []
  return list.find((item: any) => item.modelKey === modelKey.value)
})

const hasTypesense = computed(() => Boolean(currentModel.value?.hasTypesense))
const typesenseKey = computed(() => currentModel.value?.typesenseCollection || modelKey.value)

const isRemote = computed(() => {
  const entry = (models as any)[modelKey.value]
  return entry?.data === 'remote'
})

const routeKey = computed(() => currentModel.value?.routeKey || 'id')

const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const randomToken = () => Math.random().toString(36).slice(2, 8)

const resolveRecordType = (field: any) => {
  const raw = String(field.typeRaw || '')
  const match = raw.match(/record<([^>]+)>/)
  return match ? match[1] : null
}

const populateValue = (field: any) => {
  const key = String(field.key || '').toLowerCase()
  const token = randomToken()

  if (field.isArray) {
    if (key === 'instances') return activeInstance.value
    return `${key}-${token}-1, ${key}-${token}-2`
  }

  if (field.type === 'boolean') return true
  if (field.type === 'number') return Math.floor(Math.random() * 100) + 1

  if (key.includes('email')) return `demo-${token}@example.com`
  if (key.includes('password')) return `pass-${token}`
  if (key.includes('name')) return `Demo ${token}`
  if (key.includes('title')) return `Demo ${token}`
  if (key.includes('status')) return 'draft'
  if (key.includes('date') || key.includes('time')) return new Date().toISOString()
  if (key.includes('key')) return `demo-${token}`

  const recordType = resolveRecordType(field)
  if (field.isRecord && recordType) return `${recordType}-sample-${token}`

  return `sample-${key}-${token}`
}

const populateForm = () => {
  if (!schemaSpec.value) return
  schemaSpec.value.fields
    .filter((field) => !field.isId)
    .forEach((field) => {
      form[field.key] = populateValue(field)
    })
}

const resetForm = () => {
  if (!schemaSpec.value) return
  schemaSpec.value.fields
    .filter((field) => !field.isId)
    .forEach((field) => {
      form[field.key] = field.type === 'boolean' ? false : ''
    })
}

const coerceFieldValue = (field: any, value: any) => {
  if (field.isArray) {
    if (Array.isArray(value)) return value
    if (typeof value === 'string') return parseList(value)
    return []
  }
  if (field.type === 'number') {
    const num = Number(value)
    return Number.isNaN(num) ? undefined : num
  }
  if (field.type === 'boolean') {
    return Boolean(value)
  }
  return value
}

const buildPayload = (fieldsList: any[]) => {
  const payload: Record<string, any> = {}
  fieldsList.forEach((field) => {
    const raw = form[field.key]
    if (raw === '' || raw === undefined) return
    payload[field.key] = coerceFieldValue(field, raw)
  })
  return payload
}

const loadTypesense = async () => {
  if (!hasTypesense.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const queryBy = typesenseSearch.getQueryByFields(typesenseKey.value, [])
    const response = await typesenseSearch.searchCollection(typesenseKey.value, {
      q: searchQuery.value.trim() || '*',
      query_by: queryBy.join(','),
      per_page: 50,
      page: 1,
    })
    const hits = Array.isArray(response?.hits)
      ? response.hits.map((hit: any) => hit.document)
      : []
    results.value = hits
    totalResults.value = response?.found ?? hits.length
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to load records'
  } finally {
    loading.value = false
  }
}

const handleRefresh = async () => {
  if (!hasTypesense.value || !schemaSpec.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    if (refreshClear.value) {
      await typesense.clearCollection(typesenseKey.value)
    } else {
      await typesense.ensureCollection(typesenseKey.value)
    }

    const routerName = schemaSpec.value.routerName || modelKey.value
    const result = await callEndpoint(`${routerName}.typesense.list`, 'query', {
      data: {
        limit: refreshCount.value,
        start: 0,
      },
      instance: activeInstance.value,
    })

    const records = Array.isArray(result) ? result : []
    if (records.length) {
      await typesense.upsertDocuments(typesenseKey.value, records, 'upsert')
    }

    await loadTypesense()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to refresh Typesense'
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!schemaSpec.value) return
  errorMessage.value = ''
  creating.value = true
  try {
    const payload = buildPayload((schemaSpec.value.fields || []).filter((field) => !field.isId))
    const instances = Array.isArray(payload.instances) && payload.instances.length ? payload.instances : [activeInstance.value]

    const result = await processRecordForInstances({
      endpoint: `${schemaSpec.value.routerName}.create`,
      method: 'mutate',
      data: payload,
      instances,
      options: { bypassMothership: isRemote.value },
    })

    if (result.record) {
      await updateTypesenseForRecord({
        collectionId: typesenseKey.value,
        record: result.record,
        instances,
        bypassMothership: isRemote.value,
      })
    }

    createOpen.value = false
    await loadTypesense()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Create failed'
  } finally {
    creating.value = false
  }
}

watch(modelKey, () => loadTypesense())
watch(activeInstance, () => loadTypesense())

onMounted(loadTypesense)
</script>

<template>
  <div class="page stack" v-if="schemaSpec">
    <div class="surface demo-header">
      <div class="spread">
        <div>
          <h1>{{ currentModel?.label || schemaSpec.modelKey }}</h1>
          <p class="muted">Dynamic overview for {{ schemaSpec.routerName }}</p>
        </div>
        <div class="row">
          <button v-if="hasTypesense" class="btn outline" type="button" @click="handleRefresh" :disabled="loading">
            {{ loading ? 'Refreshing…' : 'Refresh Typesense' }}
          </button>
          <button class="btn primary" type="button" @click="createOpen = true">Create record</button>
        </div>
      </div>

      <div class="row demo-controls">
        <div class="field" style="min-width: 200px">
          <label>Instance</label>
          <select v-model="activeInstance" class="select">
            <option v-for="instance in instanceOptions" :key="instance" :value="instance">
              {{ instance.toUpperCase() }}
            </option>
          </select>
        </div>
        <div class="field" style="flex: 1" v-if="hasTypesense">
          <label>Search</label>
          <input v-model="searchQuery" class="input" placeholder="Search" @input="loadTypesense" />
        </div>
        <div class="field" style="min-width: 160px" v-if="hasTypesense">
          <label>Refresh count</label>
          <input v-model.number="refreshCount" type="number" class="input" min="1" max="500" />
        </div>
        <label class="row" style="align-self: flex-end" v-if="hasTypesense">
          <input type="checkbox" v-model="refreshClear" />
          <span class="muted">Reset collection</span>
        </label>
      </div>
    </div>

    <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

    <div class="card" v-if="loading">
      <p class="muted">Loading records…</p>
    </div>

    <div v-else class="card" v-if="hasTypesense">
      <div class="spread" style="margin-bottom: var(--space-3)">
        <p class="muted">Showing {{ results.length }} of {{ totalResults }} records</p>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Preview</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in results" :key="record.id">
            <td>{{ record[routeKey] ?? record.id }}</td>
            <td>{{ record.title || record.label || record.name || record.question || record.email || '—' }}</td>
            <td class="text-right">
              <NuxtLink
                :to="`/demo/${schemaSpec.modelKey}/${encodeURIComponent(String(record[routeKey] ?? record.id))}?instance=${activeInstance}`"
                class="btn small outline"
              >
                View
              </NuxtLink>
            </td>
          </tr>
          <tr v-if="results.length === 0">
            <td colspan="3" class="muted">No records found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="createOpen" class="demo-modal">
      <div class="card demo-modal-card stack">
        <div class="spread">
          <h3>Create record</h3>
          <button class="btn ghost" type="button" @click="createOpen = false">Close</button>
        </div>

        <div class="grid grid-2">
          <label v-for="field in schemaSpec.fields.filter((item) => !item.isId)" :key="field.key" class="field">
            <span class="label">
              {{ field.label }}
              <span v-if="field.required" class="error">*</span>
            </span>
            <input
              v-if="field.type !== 'boolean'"
              v-model="form[field.key]"
              class="input"
              :type="field.type === 'number' ? 'number' : 'text'"
              :placeholder="field.typeRaw"
            />
            <input v-else type="checkbox" v-model="form[field.key]" />
          </label>
        </div>

        <div class="row">
          <button class="btn outline" type="button" @click="populateForm">Populate</button>
          <button class="btn outline" type="button" @click="resetForm">Reset</button>
          <button class="btn primary" type="button" @click="handleCreate" :disabled="creating">
            {{ creating ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
