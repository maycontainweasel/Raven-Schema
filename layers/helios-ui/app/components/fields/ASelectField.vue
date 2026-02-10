<script setup lang="ts">
import { Select, createListCollection } from '@ark-ui/vue/select'

export type ASelectOption = {
  label: string
  value: string
  group?: string
  icon?: string
  emoji?: string
  avatar?: string
  meta?: string
  description?: string
}

const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label: string
    options: ASelectOption[]
    placeholder?: string
    helperText?: string
    clearable?: boolean
    multiple?: boolean
    floatingLabel?: boolean
    showGroupLabels?: boolean
    groupLabels?: Record<string, string>
    disabled?: boolean
    required?: boolean
    invalid?: boolean
    name?: string
  }>(),
  {
    placeholder: 'Select an option',
    helperText: '',
    clearable: true,
    multiple: false,
    floatingLabel: false,
    showGroupLabels: false,
    groupLabels: () => ({}),
    disabled: false,
    required: false,
    invalid: false,
    name: '',
  },
)

const normalizedOptions = computed<ASelectOption[]>(() => {
  const output: ASelectOption[] = []
  const seen = new Set<string>()
  for (const option of props.options || []) {
    if (!option || typeof option.value !== 'string') continue
    const value = option.value.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    output.push({
      label: option.label?.trim() || value,
      value,
      group: option.group?.trim() || '',
      icon: option.icon?.trim() || '',
      emoji: option.emoji?.trim() || '',
      avatar: option.avatar?.trim() || '',
      meta: option.meta?.trim() || '',
      description: option.description?.trim() || '',
    })
  }
  return output
})

const collection = computed(() => createListCollection<ASelectOption>({
  items: normalizedOptions.value,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
}))

const groupedOptions = computed(() => {
  const map = new Map<string, ASelectOption[]>()
  for (const option of normalizedOptions.value) {
    const key = option.group || '__default__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)?.push(option)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: props.groupLabels[key] || (key === '__default__' ? 'Options' : key),
    items,
  }))
})

const hasRealGroups = computed(() => groupedOptions.value.some((group) => group.key !== '__default__'))

const selectedOption = computed(() => {
  const selectedValue = model.value[0]
  if (!selectedValue) return null
  return normalizedOptions.value.find((option) => option.value === selectedValue) || null
})

const displayGroups = computed(() => {
  if (hasRealGroups.value) return groupedOptions.value
  return [{
    key: '__default__',
    label: 'Options',
    items: normalizedOptions.value,
  }]
})

const onValueChange = (details: { value: string[] }) => {
  model.value = details.value
}
</script>

<template>
  <Select.Root
    :collection="collection"
    :model-value="model"
    :multiple="props.multiple"
    :disabled="props.disabled"
    :required="props.required"
    :invalid="props.invalid"
    :name="props.name || undefined"
    :positioning="{ placement: 'bottom-start', sameWidth: true, gutter: 8 }"
    @value-change="onValueChange"
  >
    <div class="a-field a-select-field" :class="{ 'a-select-field--floating': props.floatingLabel }">
      <Select.Label v-if="!props.floatingLabel" class="a-field__label">{{ props.label }}</Select.Label>

      <Select.Control class="a-select-field__control">
        <Select.Trigger class="a-input a-select-field__trigger">
          <div class="a-select-field__trigger-main">
            <slot name="trigger-leading" :selected="selectedOption" />
            <Select.ValueText :placeholder="props.placeholder" />
          </div>

          <Select.Indicator class="a-select-field__indicator">
            <i class="i-lucide-chevron-down h-4 w-4" aria-hidden="true" />
          </Select.Indicator>
        </Select.Trigger>

        <Select.ClearTrigger
          v-if="props.clearable && model.length > 0"
          class="a-select-field__clear"
        >
          Clear
        </Select.ClearTrigger>

        <div v-if="props.floatingLabel" class="a-select-field__floating-label">
          {{ props.label }}
        </div>
        <fieldset v-if="props.floatingLabel" class="a-select-field__floating-frame">
          <legend>{{ props.label }}</legend>
        </fieldset>
      </Select.Control>

      <Teleport to="body">
        <Select.Positioner>
          <Select.Content class="a-select-field__content">
            <Select.ItemGroup v-for="group in displayGroups" :key="group.key">
              <Select.ItemGroupLabel
                v-if="props.showGroupLabels && (hasRealGroups || group.key !== '__default__')"
                class="a-select-field__group-label"
              >
                {{ group.label }}
              </Select.ItemGroupLabel>

              <Select.Item
                v-for="item in group.items"
                :key="item.value"
                :item="item"
                class="a-select-field__item"
              >
                <div class="a-select-field__item-main">
                  <slot name="item-leading" :item="item" />
                  <div class="a-select-field__item-copy">
                    <Select.ItemText class="a-select-field__item-text">
                      {{ item.label }}
                    </Select.ItemText>
                    <slot name="item-secondary" :item="item" />
                  </div>
                </div>

                <div class="a-select-field__item-right">
                  <slot name="item-meta" :item="item" />
                  <Select.ItemIndicator class="a-select-field__item-indicator">
                    <i class="i-lucide-check h-4 w-4" aria-hidden="true" />
                  </Select.ItemIndicator>
                </div>
              </Select.Item>
            </Select.ItemGroup>
          </Select.Content>
        </Select.Positioner>
      </Teleport>

      <p v-if="props.helperText" class="a-select-field__helper">{{ props.helperText }}</p>
      <Select.HiddenSelect />
    </div>
  </Select.Root>
</template>

<style scoped>
.a-select-field {
  gap: 0.35rem;
}

.a-select-field__control {
  position: relative;
}

.a-select-field__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.a-select-field__trigger-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.a-select-field__indicator {
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-select-field__clear {
  margin-top: 0.18rem;
  border: 0;
  background: transparent;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-select-field__clear:hover {
  color: var(--admin-text-soft);
}

.a-select-field__content {
  z-index: 1000;
  min-width: var(--reference-width);
  max-height: 16rem;
  overflow: auto;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.2);
  padding: 0.24rem;
}

.a-select-field__group-label {
  padding: 0.44rem 0.54rem 0.3rem;
  color: var(--admin-muted-2);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.a-select-field__item {
  position: relative;
  border-radius: 0.45rem;
  padding: 0.46rem 0.56rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  cursor: pointer;
}

.a-select-field__item[data-highlighted] {
  background: var(--admin-surface-soft);
}

.a-select-field__item-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.a-select-field__item-copy {
  min-width: 0;
  display: grid;
  gap: 0.1rem;
}

.a-select-field__item-text {
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 500;
}

.a-select-field__item-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.a-select-field__item-indicator {
  color: var(--admin-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-select-field__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-select-field--floating .a-select-field__floating-label {
  position: absolute;
  left: 0.54rem;
  top: 0;
  transform: translateY(-50%);
  background: var(--admin-surface);
  padding: 0 0.22rem;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  pointer-events: none;
  z-index: 1;
}

.a-select-field--floating .a-select-field__floating-frame {
  position: absolute;
  inset: 0;
  margin: 0;
  border: 1.5px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-sm);
  pointer-events: none;
}

.a-select-field--floating .a-select-field__floating-frame legend {
  visibility: hidden;
  max-width: 100%;
  white-space: nowrap;
  padding: 0 0.22rem;
}
</style>
