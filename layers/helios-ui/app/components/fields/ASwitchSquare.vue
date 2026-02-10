<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch'
import { useSwitchModel } from '../../composables/useSwitchModel'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })
const { onCheckedChange } = useSwitchModel(model)
</script>

<template>
  <Switch.Root
    :checked="model"
    :disabled="props.disabled"
    class="a-switch-square"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-square__control">
      <Switch.Thumb class="a-switch-square__thumb" />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-square {
  display: inline-flex;
  cursor: pointer;
}

.a-switch-square.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-square__control {
  width: 2.75rem;
  height: 1.5rem;
  padding: 0.1rem;
  border-radius: 0.36rem;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
}

.a-switch-square__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-square__thumb {
  width: 1.24rem;
  height: 1.24rem;
  border-radius: 0.26rem;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 130ms ease;
}

.a-switch-square__thumb[data-state='checked'] {
  transform: translateX(1.22rem);
}
</style>
