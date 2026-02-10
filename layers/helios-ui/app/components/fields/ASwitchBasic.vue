<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch'
import { useSwitchModel } from '../../composables/useSwitchModel'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label?: string
    disabled?: boolean
  }>(),
  {
    label: '',
    disabled: false,
  },
)

const { onCheckedChange } = useSwitchModel(model)
</script>

<template>
  <Switch.Root
    :checked="model"
    :disabled="props.disabled"
    class="a-switch-basic"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-basic__control">
      <Switch.Thumb class="a-switch-basic__thumb" />
    </Switch.Control>
    <Switch.Label v-if="props.label" class="a-switch-basic__label">
      {{ props.label }}
    </Switch.Label>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-basic {
  display: inline-flex;
  align-items: center;
  gap: 0.52rem;
  cursor: pointer;
}

.a-switch-basic.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-basic__control {
  width: 2.75rem;
  height: 1.5rem;
  padding: 0.1rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
}

.a-switch-basic__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-basic__thumb {
  width: 1.24rem;
  height: 1.24rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 130ms ease;
}

.a-switch-basic__thumb[data-state='checked'] {
  transform: translateX(1.22rem);
}

.a-switch-basic__label {
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}
</style>
