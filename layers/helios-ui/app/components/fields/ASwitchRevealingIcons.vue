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
    class="a-switch-reveal-icons"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-reveal-icons__control">
      <div class="a-switch-reveal-icons__icon a-switch-reveal-icons__icon--right" :class="{ 'is-hidden': model }">
        <i class="i-lucide-moon h-4 w-4" aria-hidden="true" />
      </div>
      <div class="a-switch-reveal-icons__icon a-switch-reveal-icons__icon--left" :class="{ 'is-hidden': !model }">
        <i class="i-lucide-sun h-4 w-4" aria-hidden="true" />
      </div>
      <Switch.Thumb class="a-switch-reveal-icons__thumb" />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-reveal-icons {
  display: inline-flex;
  cursor: pointer;
}

.a-switch-reveal-icons.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-reveal-icons__control {
  width: 4rem;
  height: 2rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  position: relative;
  transition: background 130ms ease;
}

.a-switch-reveal-icons__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-reveal-icons__icon {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  transition: opacity 130ms ease;
}

.a-switch-reveal-icons__icon--right {
  right: 0.48rem;
  color: var(--admin-text-soft);
}

.a-switch-reveal-icons__icon--left {
  left: 0.48rem;
  color: #fff;
}

.a-switch-reveal-icons__icon.is-hidden {
  opacity: 0;
}

.a-switch-reveal-icons__thumb {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  transition: transform 130ms ease;
  position: relative;
  z-index: 1;
}

.a-switch-reveal-icons__thumb[data-state='checked'] {
  transform: translateX(2rem);
}
</style>
