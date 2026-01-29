<script setup lang="ts">
import { useSchemaSpec } from '~/composables/demo/useSchemaSpec'
import { useTrpcEndpoint } from '~/composables/demo/useTrpcEndpoint'
import { models } from '@schema/models'

definePageMeta({
  layout: 'demo',
  title: 'Model Detail',
})

const route = useRoute()
const router = useRouter()

const modelKey = computed(() => route.params.model as string)
const recordId = computed(() => route.params.id as string)

const { data: schemaSpec } = useSchemaSpec(modelKey)
const { data: modelsList } = await useFetch<any[]>('/api/schema/models')

const { processRecordForInstances, resolveRecordSubId } = useCRUD()
const { callEndpoint } = useTrpcEndpoint()

const instanceOptions = ['pm', 'uk', 'za', 'au', 'us', 'ca', 'ph']
const activeInstance = ref((route.query.instance as string) || 'pm')

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')

const form = reactive<Record<string, any>>({})

const currentModel = computed(() => {
  const list = modelsList.value || []
  return list.find((item: any) => item.modelKey === modelKey.value)
})

const isRemote = computed(() => {
  const entry = (models as any)[modelKey.value]
  return entry?.data === 'remote'
})

const hasTypesense = computed(() => Boolean(currentModel.value?.hasTypesense))

const taxonomies = computed(() => schemaSpec.value?.taxonomies ?? [])
const subTables = computed(() => schemaSpec.value?.subTables ?? [])

const fields = computed(() => schemaSpec.value?.fields ?? [])
const editableFields = computed(() => fields.value.filter((field) => !field.isId))

const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

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

const loadRecord = async () => {
  if (!schemaSpec.value) return
  loading.value = true
  errorMessage.value = ''

  try {
    const routerName = schemaSpec.value.routerName || modelKey.value
    let result: any
    try {
      result = await callEndpoint(`${routerName}.resource`, 'query', {
        data: { id: recordId.value, key: 'Admin' },
        instance: activeInstance.value,
      })
    } catch (error) {
      if (hasTypesense.value) {
        result = await callEndpoint(`${routerName}.typesense.resource`, 'query', {
          data: { id: recordId.value },
          instance: activeInstance.value,
        })
      } else {
        throw error
      }
    }

    const resolved = Array.isArray(result) ? result[0] : result
    if (!resolved) throw new Error('Record not found')

    fields.value.forEach((field) => {
      const value = (resolved as any)[field.key]
      form[field.key] = field.isArray && Array.isArray(value) ? value.join(', ') : value ?? ''
    })
    if (!form.instances && Array.isArray((resolved as any).instances)) {
      form.instances = (resolved as any).instances
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to load record'
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!schemaSpec.value) return
  saving.value = true
  errorMessage.value = ''

  try {
    const payload = buildPayload(editableFields.value)
    const instances = Array.isArray(payload.instances) && payload.instances.length
      ? payload.instances
      : [activeInstance.value]

    await processRecordForInstances({
      endpoint: `${schemaSpec.value.routerName}.update`,
      method: 'mutate',
      data: {
        id: resolveRecordSubId(recordId.value) ?? recordId.value,
        payload,
      },
      instances,
      options: { bypassMothership: isRemote.value },
    })

    await loadRecord()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Update failed'
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!schemaSpec.value) return
  if (!confirm(`Delete ${recordId.value}? This cannot be undone.`)) return
  try {
    await processRecordForInstances({
      endpoint: `${schemaSpec.value.routerName}.delete`,
      method: 'mutate',
      data: { id: resolveRecordSubId(recordId.value) ?? recordId.value },
      instances: [activeInstance.value],
      options: { bypassMothership: isRemote.value },
    })
    router.push(`/demo/${modelKey.value}`)
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Delete failed'
  }
}

watch(activeInstance, loadRecord)
watch(recordId, loadRecord)

onMounted(loadRecord)
</script>

<template>
  <div class="page stack" v-if="schemaSpec">
    <div class="surface demo-header">
      <div class="spread">
        <div>
          <h1>{{ currentModel?.label || schemaSpec.modelKey }}: {{ recordId }}</h1>
          <p class="muted">Dynamic record editor</p>
        </div>
        <div class="row">
          <button class="btn outline" type="button" @click="router.push(`/demo/${modelKey}`)">Back</button>
          <button class="btn danger" type="button" @click="handleDelete">Delete</button>
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
      </div>
    </div>

    <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

    <div v-if="loading" class="card">
      <p class="muted">Loading record…</p>
    </div>

    <div v-else class="grid grid-2">
      <div class="card stack">
        <h3>Fields</h3>
        <div class="grid grid-2">
          <label v-for="field in editableFields" :key="field.key" class="field">
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
          <button class="btn primary" type="button" @click="handleSave" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>

      <div class="stack">
        <TaxonomyPanel
          v-for="taxonomy in taxonomies"
          :key="taxonomy.key"
          :config="{
            modelKey: schemaSpec.routerName || schemaSpec.modelKey,
            tableModel: schemaSpec.table,
            taxonomyKey: taxonomy.key,
            label: taxonomy.labelPlural || taxonomy.labelSingular || taxonomy.key,
            description: taxonomy.description,
          }"
          :record-id="recordId"
          :instances="[activeInstance]"
          :bypass-mothership="isRemote"
        />

        <SubtableCrudPanel
          v-for="subtable in subTables"
          :key="subtable.routerName"
          :config="{
            title: subtable.label,
            description: `Subtable: ${subtable.model} (${subtable.tableType})`,
            routerKey: subtable.routerName,
            supports: {
              create: subtable.endpoints.includes('create'),
              update: subtable.endpoints.includes('update'),
              delete: subtable.endpoints.includes('delete'),
            },
            createFields: subtable.fields.filter((field) => !field.isId),
            updateFields: subtable.fields.filter((field) => !field.isId),
          }"
          :parent-id="recordId"
          :instances="[activeInstance]"
          :bypass-mothership="isRemote"
        />
      </div>
    </div>
  </div>
</template>
