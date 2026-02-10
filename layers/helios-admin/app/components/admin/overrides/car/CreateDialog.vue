<!-- @helios-generated-model-override kind=create-dialog model=car -->
<script setup lang="ts">
import type { ModelUIFieldSpec } from '#helios-admin/app/types/model-spec'

const props = withDefaults(
  defineProps<{
    model: string
    open: boolean
    title: string
    submitLabel: string
    fields: ModelUIFieldSpec[]
    draft: Record<string, any>
    creating?: boolean
    error?: string
  }>(),
  {
    creating: false,
    error: '',
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:draft', value: Record<string, any>): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()

const toLabel = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const resolveFieldKey = (field: ModelUIFieldSpec) =>
  String(field.modelKey || field.field || field.id || '').trim()

const resolveInputType = (field: ModelUIFieldSpec) => {
  const component = String(field.component?.name || '').trim()
  const options = field.component?.options || {}
  if (component === 'AColorPicker') return 'color'
  if (component === 'AInput' && String(options.type || '').toLowerCase() === 'number') return 'number'
  return 'text'
}

const resolvePlaceholder = (field: ModelUIFieldSpec) => {
  const options = field.component?.options || {}
  return String(options.placeholder || `Enter ${toLabel(resolveFieldKey(field)).toLowerCase()}`).trim()
}

const setFieldValue = (field: ModelUIFieldSpec, value: unknown) => {
  const key = resolveFieldKey(field)
  if (!key) return
  emit('update:draft', {
    ...props.draft,
    [key]: value,
  })
}
</script>

<template>
  <div class="drawer-form smt-050">
    <p class="a-copy">
      Override scaffold for <code>{{ model }}</code>. Replace this file with your custom create dialog layout.
    </p>

    <label
      v-for="field in fields"
      :key="field.id"
      class="a-field"
    >
      <span class="a-field__label">{{ field.label || toLabel(resolveFieldKey(field)) }}</span>
      <input
        :type="resolveInputType(field)"
        class="a-input"
        :placeholder="resolvePlaceholder(field)"
        :value="draft[resolveFieldKey(field)] ?? ''"
        @input="setFieldValue(field, ($event.target as HTMLInputElement).value)"
      >
    </label>

    <div class="drawer-actions smt-075">
      <button class="a-btn a-btn--subtle" type="button" @click="emit('cancel')">Cancel</button>
      <button class="a-btn a-btn--primary" type="button" :disabled="creating" @click="emit('submit')">
        {{ creating ? 'Creating…' : submitLabel }}
      </button>
    </div>

    <p v-if="error" class="directory-error smt-050">{{ error }}</p>
  </div>
</template>
