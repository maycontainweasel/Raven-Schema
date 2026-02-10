<script setup lang="ts">
import ASelectField, { type ASelectOption } from './ASelectField.vue'

const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label: string
    options: ASelectOption[]
    placeholder?: string
    helperText?: string
    groupLabels?: Record<string, string>
    clearable?: boolean
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    name?: string
  }>(),
  {
    placeholder: 'Select options',
    helperText: '',
    groupLabels: () => ({}),
    clearable: true,
    disabled: false,
    required: false,
    invalid: false,
    name: '',
  },
)
</script>

<template>
  <ASelectField
    v-model="model"
    multiple
    show-group-labels
    :label="props.label"
    :options="props.options"
    :placeholder="props.placeholder"
    :helper-text="props.helperText"
    :group-labels="props.groupLabels"
    :clearable="props.clearable"
    :disabled="props.disabled"
    :required="props.required"
    :invalid="props.invalid"
    :name="props.name"
  />
</template>
