<script setup lang="ts">
import type { ApiToolkitSelectOption } from '~/types/api-toolkit'

const props = withDefaults(defineProps<{
  label: string
  description?: string
  modelValue?: string | number | null
  options: ApiToolkitSelectOption[]
  placeholder?: string
  disabled?: boolean
}>(), {
  modelValue: null,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number | null): void
}>()

const selectedOption = computed(() =>
  props.options.find(option => option.value === props.modelValue)
)

const onChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (value === '') {
    emit('update:modelValue', null)
    return
  }

  const matched = props.options.find(option => String(option.value) === value)
  emit('update:modelValue', matched ? matched.value : value)
}
</script>

<template>
  <div class="space-y-2">
    <label class="text-xs font-semibold uppercase text-muted">{{ label }}</label>
    <select
      class="select select-sm w-full"
      :value="modelValue ?? ''"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <p v-if="selectedOption?.description" class="text-xs text-muted">{{ selectedOption.description }}</p>
    <p v-else-if="description" class="text-xs text-muted">{{ description }}</p>
  </div>
</template>
