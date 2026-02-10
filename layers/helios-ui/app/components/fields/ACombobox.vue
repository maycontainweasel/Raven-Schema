<script setup lang="ts">
import { computed, watch } from 'vue'
import { Combobox, useListCollection } from '@ark-ui/vue/combobox'
import { Highlight } from '@ark-ui/vue/highlight'
import { useFilter } from '@ark-ui/vue/locale'

export type AComboboxOption = {
  label: string
  value: string
  group?: string
  disabled?: boolean
}

const model = defineModel<string | string[] | null>({ default: null })
const emit = defineEmits<{
  (event: 'input-value-change', query: string): void
}>()

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    helperText?: string
    errorText?: string
    options: AComboboxOption[]
    multiple?: boolean
    grouped?: boolean
    highlightMatch?: boolean
    clearable?: boolean
    showIndicator?: boolean
    emptyText?: string
    disabled?: boolean
  }>(),
  {
    placeholder: '',
    helperText: '',
    errorText: '',
    multiple: false,
    grouped: false,
    highlightMatch: false,
    clearable: true,
    showIndicator: true,
    emptyText: 'No options found.',
    disabled: false,
  },
)

const filters = useFilter({ sensitivity: 'base' })

const { collection, filter, set } = useListCollection<AComboboxOption>({
  initialItems: props.options,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
  filter: (itemText, queryText) => filters.value.contains(itemText, queryText),
  groupBy: props.grouped
    ? (item) => item.group || 'General'
    : undefined,
})

watch(
  () => props.options,
  (next) => {
    set(next || [])
  },
  { deep: true },
)

const normalizeSelection = (next: unknown): string[] => {
  if (Array.isArray(next)) return next.filter((item): item is string => typeof item === 'string')
  if (typeof next === 'string') return next.length > 0 ? [next] : []
  return []
}

const selectionValue = computed<string[]>({
  get: () => {
    if (props.multiple) return Array.isArray(model.value) ? model.value : []
    if (typeof model.value === 'string' && model.value.length > 0) return [model.value]
    return []
  },
  set: (next) => {
    const normalized = normalizeSelection(next)
    if (props.multiple) {
      model.value = [...normalized]
      return
    }
    model.value = normalized[0] ?? ''
  },
})

const handleModelValueUpdate = (next: string[]) => {
  selectionValue.value = next
}

const handleValueChange = (details: { value: string[] }) => {
  selectionValue.value = details.value
}

const optionLabelByValue = computed(() => {
  const map = new Map<string, string>()
  for (const item of props.options || []) {
    map.set(item.value, item.label)
  }
  return map
})

const itemToString = (item: AComboboxOption | null) => item?.label ?? ''
const itemToValue = (item: AComboboxOption | null) => item?.value ?? ''
const isItemDisabled = (item: AComboboxOption | null) => Boolean(item?.disabled)

const removeTag = (current: string[], target: string) => current.filter((valueItem) => valueItem !== target)

const handleInputChange = (details: { inputValue: string }) => {
  filter(details.inputValue)
  emit('input-value-change', details.inputValue)
}

const positioning = {
  placement: 'bottom-start',
  sameWidth: true,
  gutter: 8,
} as const
</script>

<template>
  <Combobox.Root
    :model-value="selectionValue"
    :collection="collection"
    :multiple="multiple"
    :close-on-select="!multiple"
    :item-to-string="itemToString"
    :item-to-value="itemToValue"
    :is-item-disabled="isItemDisabled"
    :positioning="positioning"
    :disabled="disabled"
    @update:model-value="handleModelValueUpdate"
    @value-change="handleValueChange"
    @input-value-change="handleInputChange"
    class="a-field a-combobox-field"
  >
    <Combobox.Label class="a-field__label">{{ label }}</Combobox.Label>

    <Combobox.Context v-if="multiple" v-slot="context">
      <div v-if="context.value.length" class="a-combobox-field__tags">
        <span v-for="itemValue in context.value" :key="itemValue" class="a-combobox-field__tag">
          {{ optionLabelByValue.get(itemValue) || itemValue }}
          <button
            type="button"
            class="a-combobox-field__tag-clear"
            @click.stop="context.setValue(removeTag(context.value, itemValue))"
          >
            <i class="i-lucide-x h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
    </Combobox.Context>

    <Combobox.Control class="a-input-wrap a-combobox-field__control">
      <i class="i-lucide-search h-4 w-4 a-combobox-field__icon" aria-hidden="true" />

      <Combobox.Input class="a-input" :placeholder="placeholder" autocomplete="off" />

      <Combobox.ClearTrigger v-if="clearable" class="a-combobox-field__control-btn" aria-label="Clear value">
        <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
      </Combobox.ClearTrigger>

      <Combobox.Trigger class="a-combobox-field__control-btn" aria-label="Toggle combobox">
        <i class="i-lucide-chevron-down h-4 w-4" aria-hidden="true" />
      </Combobox.Trigger>
    </Combobox.Control>

    <p v-if="helperText && !errorText" class="a-combobox-field__helper">{{ helperText }}</p>
    <p v-if="errorText" class="a-combobox-field__error">{{ errorText }}</p>

    <Teleport to="body">
      <Combobox.Positioner>
        <Combobox.Content class="a-combobox-field__content">
          <template v-if="grouped">
            <Combobox.ItemGroup v-for="[groupName, groupItems] in collection.group()" :key="groupName">
              <Combobox.ItemGroupLabel class="a-combobox-field__group-label">
                {{ groupName }}
              </Combobox.ItemGroupLabel>
              <Combobox.Item
                v-for="item in groupItems"
                :key="item.value"
                :item="item"
                class="a-combobox-field__item"
              >
                <Combobox.ItemText class="a-combobox-field__item-text">
                  <Combobox.Context v-if="highlightMatch" v-slot="context">
                    <Highlight
                      :text="item.label"
                      :query="context.inputValue"
                      ignore-case
                      class="a-combobox-field__highlight"
                    />
                  </Combobox.Context>
                  <template v-else>
                    {{ item.label }}
                  </template>
                </Combobox.ItemText>
                <Combobox.ItemIndicator v-if="showIndicator" class="a-combobox-field__indicator">
                  <i class="i-lucide-check h-4 w-4" aria-hidden="true" />
                </Combobox.ItemIndicator>
              </Combobox.Item>
            </Combobox.ItemGroup>
          </template>

          <template v-else>
            <Combobox.Item
              v-for="item in collection.items"
              :key="item.value"
              :item="item"
              class="a-combobox-field__item"
            >
              <Combobox.ItemText class="a-combobox-field__item-text">
                <Combobox.Context v-if="highlightMatch" v-slot="context">
                  <Highlight
                    :text="item.label"
                    :query="context.inputValue"
                    ignore-case
                    class="a-combobox-field__highlight"
                  />
                </Combobox.Context>
                <template v-else>
                  {{ item.label }}
                </template>
              </Combobox.ItemText>
              <Combobox.ItemIndicator v-if="showIndicator" class="a-combobox-field__indicator">
                <i class="i-lucide-check h-4 w-4" aria-hidden="true" />
              </Combobox.ItemIndicator>
            </Combobox.Item>
          </template>

          <div v-if="collection.items.length === 0" class="a-combobox-field__empty">
            {{ emptyText }}
          </div>
        </Combobox.Content>
      </Combobox.Positioner>
    </Teleport>
  </Combobox.Root>
</template>

<style scoped>
.a-combobox-field {
  gap: 0.35rem;
}

.a-combobox-field__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
}

.a-combobox-field__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border-radius: var(--admin-radius-pill);
  background: var(--admin-surface-soft);
  color: var(--admin-text-soft);
  border: 1px solid var(--admin-border);
  padding: 0.2rem 0.45rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
}

.a-combobox-field__tag-clear {
  border: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.a-combobox-field__control {
  width: 100%;
}

.a-combobox-field__icon {
  color: var(--admin-muted-2);
}

.a-combobox-field__control-btn {
  border: 0;
  background: transparent;
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  cursor: pointer;
  padding: 0;
}

.a-combobox-field__helper,
.a-combobox-field__error {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-combobox-field__helper {
  color: var(--admin-muted);
}

.a-combobox-field__error {
  color: #b42318;
}

.a-combobox-field__content {
  max-height: 16rem;
  overflow: auto;
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  box-shadow: 0 18px 34px rgba(17, 32, 62, 0.16);
  padding: 0.32rem;
  z-index: 1600;
}

.a-combobox-field__group-label {
  padding: 0.4rem 0.5rem 0.24rem;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.74rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.a-combobox-field__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-sm);
  padding: 0.42rem 0.5rem;
  color: var(--admin-text);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.a-combobox-field__item[data-highlighted],
.a-combobox-field__item:hover {
  background: var(--admin-surface-soft);
}

.a-combobox-field__item[data-state='checked'] {
  background: color-mix(in srgb, var(--admin-brand) 12%, var(--admin-surface));
  border-color: color-mix(in srgb, var(--admin-brand) 35%, transparent);
}

.a-combobox-field__item[data-state='checked'][data-highlighted],
.a-combobox-field__item[data-state='checked']:hover {
  background: color-mix(in srgb, var(--admin-brand) 20%, var(--admin-surface));
}

.a-combobox-field__item-text {
  min-width: 0;
  font-size: var(--fs--075, 0.86rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.a-combobox-field__item[data-state='checked'] .a-combobox-field__item-text {
  font-weight: 650;
}

.a-combobox-field__indicator {
  color: var(--admin-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.84);
  transition: opacity 120ms ease, transform 120ms ease;
}

.a-combobox-field__item[data-state='checked'] .a-combobox-field__indicator {
  opacity: 1;
  transform: scale(1);
}

.a-combobox-field__empty {
  color: var(--admin-muted);
  font-size: var(--fs--075, 0.86rem);
  padding: 0.58rem 0.52rem;
}

.a-combobox-field__highlight :deep(mark) {
  background: color-mix(in srgb, var(--admin-brand) 18%, transparent);
  color: var(--admin-text);
  font-weight: 700;
  border-radius: 0.2rem;
  padding: 0 0.12rem;
}
</style>
