<script setup lang="ts">
import { Field } from '@ark-ui/vue'

const model = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    helperText?: string
    type?: 'text' | 'email'
    required?: boolean
  }>(),
  {
    placeholder: '',
    helperText: '',
    type: 'text',
    required: false,
  },
)
</script>

<template>
  <Field.Root class="a-field field-text-input" :required="required">
    <Field.Label class="a-field__label">
      {{ label }}
    </Field.Label>

    <Field.Input
      v-model="model"
      class="a-input"
      :type="type"
      :placeholder="placeholder"
      autocomplete="off"
    />

    <Field.HelperText v-if="helperText" class="field-text-input__helper">
      {{ helperText }}
    </Field.HelperText>
  </Field.Root>
</template>

<style scoped>
.field-text-input {
  gap: 0.35rem;
}

.field-text-input__helper {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}
</style>
