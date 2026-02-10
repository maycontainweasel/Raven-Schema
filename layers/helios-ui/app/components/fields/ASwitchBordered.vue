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
    class="a-switch-bordered"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-bordered__control">
      <Switch.Thumb class="a-switch-bordered__thumb" />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-bordered {
  display: inline-flex;
  cursor: pointer;
}

.a-switch-bordered.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-bordered__control {
  width: 2.75rem;
  height: 1.5rem;
  padding: 0.12rem;
  border-radius: 999px;
  border: 2px solid var(--admin-border-strong);
  background: transparent;
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease, border-color 130ms ease;
}

.a-switch-bordered__control[data-state='checked'] {
  background: var(--admin-brand);
  border-color: var(--admin-brand);
}

.a-switch-bordered__thumb {
  width: 0.94rem;
  height: 0.94rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  transition: transform 130ms ease, background 130ms ease;
}

.a-switch-bordered__thumb[data-state='checked'] {
  transform: translateX(1.22rem);
  background: #fff;
}
</style>
