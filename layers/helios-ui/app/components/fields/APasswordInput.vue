<script setup lang="ts">
import { Field } from '@ark-ui/vue/field'
import { PasswordInput } from '@ark-ui/vue/password-input'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    helperText?: string
    errorText?: string
    required?: boolean
    disabled?: boolean
    readOnly?: boolean
    invalid?: boolean
    name?: string
    autoComplete?: string
    ignorePasswordManagers?: boolean
    mono?: boolean
  }>(),
  {
    placeholder: '',
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
    readOnly: false,
    invalid: false,
    name: '',
    autoComplete: 'current-password',
    ignorePasswordManagers: false,
    mono: false,
  },
)

const isInvalid = computed(() => props.invalid || Boolean(props.errorText))

const onInput = (event: Event) => {
  model.value = (event.target as HTMLInputElement).value
}
</script>

<template>
  <Field.Root
    class="a-field a-password-field"
    :required="props.required"
    :invalid="isInvalid"
    :disabled="props.disabled"
  >
    <PasswordInput.Root
      :name="props.name || undefined"
      :auto-complete="props.autoComplete"
      :required="props.required"
      :disabled="props.disabled"
      :read-only="props.readOnly"
      :invalid="isInvalid"
      :ignore-password-managers="props.ignorePasswordManagers"
    >
      <PasswordInput.Label class="a-field__label a-password-field__label">
        <slot name="label-prefix" />
        {{ props.label }}
      </PasswordInput.Label>

      <PasswordInput.Control class="a-password-field__control">
        <span v-if="$slots.prefix" class="a-password-field__slot a-password-field__slot--prefix">
          <slot name="prefix" />
        </span>

        <PasswordInput.Input
          class="a-input a-password-field__input"
          :class="{
            'a-password-field__input--mono': props.mono,
            'a-password-field__input--with-prefix': Boolean($slots.prefix),
          }"
          :placeholder="props.placeholder"
          :value="model"
          @input="onInput"
        />

        <PasswordInput.VisibilityTrigger class="a-password-field__trigger" aria-label="Toggle password visibility">
          <PasswordInput.Indicator>
            <i class="i-lucide-eye h-4 w-4" aria-hidden="true" />
            <template #fallback>
              <i class="i-lucide-eye-off h-4 w-4" aria-hidden="true" />
            </template>
          </PasswordInput.Indicator>
        </PasswordInput.VisibilityTrigger>
      </PasswordInput.Control>
    </PasswordInput.Root>

    <Field.HelperText v-if="props.helperText && !props.errorText" class="a-password-field__helper">
      {{ props.helperText }}
    </Field.HelperText>

    <Field.ErrorText v-if="props.errorText" class="a-password-field__error">
      {{ props.errorText }}
    </Field.ErrorText>

    <div v-if="$slots.footer" class="a-password-field__footer">
      <slot name="footer" />
    </div>
  </Field.Root>
</template>

<style scoped>
.a-password-field {
  gap: 0.35rem;
}

.a-password-field__control {
  position: relative;
}

.a-password-field__label {
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
}

.a-password-field__input {
  padding-right: 2.4rem;
}

.a-password-field__input--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: var(--fs--1, 0.78rem);
}

.a-password-field__input--with-prefix {
  padding-left: 2rem;
}

.a-password-field__slot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
}

.a-password-field__slot--prefix {
  left: 0.6rem;
}

.a-password-field__trigger {
  position: absolute;
  right: 0.48rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.6rem;
  height: 1.6rem;
  border: 0;
  background: transparent;
  color: var(--admin-muted-2);
  border-radius: 0.34rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-password-field__trigger:hover {
  color: var(--admin-text-soft);
  background: var(--admin-surface-soft);
}

.a-password-field__helper,
.a-password-field__error,
.a-password-field__footer {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-password-field__helper,
.a-password-field__footer {
  color: var(--admin-muted);
}

.a-password-field__error {
  color: #b42318;
}
</style>
