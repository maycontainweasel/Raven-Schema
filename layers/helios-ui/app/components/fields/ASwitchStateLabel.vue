<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch'
import { useSwitchModel } from '../../composables/useSwitchModel'

const model = defineModel<boolean>({ default: false })
const props = withDefaults(
  defineProps<{
    onLabel?: string
    offLabel?: string
    disabled?: boolean
  }>(),
  {
    onLabel: 'On',
    offLabel: 'Off',
    disabled: false,
  },
)

const { onCheckedChange } = useSwitchModel(model)
</script>

<template>
  <Switch.Root
    :checked="model"
    :disabled="props.disabled"
    class="a-switch-state-label"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-state-label__control">
      <Switch.Thumb class="a-switch-state-label__thumb" />
    </Switch.Control>
    <Switch.Label class="a-switch-state-label__label">
      {{ model ? props.onLabel : props.offLabel }}
    </Switch.Label>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-state-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.a-switch-state-label.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-state-label__control {
  width: 2.75rem;
  height: 1.5rem;
  padding: 0.1rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
}

.a-switch-state-label__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-state-label__thumb {
  width: 1.24rem;
  height: 1.24rem;
  border-radius: 999px;
  background: #fff;
  transition: transform 130ms ease;
}

.a-switch-state-label__thumb[data-state='checked'] {
  transform: translateX(1.22rem);
}

.a-switch-state-label__label {
  color: var(--admin-text);
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
}
</style>
