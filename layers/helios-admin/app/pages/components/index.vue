<script setup lang="ts">

definePageMeta({
  title: 'Components'
})

type FieldStatus = 'ready' | 'in-progress' | 'planned'

type FieldSpecItem = {
  key: string
  type: string
  note: string
}

type FieldVariant = {
  id: string
  label: string
  status: FieldStatus
  note?: string
}

type FieldEntry = {
  id: string
  label: string
  description: string
  status: FieldStatus
  category: string
  connectors: FieldSpecItem[]
  variants: FieldVariant[]
}

const sections = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Baseline guidance and contribution rules.'
  },
  {
    id: 'fields',
    label: 'Fields',
    description: 'Input components and data connectors.'
  }
]

const activeSection = ref('fields')

const fieldEntries: FieldEntry[] = [
  {
    id: 'text',
    label: 'Text input',
    description: 'Single-line string input for identifiers and labels.',
    status: 'ready',
    category: 'Inputs',
    connectors: [
      { key: 'value', type: 'string', note: 'Bound via v-model.' },
      { key: 'placeholder', type: 'string', note: 'Optional helper text.' },
      { key: 'disabled', type: 'boolean', note: 'Locks the field.' },
      { key: 'helper', type: 'string', note: 'Optional helper copy.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' },
      { id: 'with-helper', label: 'Helper text', status: 'ready' },
      { id: 'inline', label: 'Inline compact', status: 'planned' }
    ]
  },
  {
    id: 'textarea',
    label: 'Textarea',
    description: 'Multiline content entry.',
    status: 'ready',
    category: 'Inputs',
    connectors: [
      { key: 'value', type: 'string', note: 'Bound via v-model.' },
      { key: 'rows', type: 'number', note: 'Visible rows.' },
      { key: 'maxLength', type: 'number', note: 'Optional character limit.' },
      { key: 'helper', type: 'string', note: 'Optional helper copy.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' },
      { id: 'with-limit', label: 'Limit counter', status: 'planned' }
    ]
  },
  {
    id: 'number',
    label: 'Number input',
    description: 'Numeric entry with min/max support.',
    status: 'ready',
    category: 'Inputs',
    connectors: [
      { key: 'value', type: 'number', note: 'Bound via v-model.' },
      { key: 'min', type: 'number', note: 'Minimum allowed value.' },
      { key: 'max', type: 'number', note: 'Maximum allowed value.' },
      { key: 'step', type: 'number', note: 'Increment step.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' },
      { id: 'stepper', label: 'Stepper controls', status: 'planned' }
    ]
  },
  {
    id: 'select',
    label: 'Select (native)',
    description: 'Single-value selection with native select.',
    status: 'ready',
    category: 'Selection',
    connectors: [
      { key: 'value', type: 'string | number', note: 'Bound via v-model.' },
      { key: 'options', type: 'Array<{ label, value }>', note: 'Available choices.' },
      { key: 'placeholder', type: 'string', note: 'Empty state label.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' },
      { id: 'grouped', label: 'Grouped', status: 'planned' }
    ]
  },
  {
    id: 'listbox',
    label: 'Listbox',
    description: 'Headless listbox field with optional multi-select.',
    status: 'ready',
    category: 'Selection',
    connectors: [
      { key: 'modelValue', type: 'any | any[]', note: 'Bound via v-model.' },
      { key: 'options', type: 'Array<any>', note: 'Listbox options.' },
      { key: 'multiple', type: 'boolean', note: 'Enable multi-select.' },
      { key: 'valueKey', type: 'string', note: 'Option value key.' }
    ],
    variants: [
      { id: 'single', label: 'Single', status: 'ready' },
      { id: 'multi', label: 'Multiple', status: 'ready' }
    ]
  },
  {
    id: 'combobox',
    label: 'Combobox',
    description: 'Searchable select with optional multi-select.',
    status: 'ready',
    category: 'Selection',
    connectors: [
      { key: 'modelValue', type: 'any | any[]', note: 'Bound via v-model.' },
      { key: 'options', type: 'Array<any>', note: 'Combobox options.' },
      { key: 'multiple', type: 'boolean', note: 'Enable multi-select.' },
      { key: 'filterFn', type: '(option, query) => boolean', note: 'Optional filter.' }
    ],
    variants: [
      { id: 'single', label: 'Single', status: 'ready' },
      { id: 'multi', label: 'Multiple', status: 'ready' }
    ]
  },
  {
    id: 'checkbox',
    label: 'Checkbox',
    description: 'Binary toggle or multi-select option.',
    status: 'ready',
    category: 'Selection',
    connectors: [
      { key: 'checked', type: 'boolean', note: 'Bound via v-model.' },
      { key: 'label', type: 'string', note: 'Displayed label.' },
      { key: 'disabled', type: 'boolean', note: 'Locks the field.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' },
      { id: 'indeterminate', label: 'Indeterminate', status: 'planned' }
    ]
  },
  {
    id: 'radio',
    label: 'Radio group',
    description: 'Exclusive choice within a small set.',
    status: 'planned',
    category: 'Selection',
    connectors: [
      { key: 'value', type: 'string', note: 'Bound via v-model.' },
      { key: 'options', type: 'Array<{ label, value }>', note: 'Radio options.' },
      { key: 'layout', type: 'row | column', note: 'Visual layout.' }
    ],
    variants: [
      { id: 'inline', label: 'Inline', status: 'planned' },
      { id: 'stacked', label: 'Stacked', status: 'planned' }
    ]
  },
  {
    id: 'switch',
    label: 'Switch',
    description: 'Binary toggle with immediate action.',
    status: 'planned',
    category: 'Selection',
    connectors: [
      { key: 'checked', type: 'boolean', note: 'Bound via v-model.' },
      { key: 'label', type: 'string', note: 'Displayed label.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'planned' },
      { id: 'compact', label: 'Compact', status: 'planned' }
    ]
  },
  {
    id: 'date',
    label: 'Date picker',
    description: 'Calendar-based date selection.',
    status: 'ready',
    category: 'Inputs',
    connectors: [
      { key: 'modelValue', type: 'Date | null', note: 'Bound via v-model.' },
      { key: 'min', type: 'Date', note: 'Minimum date.' },
      { key: 'max', type: 'Date', note: 'Maximum date.' },
      { key: 'allowClear', type: 'boolean', note: 'Allow clearing selection.' }
    ],
    variants: [
      { id: 'date-only', label: 'Date only', status: 'ready' },
      { id: 'date-range', label: 'Date range', status: 'planned' }
    ]
  },
  {
    id: 'wysiwyg',
    label: 'WYSIWYG (mini)',
    description: 'Minimal rich text editor for short-form content.',
    status: 'ready',
    category: 'Inputs',
    connectors: [
      { key: 'modelValue', type: 'string', note: 'HTML string via v-model.' },
      { key: 'placeholder', type: 'string', note: 'Optional placeholder text.' },
      { key: 'showHtmlToggle', type: 'boolean', note: 'Toggle HTML mode.' },
      { key: 'minHeight', type: 'string', note: 'Min height for the editor.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' }
    ]
  },
  {
    id: 'file',
    label: 'File upload',
    description: 'Single or multi-file uploads.',
    status: 'planned',
    category: 'Advanced',
    connectors: [
      { key: 'value', type: 'File | File[]', note: 'Selected files.' },
      { key: 'accept', type: 'string', note: 'Allowed mime types.' },
      { key: 'maxSize', type: 'number', note: 'Optional size guard.' }
    ],
    variants: [
      { id: 'single', label: 'Single file', status: 'planned' },
      { id: 'multi', label: 'Multi file', status: 'planned' }
    ]
  },
  {
    id: 'taxonomy-chips',
    label: 'Taxonomy chips',
    description: 'Flat taxonomy multi-select with chips and free create.',
    status: 'ready',
    category: 'Taxonomies',
    connectors: [
      { key: 'modelValue', type: 'Array<{ slug, label }>', note: 'Selected terms.' },
      { key: 'options', type: 'Array<{ slug, label }>', note: 'Available terms.' },
      { key: 'placeholder', type: 'string', note: 'Input placeholder.' },
      { key: 'allowCreate', type: 'boolean', note: 'Allow new terms.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' }
    ]
  },
  {
    id: 'taxonomy-manager',
    label: 'Taxonomy manager',
    description: 'Hierarchical taxonomy picker with manager dialog.',
    status: 'ready',
    category: 'Taxonomies',
    connectors: [
      { key: 'selectedIds', type: 'string[]', note: 'Selected term IDs.' },
      { key: 'terms', type: 'TaxonomyTerm[]', note: 'Available terms.' },
      { key: 'allowCreate', type: 'boolean', note: 'Allow new terms.' },
      { key: 'buttonLabel', type: 'string', note: 'Button text.' }
    ],
    variants: [
      { id: 'default', label: 'Default', status: 'ready' }
    ]
  }
]

const fieldGroups = computed(() => {
  const groups = new Map<string, FieldEntry[]>()
  fieldEntries.forEach((field) => {
    if (!groups.has(field.category)) groups.set(field.category, [])
    groups.get(field.category)?.push(field)
  })
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }))
})

const activeFieldId = ref(fieldEntries.find((field) => field.status !== 'planned')?.id ?? fieldEntries[0]?.id ?? '')

const activeField = computed(() => fieldEntries.find((field) => field.id === activeFieldId.value))

const statusClass: Record<FieldStatus, string> = {
  ready: 'badge badge-success',
  'in-progress': 'badge badge-warning',
  planned: 'badge badge-ghost'
}

const setActiveField = (field: FieldEntry) => {
  if (field.status === 'planned') return
  activeFieldId.value = field.id
}

const demoOptions = [
  { label: 'Option one', value: 'option-1' },
  { label: 'Option two', value: 'option-2' },
  { label: 'Option three', value: 'option-3' }
]

const demoTagOptions = [
  { slug: 'core', label: 'Core' },
  { slug: 'cardio', label: 'Cardiology' },
  { slug: 'resp', label: 'Respiratory' },
  { slug: 'derm', label: 'Dermatology' }
]

const demoTaxonomyTerms = ref([
  { key: 'core', label: 'Core' },
  { key: 'cardio', label: 'Cardiology' },
  { key: 'resp', label: 'Respiratory' },
  { key: 'derm', label: 'Dermatology' },
  { key: 'cardio-arr', label: 'Arrhythmia', parent: 'cardio' },
  { key: 'cardio-isch', label: 'Ischaemia', parent: 'cardio' },
  { key: 'resp-asth', label: 'Asthma', parent: 'resp' }
])

const demoState = reactive({
  text: 'PassMed reference',
  textarea: 'Longer content goes here.',
  number: 42,
  select: 'option-1',
  listbox: 'option-2',
  listboxMulti: ['option-1'],
  combobox: 'option-1',
  comboboxMulti: ['option-2', 'option-3'],
  checkbox: true,
  date: null as Date | null,
  wysiwyg: '<p>Write a question stem here.</p>',
  taxonomyChips: [{ slug: 'core', label: 'Core' }],
  taxonomyManager: ['core', 'cardio']
})
</script>

<template>
  <div class="flex h-full w-full">
    <aside class="w-72 border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div class="px-4 py-4">
        <h2 class="text-lg font-semibold">Components</h2>
        <p class="text-sm text-muted">Internal UI inventory and field connectors.</p>
      </div>

      <nav class="space-y-2 px-3 pb-6">
        <button
          v-for="section in sections"
          :key="section.id"
          class="w-full rounded-md border px-3 py-2 text-left text-sm transition"
          :class="activeSection === section.id
            ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)] text-[var(--color-primary)]'
            : 'border-transparent text-muted hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'"
          @click="activeSection = section.id"
        >
          <div class="font-semibold">{{ section.label }}</div>
          <div class="text-xs text-muted">{{ section.description }}</div>
        </button>
      </nav>
    </aside>

    <section class="flex-1 overflow-y-auto bg-[var(--color-surface-muted)]">
      <div class="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
        <h1 class="text-xl font-semibold">{{ activeSection === 'fields' ? 'Field Library' : 'Components' }}</h1>
        <p class="text-sm text-muted">
          {{ activeSection === 'fields'
            ? 'Choose a field to view the connector spec and examples.'
            : 'Start here when adding new primitives or field types.'
          }}
        </p>
      </div>

      <div v-if="activeSection === 'overview'" class="p-6 space-y-4">
        <div class="card">
          <div class="card-body space-y-2">
            <div class="card-title">What belongs here</div>
            <p class="text-sm text-muted">
              This space documents the component system that feeds admin page generation. Each field entry should
              capture the data connectors, default props, and usage notes.
            </p>
          </div>
        </div>
        <div class="card">
          <div class="card-body space-y-3">
            <div class="card-title">Contribution checklist</div>
            <ul class="list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Define the data connectors (props + payload shape).</li>
              <li>Document the variants and when to use them.</li>
              <li>Provide a live example for the default variant.</li>
              <li>Mark planned items as disabled.</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else class="p-6">
        <div class="grid gap-6 lg:grid-cols-[280px,1fr]">
          <div class="card">
            <div class="card-body space-y-4">
              <div class="card-title">Field catalog</div>
              <div v-for="group in fieldGroups" :key="group.label" class="space-y-2">
                <div class="text-xs font-semibold uppercase tracking-wide text-muted">
                  {{ group.label }}
                </div>
                <div class="space-y-2">
                  <button
                    v-for="field in group.items"
                    :key="field.id"
                    class="w-full rounded-md border px-3 py-2 text-left transition"
                    :class="[
                      activeFieldId === field.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
                      field.status === 'planned' ? 'opacity-60 cursor-not-allowed' : ''
                    ]"
                    :disabled="field.status === 'planned'"
                    @click="setActiveField(field)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-sm font-semibold">{{ field.label }}</span>
                      <span :class="statusClass[field.status]">{{ field.status }}</span>
                    </div>
                    <p class="mt-1 text-xs text-muted">{{ field.description }}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeField" class="space-y-4">
            <div class="card">
              <div class="card-body space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="card-title">{{ activeField.label }}</div>
                  <span :class="statusClass[activeField.status]">{{ activeField.status }}</span>
                </div>
                <p class="text-sm text-muted">{{ activeField.description }}</p>
              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <div class="card-title">Connectors</div>
                <div class="mt-3 space-y-3">
                  <div
                    v-for="connector in activeField.connectors"
                    :key="connector.key"
                    class="flex flex-wrap gap-3 border-b border-dashed border-[var(--color-border)] pb-2"
                  >
                    <div class="w-28 text-xs font-semibold uppercase text-muted">{{ connector.key }}</div>
                    <div class="flex-1 text-sm text-muted">
                      <span class="font-semibold text-[var(--color-text)]">{{ connector.type }}</span> —
                      {{ connector.note }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-body">
                <div class="card-title">Variants</div>
                <div class="mt-3 space-y-2">
                  <div v-for="variant in activeField.variants" :key="variant.id" class="flex items-center gap-2">
                    <span :class="statusClass[variant.status]">{{ variant.status }}</span>
                    <span class="text-sm font-semibold">{{ variant.label }}</span>
                    <span v-if="variant.note" class="text-xs text-muted">— {{ variant.note }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-body space-y-4">
                <div class="card-title">Live example</div>

                <div
                  v-if="activeField.status === 'planned'"
                  class="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-muted"
                >
                  This field is planned. Add the component before enabling.
                </div>

                <template v-else-if="activeField.id === 'text'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Label</label>
                    <input v-model="demoState.text" class="input" placeholder="Enter text" />
                    <p class="text-xs text-muted">Helper text for validation or hints.</p>
                  </div>
                  <div class="text-xs text-muted">Value: {{ demoState.text }}</div>
                </template>

                <template v-else-if="activeField.id === 'textarea'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Message</label>
                    <textarea v-model="demoState.textarea" class="textarea" rows="4" placeholder="Enter content"></textarea>
                  </div>
                  <div class="text-xs text-muted">Length: {{ demoState.textarea.length }} chars</div>
                </template>

                <template v-else-if="activeField.id === 'number'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Quantity</label>
                    <input v-model.number="demoState.number" type="number" class="input" min="0" step="1" />
                    <p class="text-xs text-muted">Use min/max for guard rails.</p>
                  </div>
                  <div class="text-xs text-muted">Value: {{ demoState.number }}</div>
                </template>

                <template v-else-if="activeField.id === 'select'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Status</label>
                    <select v-model="demoState.select" class="select">
                      <option disabled value="">Select an option</option>
                      <option v-for="option in demoOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                  <div class="text-xs text-muted">Selected: {{ demoState.select }}</div>
                </template>

                <template v-else-if="activeField.id === 'listbox'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Single select</label>
                    <UiListbox v-model="demoState.listbox" :options="demoOptions" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Multi select</label>
                    <UiListbox v-model="demoState.listboxMulti" :options="demoOptions" multiple />
                  </div>
                </template>

                <template v-else-if="activeField.id === 'combobox'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Single select</label>
                    <UiCombobox v-model="demoState.combobox" :options="demoOptions" />
                  </div>
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Multi select</label>
                    <UiCombobox v-model="demoState.comboboxMulti" :options="demoOptions" multiple />
                  </div>
                </template>

                <template v-else-if="activeField.id === 'checkbox'">
                  <label class="flex items-center gap-2 text-sm">
                    <input v-model="demoState.checkbox" type="checkbox" class="h-4 w-4 accent-[var(--color-primary)]" />
                    Enable notifications
                  </label>
                  <div class="text-xs text-muted">Checked: {{ demoState.checkbox }}</div>
                </template>

                <template v-else-if="activeField.id === 'date'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Select date</label>
                    <UiDatePicker v-model="demoState.date" allow-clear />
                  </div>
                  <div class="text-xs text-muted">Value: {{ demoState.date ? demoState.date.toDateString() : 'None' }}</div>
                </template>

                <template v-else-if="activeField.id === 'wysiwyg'">
                  <div class="space-y-2">
                    <label class="text-xs font-semibold uppercase text-muted">Question stem</label>
                    <UiMiniWysiwyg
                      v-model="demoState.wysiwyg"
                      placeholder="Write the question stem..."
                      :show-html-toggle="true"
                      min-height="160px"
                    />
                  </div>
                  <div class="text-xs text-muted">HTML: {{ demoState.wysiwyg }}</div>
                </template>

                <template v-else-if="activeField.id === 'taxonomy-chips'">
                  <div class="space-y-3 max-w-xl">
                    <label class="text-xs font-semibold uppercase text-muted">Tags</label>
                    <TaxonomyChipsField
                      v-model="demoState.taxonomyChips"
                      :options="demoTagOptions"
                      placeholder="Search or add terms…"
                    />
                    <div class="text-xs text-muted">
                      Selected: {{ demoState.taxonomyChips.map((tag) => tag.label).join(', ') || 'None' }}
                    </div>
                  </div>
                </template>

                <template v-else-if="activeField.id === 'taxonomy-manager'">
                  <div class="space-y-3">
                    <TaxonomyManagerField
                      mode="demo"
                      :terms="demoTaxonomyTerms"
                      :selected-ids="demoState.taxonomyManager"
                      title="Manage Categories"
                      description="Pick categories and organize hierarchy."
                      button-label="Manage categories"
                      summary-label="Selected categories"
                      @update:selected-ids="demoState.taxonomyManager = $event"
                      @created="demoTaxonomyTerms = [...demoTaxonomyTerms, $event]"
                    />
                    <div class="text-xs text-muted">
                      Selected IDs: {{ demoState.taxonomyManager.join(', ') || 'None' }}
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
