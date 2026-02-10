<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch'
import { useSwitchModel } from '../../composables/useSwitchModel'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    onText?: string
    offText?: string
    disabled?: boolean
  }>(),
  {
    onText: 'ON',
    offText: 'OFF',
    disabled: false,
  },
)

const { onCheckedChange } = useSwitchModel(model)
</script>

<template>
  <Switch.Root
    :checked="model"
    :disabled="props.disabled"
    class="a-switch-embed-text"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <Switch.Control class="a-switch-embed-text__control">
      <span v-if="!model" class="a-switch-embed-text__text a-switch-embed-text__text--right">
        {{ props.offText }}
      </span>
      <span v-else class="a-switch-embed-text__text a-switch-embed-text__text--left">
        {{ props.onText }}
      </span>
      <Switch.Thumb class="a-switch-embed-text__thumb" />
    </Switch.Control>
    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-embed-text {
  display: inline-flex;
  cursor: pointer;
}

.a-switch-embed-text.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-embed-text__control {
  width: 4rem;
  height: 2rem;
  padding: 0.2rem;
  border-radius: 0.5rem;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  position: relative;
  transition: background 130ms ease;
}

.a-switch-embed-text__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-embed-text__text {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.62rem;
  font-weight: 700;
}

.a-switch-embed-text__text--left {
  left: 0.5rem;
  color: #fff;
}

.a-switch-embed-text__text--right {
  right: 0.5rem;
  color: var(--admin-text-soft);
}

.a-switch-embed-text__thumb {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.4rem;
  background: #fff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform 130ms ease;
  position: relative;
  z-index: 1;
}

.a-switch-embed-text__thumb[data-state='checked'] {
  transform: translateX(2rem);
}
</style>
