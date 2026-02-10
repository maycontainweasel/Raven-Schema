<script setup lang="ts">
import ASelectField, { type ASelectOption } from './ASelectField.vue'

type VisualMode = 'icon' | 'emoji' | 'avatar'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label: string
    options: ASelectOption[]
    placeholder?: string
    helperText?: string
    visualMode?: VisualMode
    showMeta?: boolean
    showDescription?: boolean
    showGroupLabels?: boolean
    groupLabels?: Record<string, string>
    clearable?: boolean
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    name?: string
  }>(),
  {
    placeholder: 'Select an option',
    helperText: '',
    visualMode: 'icon',
    showMeta: false,
    showDescription: false,
    showGroupLabels: false,
    groupLabels: () => ({}),
    clearable: true,
    disabled: false,
    required: false,
    invalid: false,
    name: '',
  },
)

const values = computed<string[]>({
  get: () => (model.value ? [model.value] : []),
  set: (next) => {
    model.value = next[0] || ''
  },
})

const initials = (label: string) => label
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((chunk) => chunk[0]?.toUpperCase() || '')
  .join('')
</script>

<template>
  <ASelectField
    v-model="values"
    :label="props.label"
    :options="props.options"
    :placeholder="props.placeholder"
    :helper-text="props.helperText"
    :show-group-labels="props.showGroupLabels"
    :group-labels="props.groupLabels"
    :clearable="props.clearable"
    :disabled="props.disabled"
    :required="props.required"
    :invalid="props.invalid"
    :name="props.name"
  >
    <template #trigger-leading="{ selected }">
      <span v-if="selected && props.visualMode === 'emoji'" class="a-select-visual__emoji">
        {{ selected.emoji || '🌐' }}
      </span>
      <i
        v-else-if="selected && props.visualMode === 'icon' && selected.icon"
        :class="[selected.icon, 'h-4 w-4 a-select-visual__icon']"
        aria-hidden="true"
      />
      <span v-else-if="selected && props.visualMode === 'avatar'" class="a-select-visual__avatar">
        {{ selected.avatar || initials(selected.label) }}
      </span>
    </template>

    <template #item-leading="{ item }">
      <span v-if="props.visualMode === 'emoji'" class="a-select-visual__emoji">
        {{ item.emoji || '🌐' }}
      </span>
      <i
        v-else-if="props.visualMode === 'icon' && item.icon"
        :class="[item.icon, 'h-4 w-4 a-select-visual__icon']"
        aria-hidden="true"
      />
      <span v-else-if="props.visualMode === 'avatar'" class="a-select-visual__avatar">
        {{ item.avatar || initials(item.label) }}
      </span>
    </template>

    <template v-if="props.showMeta" #item-meta="{ item }">
      <span v-if="item.meta" class="a-select-visual__meta">
        {{ item.meta }}
      </span>
    </template>

    <template v-if="props.showDescription" #item-secondary="{ item }">
      <span v-if="item.description" class="a-select-visual__description">
        {{ item.description }}
      </span>
    </template>
  </ASelectField>
</template>

<style scoped>
.a-select-visual__emoji {
  font-size: 1rem;
  line-height: 1;
}

.a-select-visual__icon {
  color: var(--admin-muted-2);
}

.a-select-visual__avatar {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--admin-brand) 16%, white 84%);
  color: color-mix(in srgb, var(--admin-brand) 80%, black 20%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.63rem;
  font-weight: 700;
}

.a-select-visual__meta {
  color: var(--admin-muted-2);
  font-size: 0.68rem;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.a-select-visual__description {
  color: var(--admin-muted);
  font-size: 0.7rem;
}
</style>
