<script setup lang="ts">
import { computed, ref } from 'vue'
import { dbInstances } from '@schema/db'
import UiCombobox from '../ui/fields/UiCombobox.vue'

interface CreateFieldOption {
  label: string
  value: string | number
}

interface CreateField {
  key: string
  label: string
  type?: 'text' | 'number' | 'textarea' | 'select' | 'instances'
  placeholder?: string
  rows?: number
  multiple?: boolean
  autoFrom?: string
  format?: 'slug'
  message?: string
  options?: CreateFieldOption[]
}

const props = withDefaults(
  defineProps<{
    open: boolean
    form: Record<string, any>
    title: string
    subtitle?: string
    fields: CreateField[]
    loading?: boolean
    submitLabel?: string
    cancelLabel?: string
  }>(),
  {
    loading: false,
    submitLabel: 'Create',
    cancelLabel: 'Cancel'
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:form', value: Record<string, any>): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()

const manualEdits = ref<Record<string, boolean>>({})

const isInstancesField = (field: CreateField) =>
  field.key === 'instances' || field.type === 'instances'

const normalizeSlug = (value: string) => {
  const base = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base
}

const shouldSlug = (field: CreateField) =>
  field.format === 'slug' || field.key === 'key'

const resolveInstanceLabel = (key: string) => {
  const normalized = String(key).toUpperCase()
  if (normalized === 'TEST') return 'Test'
  return `Passmed ${normalized}`
}

const instanceOptions = computed(() =>
  Object.entries(dbInstances as Record<string, any>)
    .filter(([, cfg]) => cfg?.active === true && cfg?.root !== true)
    .map(([key]) => ({
      value: key,
      label: resolveInstanceLabel(String(key))
    }))
)

const updateFields = (changes: Record<string, any>) => {
  emit('update:form', { ...props.form, ...changes })
}

const markManual = (key: string) => {
  manualEdits.value = { ...manualEdits.value, [key]: true }
}

const updateField = (key: string, value: any) => {
  updateFields({ [key]: value })
}

const applyAutoFrom = (sourceKey: string, sourceValue: any, baseChanges: Record<string, any>) => {
  const targets = props.fields?.filter((field) => field.autoFrom === sourceKey) ?? []
  if (!targets.length) return baseChanges

  const nextChanges = { ...baseChanges }
  targets.forEach((target) => {
    if (manualEdits.value[target.key]) return
    const value = shouldSlug(target) ? normalizeSlug(String(sourceValue ?? '')) : sourceValue
    nextChanges[target.key] = value
  })
  return nextChanges
}

const handleTextInput = (field: CreateField, rawValue: string) => {
  const value = shouldSlug(field) ? normalizeSlug(rawValue) : rawValue
  const baseChanges = { [field.key]: value }
  const changes = applyAutoFrom(field.key, value, baseChanges)
  updateFields(changes)
}

const handleTextManual = (field: CreateField, rawValue: string) => {
  markManual(field.key)
  handleTextInput(field, rawValue)
}

const handleNumberInput = (field: CreateField, rawValue: string) => {
  const parsed = Number(rawValue)
  const value = Number.isNaN(parsed) ? rawValue : parsed
  updateFields({ [field.key]: value })
}

const handleCancel = () => {
  emit('update:open', false)
  emit('cancel')
}

const handleSubmit = () => {
  emit('submit')
}

const resolveValue = (field: CreateField) => {
  const value = props.form?.[field.key]
  if (value !== undefined && value !== null) return value
  if (isInstancesField(field) || field.multiple) return []
  return ''
}
</script>

<template>
  <Teleport to="body">
    <div class="modal" :class="open ? 'modal-open' : ''">
      <div class="modal-box">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <p v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</p>

        <div class="mt-4 space-y-4">
          <div v-for="field in fields" :key="field.key">
            <label class="label">
              <span class="label-text">{{ field.label }}</span>
            </label>

            <template v-if="isInstancesField(field)">
              <UiCombobox
                :model-value="Array.isArray(resolveValue(field)) ? resolveValue(field) : []"
                :options="instanceOptions"
                multiple
                :placeholder="field.placeholder ?? 'Select instances'"
                @update:model-value="(value) => updateField(field.key, value)"
              />
              <p v-if="field.message" class="mt-1 text-xs text-muted">
                {{ field.message }}
              </p>
            </template>

            <template v-else-if="field.type === 'textarea'">
              <textarea
                class="textarea"
                :rows="field.rows ?? 4"
                :placeholder="field.placeholder"
                :value="resolveValue(field)"
                @input="updateField(field.key, ($event.target as HTMLTextAreaElement).value)"
              ></textarea>
              <p v-if="field.message" class="mt-1 text-xs text-muted">
                {{ field.message }}
              </p>
            </template>

            <template v-else-if="field.type === 'select'">
              <select
                class="select"
                :value="resolveValue(field)"
                @change="updateField(field.key, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="option in field.options ?? []" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <p v-if="field.message" class="mt-1 text-xs text-muted">
                {{ field.message }}
              </p>
            </template>

            <template v-else>
              <input
                class="input"
                :type="field.type === 'number' ? 'number' : 'text'"
                :placeholder="field.placeholder"
                :value="resolveValue(field)"
                @input="field.type === 'number'
                  ? handleNumberInput(field, ($event.target as HTMLInputElement).value)
                  : (field.autoFrom || shouldSlug(field))
                    ? handleTextManual(field, ($event.target as HTMLInputElement).value)
                    : handleTextInput(field, ($event.target as HTMLInputElement).value)"
              />
              <p v-if="field.message" class="mt-1 text-xs text-muted">
                {{ field.message }}
              </p>
            </template>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" :disabled="loading" @click="handleCancel">
            {{ cancelLabel }}
          </button>
          <button class="btn btn-primary" :disabled="loading" @click="handleSubmit">
            <span v-if="loading" class="loading loading-spinner loading-xs mr-2"></span>
            {{ loading ? 'Saving...' : submitLabel }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="handleCancel"></div>
    </div>
  </Teleport>
</template>
