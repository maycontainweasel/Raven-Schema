<script setup lang="ts">
import { NumberInput } from '@ark-ui/vue/number-input'

type NumberInputMode = 'default' | 'quantity'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    helperText?: string
    errorText?: string
    placeholder?: string
    mode?: NumberInputMode
    min?: number
    max?: number
    step?: number
    locale?: string
    formatOptions?: Intl.NumberFormatOptions
    allowMouseWheel?: boolean
    allowOverflow?: boolean
    clampValueOnBlur?: boolean
    focusInputOnChange?: boolean
    spinOnPress?: boolean
    inputMode?: 'text' | 'tel' | 'numeric' | 'decimal'
    showScrubber?: boolean
    required?: boolean
    disabled?: boolean
    readOnly?: boolean
  }>(),
  {
    helperText: '',
    errorText: '',
    placeholder: '',
    mode: 'default',
    step: 1,
    allowMouseWheel: false,
    allowOverflow: true,
    clampValueOnBlur: true,
    focusInputOnChange: true,
    spinOnPress: true,
    inputMode: 'decimal',
    showScrubber: false,
    required: false,
    disabled: false,
    readOnly: false,
  },
)

const updateModel = (next: string) => {
  model.value = next
}

const handleValueChange = (details: { value: string }) => {
  model.value = details.value
}
</script>

<template>
  <NumberInput.Root
    class="a-field a-number-input"
    :model-value="model"
    :min="min"
    :max="max"
    :step="step"
    :locale="locale"
    :format-options="formatOptions"
    :allow-mouse-wheel="allowMouseWheel"
    :allow-overflow="allowOverflow"
    :clamp-value-on-blur="clampValueOnBlur"
    :focus-input-on-change="focusInputOnChange"
    :spin-on-press="spinOnPress"
    :input-mode="inputMode"
    :required="required"
    :disabled="disabled"
    :read-only="readOnly"
    :invalid="Boolean(errorText)"
    @update:model-value="updateModel"
    @value-change="handleValueChange"
  >
    <NumberInput.Label class="a-field__label">{{ label }}</NumberInput.Label>

    <NumberInput.Control
      class="a-number-input__control"
      :class="{ 'a-number-input__control--quantity': mode === 'quantity' }"
    >
      <NumberInput.DecrementTrigger
        v-if="mode === 'quantity'"
        class="a-number-input__qtrigger a-number-input__qtrigger--decrement"
        aria-label="Decrease value"
      >
        <i class="i-lucide-minus h-4 w-4" aria-hidden="true" />
      </NumberInput.DecrementTrigger>

      <div
        class="a-number-input__input-wrap"
        :class="{
          'a-number-input__input-wrap--quantity': mode === 'quantity',
          'is-scrubbable': showScrubber,
        }"
      >
        <NumberInput.Scrubber
          v-if="showScrubber"
          class="a-number-input__scrubber"
          aria-label="Scrub value"
        >
          <i class="i-lucide-move h-4 w-4" aria-hidden="true" />
        </NumberInput.Scrubber>

        <NumberInput.Input
          class="a-input a-number-input__input"
          :class="{ 'a-number-input__input--quantity': mode === 'quantity' }"
          :placeholder="placeholder"
          autocomplete="off"
        />
      </div>

      <template v-if="mode === 'quantity'">
        <NumberInput.IncrementTrigger
          class="a-number-input__qtrigger a-number-input__qtrigger--increment"
          aria-label="Increase value"
        >
          <i class="i-lucide-plus h-4 w-4" aria-hidden="true" />
        </NumberInput.IncrementTrigger>
      </template>

      <template v-else>
        <NumberInput.IncrementTrigger class="a-number-input__trigger" aria-label="Increase value">
          <i class="i-lucide-chevron-up h-3.5 w-3.5" aria-hidden="true" />
        </NumberInput.IncrementTrigger>

        <NumberInput.DecrementTrigger
          class="a-number-input__trigger a-number-input__trigger--decrement"
          aria-label="Decrease value"
        >
          <i class="i-lucide-chevron-down h-3.5 w-3.5" aria-hidden="true" />
        </NumberInput.DecrementTrigger>
      </template>
    </NumberInput.Control>

    <p v-if="helperText && !errorText" class="a-number-input__helper">{{ helperText }}</p>
    <p v-if="errorText" class="a-number-input__error">{{ errorText }}</p>
    <div v-if="$slots.footer" class="a-number-input__footer">
      <slot name="footer" />
    </div>
  </NumberInput.Root>
</template>

<style scoped>
.a-number-input {
  gap: 0.35rem;
}

.a-number-input__control {
  width: 100%;
  min-height: 2.5rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.85rem;
  grid-template-rows: 1fr 1fr;
  border: 1.5px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  overflow: hidden;
  transition: border-color 0ms linear, background 0ms linear;
}

.a-number-input__control:focus-within {
  border-color: color-mix(in srgb, var(--admin-brand) 56%, var(--admin-border-strong) 44%);
  background: var(--admin-surface);
}

.a-number-input__input-wrap {
  grid-row: 1 / span 2;
  position: relative;
  min-height: 100%;
}

.a-number-input__input-wrap.is-scrubbable .a-number-input__input {
  padding-left: 2.05rem;
}

.a-number-input__input {
  border: 0;
  box-shadow: none;
  background: transparent;
  min-height: 100%;
  width: 100%;
}

.a-number-input__input:focus {
  border: 0;
  box-shadow: none;
  background: transparent;
}

.a-number-input__scrubber {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
  cursor: ew-resize;
  z-index: 2;
}

.a-number-input__trigger {
  border: 0;
  border-left: 1px solid var(--admin-border);
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-surface-muted);
  color: var(--admin-text-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 130ms ease, color 130ms ease;
}

.a-number-input__trigger--decrement {
  border-bottom: 0;
}

.a-number-input__trigger:hover {
  background: color-mix(in srgb, var(--admin-brand) 9%, var(--admin-surface-muted) 91%);
  color: var(--admin-text);
}

.a-number-input__control--quantity {
  grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
  grid-template-rows: 1fr;
}

.a-number-input__input-wrap--quantity {
  grid-row: auto;
}

.a-number-input__input--quantity {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.a-number-input__qtrigger {
  border: 0;
  background: var(--admin-surface-muted);
  color: var(--admin-text-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 130ms ease, color 130ms ease;
}

.a-number-input__qtrigger--decrement {
  border-right: 1px solid var(--admin-border);
}

.a-number-input__qtrigger--increment {
  border-left: 1px solid var(--admin-border);
}

.a-number-input__qtrigger:hover {
  background: color-mix(in srgb, var(--admin-brand) 9%, var(--admin-surface-muted) 91%);
  color: var(--admin-text);
}

.a-number-input__helper,
.a-number-input__error,
.a-number-input__footer {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-number-input__helper,
.a-number-input__footer {
  color: var(--admin-muted);
}

.a-number-input__error {
  color: #b42318;
}
</style>
