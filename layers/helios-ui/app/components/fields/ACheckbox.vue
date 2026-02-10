<script setup lang="ts">
import { Checkbox } from '@ark-ui/vue/checkbox'

type CheckedState = boolean | 'indeterminate'
type CheckboxTone = 'brand' | 'success' | 'neutral' | 'danger' | 'warning' | 'purple' | 'pink'
type CheckboxShape = 'square' | 'round'

const model = defineModel<CheckedState>({ default: false })

const emit = defineEmits<{
  checkedChange: [checked: CheckedState]
}>()

const props = withDefaults(
  defineProps<{
    label: string
    description?: string
    value?: string
    name?: string
    required?: boolean
    disabled?: boolean
    invalid?: boolean
    checked?: CheckedState
    tone?: CheckboxTone
    color?: string
    shape?: CheckboxShape
    strikeWhenChecked?: boolean
  }>(),
  {
    description: '',
    value: 'on',
    name: '',
    required: false,
    disabled: false,
    invalid: false,
    checked: undefined,
    tone: 'brand',
    color: '',
    shape: 'square',
    strikeWhenChecked: false,
  },
)

const resolvedChecked = computed<CheckedState>(() => (
  props.checked === undefined ? model.value : props.checked
))

const isChecked = computed(() => resolvedChecked.value === true)

const onCheckedChange = (details: { checked: CheckedState }) => {
  model.value = details.checked
  emit('checkedChange', details.checked)
}
</script>

<template>
  <Checkbox.Root
    class="a-checkbox"
    :class="[
      `a-checkbox--tone-${props.tone}`,
      `a-checkbox--shape-${props.shape}`,
      { 'is-disabled': props.disabled },
    ]"
    :style="props.color ? { '--a-checkbox-color': props.color } : undefined"
    :checked="resolvedChecked"
    :value="props.value"
    :name="props.name || undefined"
    :required="props.required"
    :disabled="props.disabled"
    :invalid="props.invalid"
    @checked-change="onCheckedChange"
  >
    <Checkbox.Control class="a-checkbox__control">
      <Checkbox.Indicator class="a-checkbox__indicator">
        <i class="i-lucide-check h-3.5 w-3.5" aria-hidden="true" />
      </Checkbox.Indicator>
      <Checkbox.Indicator indeterminate class="a-checkbox__indicator">
        <i class="i-lucide-minus h-3.5 w-3.5" aria-hidden="true" />
      </Checkbox.Indicator>
    </Checkbox.Control>

    <div class="a-checkbox__body">
      <Checkbox.Label
        class="a-checkbox__label"
        :class="{ 'is-struck': props.strikeWhenChecked && isChecked }"
      >
        {{ props.label }}
      </Checkbox.Label>
      <p v-if="props.description" class="a-checkbox__description">
        {{ props.description }}
      </p>
    </div>

    <Checkbox.HiddenInput />
  </Checkbox.Root>
</template>

<style scoped>
.a-checkbox {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: flex-start;
  gap: 0.58rem;
  cursor: pointer;
}

.a-checkbox.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.a-checkbox__control {
  width: 1.28rem;
  height: 1.28rem;
  margin-top: 0.08rem;
  border: 1.5px solid var(--admin-border-strong);
  border-radius: 0.32rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-surface);
  color: transparent;
  transition: border-color 130ms ease, background 130ms ease, color 130ms ease;
}

.a-checkbox--shape-round .a-checkbox__control {
  border-radius: 999px;
}

.a-checkbox__control[data-hover] {
  border-color: color-mix(in srgb, var(--admin-brand) 44%, var(--admin-border-strong) 56%);
}

.a-checkbox__control[data-state='checked'],
.a-checkbox__control[data-state='indeterminate'] {
  color: #fff;
  border-color: var(--a-checkbox-color, var(--admin-brand));
  background: var(--a-checkbox-color, var(--admin-brand));
}

.a-checkbox__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-checkbox__body {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
}

.a-checkbox__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  line-height: 1.3;
  font-weight: 600;
  transition: color 130ms ease, opacity 130ms ease;
}

.a-checkbox__label.is-struck {
  text-decoration: line-through;
  color: var(--admin-muted);
}

.a-checkbox__description {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.35;
}

.a-checkbox--tone-brand {
  --a-checkbox-color: var(--admin-brand);
}

.a-checkbox--tone-success {
  --a-checkbox-color: #15803d;
}

.a-checkbox--tone-neutral {
  --a-checkbox-color: #334155;
}

.a-checkbox--tone-danger {
  --a-checkbox-color: #b42318;
}

.a-checkbox--tone-warning {
  --a-checkbox-color: #c2410c;
}

.a-checkbox--tone-purple {
  --a-checkbox-color: #7c3aed;
}

.a-checkbox--tone-pink {
  --a-checkbox-color: #db2777;
}
</style>
