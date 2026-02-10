<script setup lang="ts">
import { computed, watch } from 'vue'
import { Combobox, useCombobox, useListCollection } from '@ark-ui/vue/combobox'
import { useFilter } from '@ark-ui/vue/locale'
import { TagsInput, useTagsInput } from '@ark-ui/vue/tags-input'

export type ATagsInputOption = {
  label: string
  value: string
  disabled?: boolean
}

const model = defineModel<string[]>({ default: [] })

const props = withDefaults(
  defineProps<{
    label: string
    options?: ATagsInputOption[]
    placeholder?: string
    helperText?: string
    errorText?: string
    withCombobox?: boolean
    clearable?: boolean
    emptyText?: string
    delimiter?: string | RegExp
    max?: number
    allowOverflow?: boolean
    addOnPaste?: boolean
    blurBehavior?: 'clear' | 'add'
    disabled?: boolean
    readOnly?: boolean
    required?: boolean
  }>(),
  {
    options: () => [],
    placeholder: 'Add tag',
    helperText: '',
    errorText: '',
    withCombobox: false,
    clearable: true,
    emptyText: 'No available options',
    delimiter: ',',
    max: Number.POSITIVE_INFINITY,
    allowOverflow: true,
    addOnPaste: true,
    blurBehavior: 'add',
    disabled: false,
    readOnly: false,
    required: false,
  },
)

const normalizeValues = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  const clean: string[] = []
  const seen = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const normalized = entry.trim()
    if (!normalized || seen.has(normalized)) continue
    clean.push(normalized)
    seen.add(normalized)
  }
  return clean
}

const setModel = (next: unknown) => {
  model.value = normalizeValues(next)
}

const normalizedOptions = computed<ATagsInputOption[]>(() => {
  const output: ATagsInputOption[] = []
  const seen = new Set<string>()
  for (const option of props.options || []) {
    if (!option || typeof option.value !== 'string') continue
    const value = option.value.trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    output.push({
      label: typeof option.label === 'string' && option.label.trim().length > 0 ? option.label : value,
      value,
      disabled: Boolean(option.disabled),
    })
  }
  return output
})

const filters = useFilter({ sensitivity: 'base' })

const { collection, filter, set } = useListCollection<ATagsInputOption>({
  initialItems: normalizedOptions.value,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value,
  filter: (itemText, queryText) => filters.value.contains(itemText, queryText),
})

watch(
  () => normalizedOptions.value,
  (next) => {
    set(next)
  },
  { deep: true },
)

watch(
  () => model.value,
  (next) => {
    const normalized = normalizeValues(next)
    if (normalized.join('|') !== next.join('|')) {
      model.value = normalized
    }
  },
  { deep: true },
)

const tagsInput = useTagsInput(
  computed(() => ({
    modelValue: model.value,
    delimiter: props.delimiter,
    max: props.max,
    allowOverflow: props.allowOverflow,
    addOnPaste: props.addOnPaste,
    blurBehavior: props.blurBehavior,
    disabled: props.disabled,
    readOnly: props.readOnly,
    required: props.required,
    invalid: Boolean(props.errorText),
    onValueChange: (details: { value: string[] }) => setModel(details.value),
  })),
)

const positioning = {
  placement: 'bottom-start',
  sameWidth: true,
  gutter: 8,
} as const

const combobox = useCombobox<ATagsInputOption>(
  computed(() => ({
    collection: collection.value,
    disabled: props.disabled,
    positioning,
    openOnClick: true,
    selectionBehavior: 'clear',
    onInputValueChange: (details: { inputValue: string }) => {
      filter(details.inputValue)
    },
    onValueChange: (details: { value: string[] }) => {
      const itemValue = details.value[0]
      if (!itemValue) return
      if (!tagsInput.value.value.includes(itemValue)) {
        tagsInput.value.addValue(itemValue)
      }
      queueMicrotask(() => {
        combobox.value.clearValue()
        combobox.value.setInputValue('')
      })
    },
  })),
)

const availableItems = computed(() => {
  const selected = new Set(tagsInput.value.value)
  return collection.value.items.filter((item) => !selected.has(item.value))
})
</script>

<template>
  <TagsInput.RootProvider :value="tagsInput" class="a-field a-tags-input-field">
    <TagsInput.Label class="a-field__label">{{ label }}</TagsInput.Label>

    <Combobox.RootProvider v-if="withCombobox" :value="combobox">
      <Combobox.Control class="a-tags-input-field__combobox-control">
        <TagsInput.Control class="a-tags-input-field__control a-tags-input-field__control--combobox">
          <TagsInput.Item
            v-for="(value, index) in tagsInput.value"
            :key="`${value}-${index}`"
            :index="index"
            :value="value"
            class="a-tags-input-field__tag"
          >
            <TagsInput.ItemPreview class="a-tags-input-field__tag-preview">
              <TagsInput.ItemText>{{ value }}</TagsInput.ItemText>
              <TagsInput.ItemDeleteTrigger
                class="a-tags-input-field__tag-delete"
                :aria-label="`Remove ${value}`"
              >
                <i class="i-lucide-x h-3 w-3" aria-hidden="true" />
              </TagsInput.ItemDeleteTrigger>
            </TagsInput.ItemPreview>
            <TagsInput.ItemInput class="a-tags-input-field__tag-input" />
          </TagsInput.Item>

          <Combobox.Input
            :placeholder="placeholder"
            class="a-tags-input-field__input"
            autocomplete="off"
          />
        </TagsInput.Control>

        <Combobox.Trigger class="a-tags-input-field__control-btn" aria-label="Toggle options">
          <i class="i-lucide-chevron-down h-4 w-4" aria-hidden="true" />
        </Combobox.Trigger>
      </Combobox.Control>

      <Teleport to="body">
        <Combobox.Positioner>
          <Combobox.Content class="a-tags-input-field__content">
            <Combobox.Item
              v-for="item in availableItems"
              :key="item.value"
              :item="item"
              class="a-tags-input-field__item"
            >
              <Combobox.ItemText class="a-tags-input-field__item-text">
                {{ item.label }}
              </Combobox.ItemText>
              <Combobox.ItemIndicator class="a-tags-input-field__item-indicator">
                <i class="i-lucide-check h-4 w-4" aria-hidden="true" />
              </Combobox.ItemIndicator>
            </Combobox.Item>

            <div v-if="availableItems.length === 0" class="a-tags-input-field__empty">
              {{ emptyText }}
            </div>
          </Combobox.Content>
        </Combobox.Positioner>
      </Teleport>
    </Combobox.RootProvider>

    <TagsInput.Control v-else class="a-tags-input-field__control">
      <TagsInput.Item
        v-for="(value, index) in tagsInput.value"
        :key="`${value}-${index}`"
        :index="index"
        :value="value"
        class="a-tags-input-field__tag"
      >
        <TagsInput.ItemPreview class="a-tags-input-field__tag-preview">
          <TagsInput.ItemText>{{ value }}</TagsInput.ItemText>
          <TagsInput.ItemDeleteTrigger class="a-tags-input-field__tag-delete" :aria-label="`Remove ${value}`">
            <i class="i-lucide-x h-3 w-3" aria-hidden="true" />
          </TagsInput.ItemDeleteTrigger>
        </TagsInput.ItemPreview>
        <TagsInput.ItemInput class="a-tags-input-field__tag-input" />
      </TagsInput.Item>

      <TagsInput.Input
        :placeholder="placeholder"
        class="a-tags-input-field__input"
        autocomplete="off"
      />
    </TagsInput.Control>

    <TagsInput.ClearTrigger
      v-if="clearable && tagsInput.value.length > 0"
      class="a-tags-input-field__clear"
    >
      Clear all
    </TagsInput.ClearTrigger>

    <p v-if="helperText && !errorText" class="a-tags-input-field__helper">{{ helperText }}</p>
    <p v-if="errorText" class="a-tags-input-field__error">{{ errorText }}</p>

    <TagsInput.HiddenInput />
  </TagsInput.RootProvider>
</template>

<style scoped>
.a-tags-input-field {
  gap: 0.35rem;
}

.a-tags-input-field__combobox-control {
  position: relative;
}

.a-tags-input-field__control {
  width: 100%;
  min-height: 2.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.34rem;
  border: 1.5px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  padding: 0.35rem 0.42rem;
  transition: border-color 0ms linear, background 0ms linear;
}

.a-tags-input-field__control--combobox {
  padding-right: 2.35rem;
}

.a-tags-input-field__control[data-focus] {
  border-color: color-mix(in srgb, var(--admin-brand) 56%, var(--admin-border-strong) 44%);
  background: var(--admin-surface);
}

.a-tags-input-field__tag {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.a-tags-input-field__tag-preview {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-pill);
  background: var(--admin-surface-soft);
  color: var(--admin-text-soft);
  padding: 0.2rem 0.42rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  line-height: 1;
}

.a-tags-input-field__tag-delete {
  border: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.a-tags-input-field__tag-input {
  min-width: 1px;
  width: 0;
  padding: 0;
  border: 0;
  background: transparent;
}

.a-tags-input-field__input {
  flex: 1;
  min-width: 8rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  padding: 0.16rem 0.12rem;
}

.a-tags-input-field__input::placeholder {
  color: var(--admin-muted-2);
}

.a-tags-input-field__control-btn {
  position: absolute;
  right: 0.44rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.6rem;
  height: 1.6rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-tags-input-field__control-btn:hover {
  background: var(--admin-surface-soft);
  color: var(--admin-text-soft);
}

.a-tags-input-field__clear {
  width: fit-content;
  border: 0;
  background: transparent;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.a-tags-input-field__clear:hover {
  color: var(--admin-text-soft);
}

.a-tags-input-field__helper,
.a-tags-input-field__error {
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.3;
}

.a-tags-input-field__helper {
  color: var(--admin-muted);
}

.a-tags-input-field__error {
  color: #b42318;
}

.a-tags-input-field__content {
  max-height: 16rem;
  overflow: auto;
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  box-shadow: 0 18px 34px rgba(17, 32, 62, 0.16);
  padding: 0.32rem;
  z-index: 1600;
}

.a-tags-input-field__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-sm);
  padding: 0.42rem 0.5rem;
  color: var(--admin-text);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.a-tags-input-field__item[data-highlighted],
.a-tags-input-field__item:hover {
  background: var(--admin-surface-soft);
}

.a-tags-input-field__item[data-state='checked'] {
  background: color-mix(in srgb, var(--admin-brand) 12%, var(--admin-surface));
  border-color: color-mix(in srgb, var(--admin-brand) 35%, transparent);
}

.a-tags-input-field__item-text {
  font-size: var(--fs--075, 0.86rem);
  color: var(--admin-text);
}

.a-tags-input-field__item-indicator {
  color: var(--admin-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-tags-input-field__empty {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  padding: 0.5rem;
}
</style>
