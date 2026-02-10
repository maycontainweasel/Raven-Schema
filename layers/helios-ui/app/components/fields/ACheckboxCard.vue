<script setup lang="ts">
import { Checkbox } from '@ark-ui/vue/checkbox'

type CheckedState = boolean | 'indeterminate'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    caption?: string
    icon?: string
    value?: string
    name?: string
    disabled?: boolean
  }>(),
  {
    description: '',
    caption: '',
    icon: '',
    value: 'on',
    name: '',
    disabled: false,
  },
)

const onCheckedChange = (details: { checked: CheckedState }) => {
  model.value = details.checked === true
}
</script>

<template>
  <Checkbox.Root
    class="a-checkbox-card"
    :class="{ 'is-disabled': props.disabled }"
    :checked="model"
    :value="props.value"
    :name="props.name || undefined"
    :disabled="props.disabled"
    @checked-change="onCheckedChange"
  >
    <div class="a-checkbox-card__surface">
      <div class="a-checkbox-card__row">
        <div class="a-checkbox-card__content">
          <div class="a-checkbox-card__title-row">
            <i v-if="props.icon" :class="[props.icon, 'a-checkbox-card__icon']" aria-hidden="true" />
            <Checkbox.Label class="a-checkbox-card__title">
              {{ props.title }}
            </Checkbox.Label>
          </div>
          <p v-if="props.description" class="a-checkbox-card__description">
            {{ props.description }}
          </p>
          <p v-if="props.caption" class="a-checkbox-card__caption">
            {{ props.caption }}
          </p>
        </div>

        <Checkbox.Control class="a-checkbox-card__control">
          <Checkbox.Indicator class="a-checkbox-card__indicator">
            <i class="i-lucide-check h-3.5 w-3.5" aria-hidden="true" />
          </Checkbox.Indicator>
          <Checkbox.Indicator indeterminate class="a-checkbox-card__indicator">
            <i class="i-lucide-minus h-3.5 w-3.5" aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Control>
      </div>
    </div>
    <Checkbox.HiddenInput />
  </Checkbox.Root>
</template>

<style scoped>
.a-checkbox-card {
  width: 100%;
  display: block;
  cursor: pointer;
}

.a-checkbox-card.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.a-checkbox-card__surface {
  border: 1.5px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.72rem;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
  transition: border-color 130ms ease, background 130ms ease, box-shadow 130ms ease;
}

.a-checkbox-card__row {
  display: flex;
  align-items: flex-start;
  gap: 0.72rem;
}

.a-checkbox-card__content {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 0.22rem;
}

.a-checkbox-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.42rem;
}

.a-checkbox-card__icon {
  color: var(--admin-muted);
}

.a-checkbox-card__title {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  line-height: 1.3;
  font-weight: 600;
}

.a-checkbox-card__description {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-checkbox-card__caption {
  margin: 0.16rem 0 0;
  color: var(--admin-text);
  font-size: var(--fs-0, 0.95rem);
  font-weight: 700;
}

.a-checkbox-card__control {
  width: 1.24rem;
  min-width: 1.24rem;
  height: 1.24rem;
  border: 1.5px solid var(--admin-border-strong);
  border-radius: 0.32rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-surface);
  color: transparent;
  transition: border-color 130ms ease, background 130ms ease, color 130ms ease;
}

.a-checkbox-card__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-checkbox-card__surface:hover {
  border-color: color-mix(in srgb, var(--admin-brand) 38%, var(--admin-border-strong) 62%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
}

.a-checkbox-card[data-state='checked'] .a-checkbox-card__surface,
.a-checkbox-card[data-state='indeterminate'] .a-checkbox-card__surface {
  border-color: var(--admin-brand);
  background: color-mix(in srgb, var(--admin-brand) 7%, var(--admin-surface) 93%);
  box-shadow: 0 12px 28px rgba(29, 78, 216, 0.16);
}

.a-checkbox-card[data-state='checked'] .a-checkbox-card__control,
.a-checkbox-card[data-state='indeterminate'] .a-checkbox-card__control {
  border-color: var(--admin-brand);
  background: var(--admin-brand);
  color: #fff;
}

.a-checkbox-card[data-state='checked'] .a-checkbox-card__icon,
.a-checkbox-card[data-state='indeterminate'] .a-checkbox-card__icon {
  color: color-mix(in srgb, var(--admin-brand) 78%, var(--admin-text) 22%);
}
</style>
