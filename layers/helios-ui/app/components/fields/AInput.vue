<script setup lang="ts">
import { Field } from '@ark-ui/vue/field'

type AInputType = 'text' | 'email' | 'password' | 'number'

const model = defineModel<string | number>({ default: '' })
const slots = useSlots()

withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    helperText?: string
    errorText?: string
    type?: AInputType
    required?: boolean
    disabled?: boolean
    readOnly?: boolean
  }>(),
  {
    placeholder: '',
    helperText: '',
    errorText: '',
    type: 'text',
    required: false,
    disabled: false,
    readOnly: false,
  },
)

const hasPrefix = computed(() => Boolean(slots.prefix))
const hasSuffix = computed(() => Boolean(slots.suffix))
</script>

<template>
  <Field.Root class="a-field a-input-field" :required="required" :invalid="Boolean(errorText)" :disabled="disabled">
    <Field.Label class="a-field__label">
      {{ label }}
    </Field.Label>

    <div v-if="hasPrefix || hasSuffix" class="a-input-wrap">
      <span v-if="hasPrefix" class="a-input-field__slot a-input-field__slot--prefix">
        <slot name="prefix" />
      </span>

      <Field.Input
        v-model="model"
        class="a-input"
        :type="type"
        :placeholder="placeholder"
        :readonly="readOnly"
        autocomplete="off"
      />

      <span v-if="hasSuffix" class="a-input-field__slot a-input-field__slot--suffix">
        <slot name="suffix" />
      </span>
    </div>

    <Field.Input
      v-else
      v-model="model"
      class="a-input"
      :type="type"
      :placeholder="placeholder"
      :readonly="readOnly"
      autocomplete="off"
    />

    <Field.HelperText v-if="helperText && !errorText" class="a-input-field__helper">
      {{ helperText }}
    </Field.HelperText>

    <Field.ErrorText v-if="errorText" class="a-input-field__error">
      {{ errorText }}
    </Field.ErrorText>
  </Field.Root>
</template>

<style scoped>
.a-input-field {
  gap: 0.35rem;
}

.a-input-field__slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
}

.a-input-field__helper,
.a-input-field__error {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-input-field__helper {
  color: var(--admin-muted);
}

.a-input-field__error {
  color: #b42318;
}
</style>
