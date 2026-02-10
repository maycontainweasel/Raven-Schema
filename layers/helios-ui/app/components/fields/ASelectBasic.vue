<script setup lang="ts">
import ASelectField, { type ASelectOption } from './ASelectField.vue'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    options: ASelectOption[]
    placeholder?: string
    helperText?: string
    clearable?: boolean
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    name?: string
  }>(),
  {
    placeholder: 'Select an option',
    helperText: '',
    clearable: true,
    disabled: false,
    required: false,
    invalid: false,
    name: '',
  },
)

const values = computed<string[]>({
  get: () => (model.value ? [model.value] : []),
  set: (next) => {
    model.value = next[0] || ''
  },
})
</script>

<template>
  <ASelectField
    v-model="values"
    :label="props.label"
    :options="props.options"
    :placeholder="props.placeholder"
    :helper-text="props.helperText"
    :clearable="props.clearable"
    :disabled="props.disabled"
    :required="props.required"
    :invalid="props.invalid"
    :name="props.name"
  />
</template>
