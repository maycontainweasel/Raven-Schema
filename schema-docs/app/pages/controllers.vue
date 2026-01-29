<script setup lang="ts">
import { createControllers } from '~~/modules/schema-kit/runtime'
import { dbInstances, defaultDbInstance } from '@schema/db'

definePageMeta({
  layout: 'demo',
  title: 'Controllers',
})

type LogLevel = 'info' | 'success' | 'warn' | 'error'

type LogEntry = {
  id: string
  level: LogLevel
  message: string
  time: string
  data?: any
}

const controllers = createControllers()

const modelOptions = [
  { value: 'user', label: 'User' },
]

const selectedModel = ref('user')
const instanceOptions = computed(() => Object.keys(dbInstances || {}))
const selectedInstance = ref(defaultDbInstance ?? 'pm')
const bypassMothership = ref(false)
const resourceKey = ref('Admin')

const logs = ref<LogEntry[]>([])
const lastResponse = ref<any>(null)
const lastRecord = ref<any>(null)
const lastRecordId = ref<string>('')

const createForm = reactive({
  email: '',
  password: '',
  firstName: '',
  surname: '',
  role: 'student',
})

const updateForm = reactive({
  firstName: '',
  surname: '',
})

const { resolveRecordSubId } = useCRUD()

const controller = computed(() => {
  return (controllers as any)[selectedModel.value] ?? null
})

const log = (level: LogLevel, message: string, data?: any) => {
  logs.value.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    message,
    time: new Date().toLocaleTimeString(),
    data,
  })
}

const resetLogs = () => {
  logs.value = []
}

const resetState = () => {
  lastResponse.value = null
  lastRecord.value = null
  lastRecordId.value = ''
}

const randomToken = () => Math.random().toString(36).slice(2, 8)

const fillDemo = () => {
  const token = randomToken()
  createForm.email = `qa-${token}@example.com`
  createForm.password = `Pass-${token}`
  createForm.firstName = `QA ${token}`
  createForm.surname = `User ${token}`
  createForm.role = 'student'
  updateForm.firstName = `QA ${token} Updated`
  updateForm.surname = `User ${token} Updated`
}

const resolveId = (value: any) => {
  if (!value) return ''
  const resolved = resolveRecordSubId(value)
  if (resolved) return String(resolved)
  const idValue = (value as any)?.id
  const resolvedFromId = resolveRecordSubId(idValue)
  if (resolvedFromId) return String(resolvedFromId)
  if (typeof idValue === 'string' || typeof idValue === 'number') return String(idValue)
  if (idValue && typeof idValue === 'object' && 'id' in idValue) return String(idValue.id)
  if ((value as any)?.email) return String((value as any).email)
  return ''
}

const buildOptions = () => ({
  instances: [selectedInstance.value],
  bypassMothership: bypassMothership.value,
})

const handleCreate = async () => {
  if (!controller.value) {
    log('error', 'Controller not available')
    return
  }
  const payload = { ...createForm }
  try {
    log('info', 'Create payload', payload)
    const record = await controller.value.create(payload, buildOptions())
    lastResponse.value = record
    lastRecord.value = record
    lastRecordId.value = resolveId(record)
    log('success', 'Create result', record)
  } catch (error: any) {
    lastResponse.value = error
    log('error', error?.message ?? 'Create failed', error)
  }
}

const handleUpdate = async () => {
  if (!controller.value) {
    log('error', 'Controller not available')
    return
  }
  if (!lastRecordId.value) {
    log('warn', 'No record id available. Create a record first.')
    return
  }
  const payload = Object.fromEntries(
    Object.entries(updateForm).filter(([, value]) => value !== '' && value !== undefined)
  )
  try {
    log('info', `Update ${lastRecordId.value}`, payload)
    const record = await controller.value.update(lastRecordId.value, payload, buildOptions())
    lastResponse.value = record
    lastRecord.value = record ?? lastRecord.value
    log('success', 'Update result', record)
  } catch (error: any) {
    lastResponse.value = error
    log('error', error?.message ?? 'Update failed', error)
  }
}

const handleGet = async () => {
  if (!controller.value) {
    log('error', 'Controller not available')
    return
  }
  if (!lastRecordId.value) {
    log('warn', 'No record id available. Create a record first.')
    return
  }
  try {
    log('info', `Get ${resourceKey.value}`, { id: lastRecordId.value })
    const record = await controller.value.get(lastRecordId.value, resourceKey.value, buildOptions())
    lastResponse.value = record
    log('success', 'Get result', record)
  } catch (error: any) {
    lastResponse.value = error
    log('error', error?.message ?? 'Get failed', error)
  }
}

const handleDelete = async () => {
  if (!controller.value) {
    log('error', 'Controller not available')
    return
  }
  if (!lastRecordId.value) {
    log('warn', 'No record id available. Create a record first.')
    return
  }
  try {
    log('info', `Delete ${lastRecordId.value}`)
    const record = await controller.value.delete(lastRecordId.value, buildOptions())
    lastResponse.value = record
    log('success', 'Delete result', record)
    resetState()
  } catch (error: any) {
    lastResponse.value = error
    log('error', error?.message ?? 'Delete failed', error)
  }
}

const runRecipe = async () => {
  resetLogs()
  await handleCreate()
  await handleUpdate()
  await handleGet()
  await handleDelete()
}
</script>

<template>
  <div class="page stack">
    <div class="surface page-hero">
      <div class="stack">
        <div class="badge">Controllers</div>
        <h1>Controller CRUD Recipe</h1>
        <p class="muted">
          Minimal recipe to verify create, update, get, and delete for a generated controller.
        </p>
      </div>
    </div>

    <div class="card stack">
      <div class="grid grid-3">
        <label class="field">
          <span class="label">Model</span>
          <select v-model="selectedModel" class="select">
            <option v-for="model in modelOptions" :key="model.value" :value="model.value">
              {{ model.label }}
            </option>
          </select>
        </label>
        <label class="field">
          <span class="label">Instance</span>
          <select v-model="selectedInstance" class="select">
            <option v-for="instance in instanceOptions" :key="instance" :value="instance">
              {{ instance.toUpperCase() }}
            </option>
          </select>
        </label>
        <div class="field">
          <span class="label">Options</span>
          <label class="row">
            <input type="checkbox" v-model="bypassMothership" />
            <span>Bypass mothership (remote)</span>
          </label>
          <div class="muted" style="font-size: 0.8rem;">
            User is remote by default. Turn this off to hit PM (mothership).
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card stack">
        <div class="spread">
          <h3>CRUD Recipe</h3>
          <span class="tag tag-muted">{{ selectedModel }}</span>
        </div>

        <div class="stack">
          <div class="muted" style="font-size: 0.8rem;">
            Current record id: <strong>{{ lastRecordId || '—' }}</strong>
          </div>

          <div class="stack">
            <div class="label">Create payload</div>
            <div class="grid" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3);">
              <label class="field">
                <span class="label">Email</span>
                <input v-model="createForm.email" class="input" placeholder="user@example.com" />
              </label>
              <label class="field">
                <span class="label">Password</span>
                <input v-model="createForm.password" class="input" placeholder="Password" />
              </label>
              <label class="field">
                <span class="label">First name</span>
                <input v-model="createForm.firstName" class="input" placeholder="First name" />
              </label>
              <label class="field">
                <span class="label">Surname</span>
                <input v-model="createForm.surname" class="input" placeholder="Surname" />
              </label>
              <label class="field">
                <span class="label">Role</span>
                <select v-model="createForm.role" class="select">
                  <option value="student">student</option>
                  <option value="admin">admin</option>
                  <option value="teacher">teacher</option>
                </select>
              </label>
            </div>
          </div>

          <div class="stack">
            <div class="label">Update payload</div>
            <div class="grid" style="grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3);">
              <label class="field">
                <span class="label">First name</span>
                <input v-model="updateForm.firstName" class="input" placeholder="Updated first name" />
              </label>
              <label class="field">
                <span class="label">Surname</span>
                <input v-model="updateForm.surname" class="input" placeholder="Updated surname" />
              </label>
            </div>
          </div>

          <label class="field">
            <span class="label">Resource key for get()</span>
            <input v-model="resourceKey" class="input" placeholder="Admin" />
          </label>

          <div class="row" style="flex-wrap: wrap;">
            <button class="btn outline" @click="fillDemo">Fill demo values</button>
            <button class="btn outline" @click="handleCreate">Create</button>
            <button class="btn outline" @click="handleUpdate">Update</button>
            <button class="btn outline" @click="handleGet">Get</button>
            <button class="btn outline" @click="handleDelete">Delete</button>
            <button class="btn primary" @click="runRecipe">Run recipe</button>
            <button class="btn ghost" @click="resetLogs">Clear log</button>
          </div>
        </div>
      </div>

      <div class="card stack">
        <div class="spread">
          <h3>Output</h3>
          <span class="tag tag-muted">Latest response</span>
        </div>
        <pre class="code-block">{{ JSON.stringify(lastResponse, null, 2) }}</pre>

        <div class="spread" style="margin-top: var(--space-4);">
          <h3>Log</h3>
          <span class="tag tag-muted">{{ logs.length }} entries</span>
        </div>
        <div class="stack">
          <div v-if="logs.length === 0" class="muted">No log entries yet.</div>
          <div v-for="entry in logs" :key="entry.id" class="row" style="justify-content: space-between;">
            <div class="stack" style="gap: 0.2rem;">
              <span class="tag tag-muted">{{ entry.level.toUpperCase() }}</span>
              <span>{{ entry.message }}</span>
              <pre v-if="entry.data" class="code-block">{{ JSON.stringify(entry.data, null, 2) }}</pre>
            </div>
            <div class="muted" style="font-size: 0.75rem;">{{ entry.time }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
