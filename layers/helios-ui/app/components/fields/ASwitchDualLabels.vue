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
    class="a-switch-dual"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <i class="i-lucide-moon h-4 w-4 a-switch-dual__icon" :class="{ 'is-muted': model }" aria-hidden="true" />
    <Switch.Control class="a-switch-dual__control">
      <Switch.Thumb class="a-switch-dual__thumb" />
    </Switch.Control>
    <i class="i-lucide-sun h-4 w-4 a-switch-dual__icon" :class="{ 'is-muted': !model }" aria-hidden="true" />
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-dual {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.a-switch-dual.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-dual__icon {
  color: var(--admin-text);
  transition: color 130ms ease;
}

.a-switch-dual__icon.is-muted {
  color: var(--admin-muted-2);
}

.a-switch-dual__control {
  width: 2.75rem;
  height: 1.5rem;
  padding: 0.1rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
}

.a-switch-dual__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-dual__thumb {
  width: 1.24rem;
  height: 1.24rem;
  border-radius: 999px;
  background: #fff;
  transition: transform 130ms ease;
}

.a-switch-dual__thumb[data-state='checked'] {
  transform: translateX(1.22rem);
}
</style>
