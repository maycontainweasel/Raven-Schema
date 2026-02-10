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
    class="a-switch-large"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-large__control">
      <Switch.Thumb class="a-switch-large__thumb" />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-large {
  display: inline-flex;
  cursor: pointer;
}

.a-switch-large.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-large__control {
  width: 2.8rem;
  height: 1rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
}

.a-switch-large__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-large__thumb {
  width: 1.44rem;
  height: 1.44rem;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--admin-border);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform 130ms ease;
}

.a-switch-large__thumb[data-state='checked'] {
  transform: translateX(1.36rem);
}
</style>
