<script setup lang="ts">
import { computed } from 'vue'
import { ColorPicker, parseColor } from '@ark-ui/vue/color-picker'

const model = defineModel<string>({ default: '#000000' })

const props = withDefaults(
  defineProps<{
    label: string
    helperText?: string
    errorText?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    helperText: '',
    errorText: '',
    required: false,
    disabled: false,
  },
)

const fallbackHex = '#000000'

const normalizeHex = (value: string) => {
  const trimmed = String(value ?? '').trim()
  const shortMatch = trimmed.match(/^#([0-9a-fA-F]{3})$/)
  if (shortMatch?.[1]) {
    const [r, g, b] = shortMatch[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const fullMatch = trimmed.match(/^#([0-9a-fA-F]{6})$/)
  if (fullMatch?.[1]) {
    return `#${fullMatch[1]}`.toLowerCase()
  }
  return fallbackHex
}

const toColorValue = (raw: string) => {
  try {
    return parseColor(raw)
  }
  catch {
    return parseColor(fallbackHex)
  }
}

const pickerValue = computed(() => {
  const candidate = typeof model.value === 'string' && model.value.length > 0
    ? model.value
    : fallbackHex
  return toColorValue(candidate)
})

const resolveHexFromDetails = (details: { valueAsString: string; value?: { toString: (format?: string) => string } }) => {
  try {
    const fromColor = details?.value?.toString?.('hex')
    if (typeof fromColor === 'string' && fromColor.length > 0) {
      return fromColor
    }
  }
  catch {
    // Some color spaces do not support direct hex conversion.
  }
  return details?.valueAsString ?? fallbackHex
}

const handleValueChange = (details: { valueAsString: string; value?: { toString: (format?: string) => string } }) => {
  model.value = normalizeHex(resolveHexFromDetails(details))
}

const positioning = {
  placement: 'bottom-start',
  gutter: 8,
} as const
</script>

<template>
  <ColorPicker.Root
    :model-value="pickerValue"
    format="rgba"
    :positioning="positioning"
    :required="required"
    :disabled="disabled"
    @value-change="handleValueChange"
    class="a-field a-color-picker-field"
  >
    <ColorPicker.Label class="a-field__label">{{ label }}</ColorPicker.Label>

    <div class="a-color-picker-field__row">
      <ColorPicker.Control class="a-color-picker-field__control">
        <ColorPicker.ChannelInput channel="hex" class="a-input a-color-picker-field__hex-input" />
      </ColorPicker.Control>

      <ColorPicker.Trigger class="a-color-picker-field__trigger" aria-label="Open color picker">
        <ColorPicker.TransparencyGrid class="a-color-picker-field__trigger-grid" />
        <ColorPicker.ValueSwatch class="a-color-picker-field__trigger-swatch" />
      </ColorPicker.Trigger>
    </div>

    <p v-if="helperText && !errorText" class="a-color-picker-field__helper">{{ helperText }}</p>
    <p v-if="errorText" class="a-color-picker-field__error">{{ errorText }}</p>

    <Teleport to="body">
      <ColorPicker.Positioner>
        <ColorPicker.Content class="a-color-picker-field__content">
          <ColorPicker.Area class="a-color-picker-field__area">
            <ColorPicker.AreaBackground class="a-color-picker-field__area-background" />
            <ColorPicker.AreaThumb class="a-color-picker-field__area-thumb" />
          </ColorPicker.Area>

          <div class="a-color-picker-field__sliders">
            <ColorPicker.EyeDropperTrigger class="a-color-picker-field__eye" aria-label="Pick color from screen">
              <i class="i-lucide-pipette h-4 w-4" aria-hidden="true" />
            </ColorPicker.EyeDropperTrigger>

            <div class="a-color-picker-field__slider-stack">
              <ColorPicker.ChannelSlider channel="hue" class="a-color-picker-field__slider">
                <ColorPicker.ChannelSliderTrack class="a-color-picker-field__slider-track a-color-picker-field__slider-track--hue" />
                <ColorPicker.ChannelSliderThumb class="a-color-picker-field__slider-thumb" />
              </ColorPicker.ChannelSlider>
            </div>
          </div>

          <div class="a-color-picker-field__inputs">
            <ColorPicker.ChannelInput channel="hex" class="a-input a-color-picker-field__channel-input" />
          </div>
        </ColorPicker.Content>
      </ColorPicker.Positioner>
    </Teleport>

    <ColorPicker.HiddenInput />
  </ColorPicker.Root>
</template>

<style scoped>
.a-color-picker-field {
  gap: 0.35rem;
}

.a-color-picker-field__row {
  display: flex;
  align-items: center;
  gap: 0.62rem;
}

.a-color-picker-field__control {
  flex: 1;
}

.a-color-picker-field__hex-input {
  min-height: 2.5rem;
}

.a-color-picker-field__trigger {
  position: relative;
  width: 3rem;
  min-width: 3rem;
  height: 2.5rem;
  border-radius: var(--admin-radius-sm);
  border: 1.5px solid var(--admin-border-strong);
  overflow: hidden;
  cursor: pointer;
  padding: 0;
  background: var(--admin-surface-muted);
}

.a-color-picker-field__trigger:focus-visible {
  outline: 0;
  border-color: color-mix(in srgb, var(--admin-brand) 56%, var(--admin-border-strong) 44%);
}

.a-color-picker-field__trigger-grid,
.a-color-picker-field__trigger-swatch {
  position: absolute;
  inset: 0;
}

.a-color-picker-field__trigger-grid {
  --size: 6px;
  opacity: 0.55;
}

.a-color-picker-field__helper,
.a-color-picker-field__error {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-color-picker-field__helper {
  color: var(--admin-muted);
}

.a-color-picker-field__error {
  color: #b42318;
}

.a-color-picker-field__content {
  width: min(92vw, 20rem);
  border-radius: var(--admin-radius-md);
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-surface);
  box-shadow: 0 18px 34px rgba(17, 32, 62, 0.16);
  padding: 0.7rem;
  display: grid;
  gap: 0.68rem;
  z-index: 1600;
}

.a-color-picker-field__area {
  position: relative;
  width: 100%;
  height: 9rem;
  border-radius: var(--admin-radius-sm);
  overflow: hidden;
}

.a-color-picker-field__area-background {
  width: 100%;
  height: 100%;
}

.a-color-picker-field__area-thumb {
  position: absolute;
  width: 0.82rem;
  height: 0.82rem;
  border-radius: 9999px;
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px rgba(2, 5, 19, 0.3);
  transform: translate(-50%, -50%);
}

.a-color-picker-field__sliders {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.a-color-picker-field__eye {
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface-muted);
  color: var(--admin-text-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-color-picker-field__eye:hover {
  border-color: color-mix(in srgb, var(--admin-brand) 24%, var(--admin-border-strong) 76%);
  color: var(--admin-text);
}

.a-color-picker-field__slider-stack {
  flex: 1;
  display: grid;
  gap: 0.48rem;
}

.a-color-picker-field__slider {
  position: relative;
  width: 100%;
  height: 0.64rem;
  border-radius: 9999px;
  overflow: hidden;
}

.a-color-picker-field__slider-track {
  width: 100%;
  height: 100%;
}

.a-color-picker-field__slider-track--hue {
  background: linear-gradient(to right, #ff0000, #ffe500, #17c964, #0ea5e9, #6366f1, #c026d3, #ff0000);
}

.a-color-picker-field__slider-thumb {
  position: absolute;
  top: 50%;
  width: 0.78rem;
  height: 0.78rem;
  border-radius: 9999px;
  background: #ffffff;
  border: 2px solid #061b31;
  transform: translate(-50%, -50%);
}

.a-color-picker-field__inputs {
  display: flex;
  gap: 0.42rem;
}

.a-color-picker-field__channel-input {
  width: 100%;
}
</style>
