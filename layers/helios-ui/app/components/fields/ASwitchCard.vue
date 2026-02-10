<script setup lang="ts">
import { Switch } from '@ark-ui/vue/switch'
import { useSwitchModel } from '../../composables/useSwitchModel'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label: string
    sublabel?: string
    description?: string
    disabled?: boolean
  }>(),
  {
    sublabel: '',
    description: '',
    disabled: false,
  },
)

const { onCheckedChange } = useSwitchModel(model)
</script>

<template>
  <Switch.Root
    :checked="model"
    :disabled="props.disabled"
    class="a-switch-card"
    :class="{ 'is-disabled': props.disabled }"
    @checked-change="onCheckedChange"
  >
    <div class="a-switch-card__content">
      <div class="a-switch-card__title-row">
        <Switch.Label class="a-switch-card__label">{{ props.label }}</Switch.Label>
        <span v-if="props.sublabel" class="a-switch-card__sublabel">
          ({{ props.sublabel }})
        </span>
      </div>
      <p v-if="props.description" class="a-switch-card__description">{{ props.description }}</p>
    </div>

    <Switch.Control class="a-switch-card__control">
      <Switch.Thumb class="a-switch-card__thumb" />
    </Switch.Control>

    <Switch.HiddenInput />
  </Switch.Root>
</template>

<style scoped>
.a-switch-card {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.76rem;
  cursor: pointer;
}

.a-switch-card:hover {
  background: var(--admin-surface-soft);
}

.a-switch-card.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.a-switch-card__content {
  min-width: 0;
  display: grid;
  gap: 0.18rem;
}

.a-switch-card__title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.a-switch-card__label {
  color: var(--admin-text);
  font-size: var(--fs-0, 0.95rem);
  font-weight: 600;
}

.a-switch-card__sublabel {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-switch-card__description {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-switch-card__control {
  width: 1.8rem;
  height: 1rem;
  padding: 0.08rem;
  border-radius: 999px;
  background: var(--admin-border-strong);
  display: inline-flex;
  align-items: center;
  transition: background 130ms ease;
  flex-shrink: 0;
}

.a-switch-card__control[data-state='checked'] {
  background: var(--admin-brand);
}

.a-switch-card__thumb {
  width: 0.84rem;
  height: 0.84rem;
  border-radius: 999px;
  background: #fff;
  transition: transform 130ms ease;
}

.a-switch-card__thumb[data-state='checked'] {
  transform: translateX(0.78rem);
}
</style>
