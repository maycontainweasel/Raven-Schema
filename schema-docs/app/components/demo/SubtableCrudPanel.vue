<script setup lang="ts">

type FieldType = 'string' | 'number' | 'boolean'

type FieldConfig = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
}

type SubtableConfig = {
  title: string
  description?: string
  routerKey: string
  supports: {
    create?: boolean
    update?: boolean
    delete?: boolean
  }
  createFields: FieldConfig[]
  updateFields?: FieldConfig[]
}

type InstanceCode = string

const props = defineProps<{ config: SubtableConfig; parentId: string; instances: InstanceCode[]; bypassMothership: boolean }>()

const { processRecordForInstances, resolveRecordSubId } = useCRUD()

const errorMessage = ref('')
const creating = ref(false)
const updating = ref(false)
const deleting = ref(false)

const createForm = reactive<Record<string, any>>({ parentId: '' })
const updateForm = reactive<Record<string, any>>({ id: '' })
const deleteId = ref('')

const resolveDefault = (field: FieldConfig) => {
  if (field.type === 'number') return 0
  if (field.type === 'boolean') return false
  return ''
}

const initForms = () => {
  props.config.createFields.forEach((field) => {
    if (!(field.key in createForm)) createForm[field.key] = resolveDefault(field)
  })
  props.config.updateFields?.forEach((field) => {
    if (!(field.key in updateForm)) updateForm[field.key] = resolveDefault(field)
  })
}

const populateForm = () => {
  props.config.createFields.forEach((field) => {
    if (field.type === 'string') createForm[field.key] = `${field.key}-demo`
    if (field.type === 'number') createForm[field.key] = Math.floor(Math.random() * 10)
    if (field.type === 'boolean') createForm[field.key] = Math.random() > 0.5
  })
}

const handleCreate = async () => {
  if (!props.config.supports.create) return
  errorMessage.value = ''
  creating.value = true
  try {
    const missing = props.config.createFields.filter((field) => field.required && !createForm[field.key])
    if (missing.length > 0) {
      errorMessage.value = `Missing required fields: ${missing.map((field) => field.label).join(', ')}`
      creating.value = false
      return
    }
    const payload = { ...createForm, parentId: resolveRecordSubId(props.parentId) ?? props.parentId }
    await processRecordForInstances({
      endpoint: `${props.config.routerKey}.create`,
      method: 'mutate',
      data: payload,
      instances: props.instances,
      options: { bypassMothership: props.bypassMothership },
    })
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Create failed'
  } finally {
    creating.value = false
  }
}

const handleUpdate = async () => {
  if (!props.config.supports.update) return
  errorMessage.value = ''
  updating.value = true
  try {
    const payload = { ...updateForm }
    const id = resolveRecordSubId(payload.id) ?? payload.id
    const updatePayload = { ...payload }
    delete updatePayload.id
    await processRecordForInstances({
      endpoint: `${props.config.routerKey}.update`,
      method: 'mutate',
      data: { id, payload: updatePayload },
      instances: props.instances,
      options: { bypassMothership: props.bypassMothership },
    })
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Update failed'
  } finally {
    updating.value = false
  }
}

const handleDelete = async () => {
  if (!props.config.supports.delete) return
  errorMessage.value = ''
  deleting.value = true
  try {
    const id = resolveRecordSubId(deleteId.value) ?? deleteId.value
    await processRecordForInstances({
      endpoint: `${props.config.routerKey}.delete`,
      method: 'mutate',
      data: { id },
      instances: props.instances,
      options: { bypassMothership: props.bypassMothership },
    })
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Delete failed'
  } finally {
    deleting.value = false
  }
}

initForms()
watch(
  () => props.parentId,
  () => {
    const resolved = resolveRecordSubId(props.parentId) ?? props.parentId
    createForm.parentId = resolved
    if ('q' in createForm && !createForm.q) {
      createForm.q = resolved
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="card stack">
    <div>
      <h3>{{ config.title }}</h3>
      <p class="muted">{{ config.description }}</p>
    </div>

    <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

    <div v-if="config.supports.create" class="panel stack">
      <strong>Create</strong>
      <div class="stack">
        <label v-for="field in config.createFields" :key="field.key" class="field">
          <span class="label">{{ field.label }} <span v-if="field.required" class="error">*</span></span>
          <input
            v-if="field.type !== 'boolean'"
            v-model="createForm[field.key]"
            class="input"
            :type="field.type === 'number' ? 'number' : 'text'"
            :placeholder="field.placeholder"
          />
          <input v-else type="checkbox" v-model="createForm[field.key]" />
        </label>
        <div class="row">
          <button class="btn outline small" type="button" @click="populateForm">Populate</button>
          <button class="btn small" type="button" @click="handleCreate" :disabled="creating">
            {{ creating ? 'Creating…' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="config.supports.update" class="panel stack">
      <strong>Update</strong>
      <div class="stack">
        <label class="field">
          <span class="label">Record ID *</span>
          <input v-model="updateForm.id" class="input" />
        </label>
        <label v-for="field in config.updateFields || []" :key="field.key" class="field">
          <span class="label">{{ field.label }}</span>
          <input
            v-if="field.type !== 'boolean'"
            v-model="updateForm[field.key]"
            class="input"
            :type="field.type === 'number' ? 'number' : 'text'"
            :placeholder="field.placeholder"
          />
          <input v-else type="checkbox" v-model="updateForm[field.key]" />
        </label>
        <button class="btn small" type="button" @click="handleUpdate" :disabled="updating">
          {{ updating ? 'Updating…' : 'Update' }}
        </button>
      </div>
    </div>

    <div v-if="config.supports.delete" class="panel stack">
      <strong>Delete</strong>
      <label class="field">
        <span class="label">Record ID *</span>
        <input v-model="deleteId" class="input" />
      </label>
      <button class="btn danger small" type="button" @click="handleDelete" :disabled="deleting">
        {{ deleting ? 'Deleting…' : 'Delete' }}
      </button>
    </div>
  </div>
</template>
