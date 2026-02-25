<script setup lang="ts">
import ACombobox, { type AComboboxOption } from '#layers/helios-ui/app/components/fields/ACombobox.vue'
import AComboboxAsync from '#layers/helios-ui/app/components/fields/AComboboxAsync.vue'
import AInput from '#layers/helios-ui/app/components/fields/AInput.vue'
import { getFieldComponentContract } from '#layers/helios-admin/app/config/field-component-registry'
import { resolveFieldComponentOptions } from '#layers/helios-admin/app/utils/field-component-options'

const route = useRoute()
const componentId = computed(() => String(route.params.component ?? '').trim())
const registryEntry = computed(() => getFieldComponentContract(componentId.value))

const selectedExampleId = ref('')
const inputValue = ref('')
const comboboxSingle = ref<string | string[] | null>(null)
const comboboxMulti = ref<string | string[] | null>([])
const asyncSingle = ref<string | string[] | null>(null)

const demoOptions: AComboboxOption[] = [
  { label: 'South Africa', value: 'za', group: 'Africa' },
  { label: 'Kenya', value: 'ke', group: 'Africa' },
  { label: 'United Kingdom', value: 'uk', group: 'Europe' },
  { label: 'Germany', value: 'de', group: 'Europe' },
  { label: 'Australia', value: 'au', group: 'Oceania' },
]

watch(
  () => registryEntry.value?.examples,
  (examples) => {
    selectedExampleId.value = examples?.[0]?.id ?? ''
  },
  { immediate: true },
)

const selectedExample = computed(() => {
  const entry = registryEntry.value
  if (!entry) return null
  return entry.examples.find((example) => example.id === selectedExampleId.value) ?? entry.examples[0] ?? null
})

const mergedOptions = computed<Record<string, any>>(() => {
  const entry = registryEntry.value
  if (!entry) return {}
  const exampleOptions = selectedExample.value?.options ?? {}
  return resolveFieldComponentOptions(
    entry.contract.id,
    exampleOptions,
    { applyDefaults: true, allowUnknown: false },
  ).resolvedOptions
})

const optionIssues = computed(() => {
  const entry = registryEntry.value
  if (!entry) return []
  const exampleOptions = selectedExample.value?.options ?? {}
  return resolveFieldComponentOptions(
    entry.contract.id,
    exampleOptions,
    { applyDefaults: true, allowUnknown: false },
  ).issues
})

const pick = (source: Record<string, any>, keys: string[]) =>
  keys.reduce<Record<string, any>>((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) acc[key] = source[key]
    return acc
  }, {})

const inputProps = computed(() => {
  const base = pick(mergedOptions.value, ['type', 'placeholder', 'helperText', 'errorText', 'required', 'disabled'])
  return {
    ...base,
    label: 'First Name',
  }
})

const comboboxProps = computed(() => {
  const base = pick(mergedOptions.value, [
    'placeholder',
    'helperText',
    'errorText',
    'multiple',
    'grouped',
    'highlightMatch',
    'clearable',
    'showIndicator',
    'emptyText',
    'disabled',
  ])
  return {
    ...base,
    label: 'Country',
    options: demoOptions,
  }
})

const comboboxModel = computed<string | string[] | null>({
  get: () => (mergedOptions.value.multiple ? comboboxMulti.value : comboboxSingle.value),
  set: (next) => {
    if (mergedOptions.value.multiple) {
      comboboxMulti.value = next
      return
    }
    comboboxSingle.value = next
  },
})

const asyncProps = computed(() => {
  const base = pick(mergedOptions.value, [
    'placeholder',
    'helperText',
    'errorText',
    'multiple',
    'grouped',
    'highlightMatch',
    'clearable',
    'showIndicator',
    'emptyText',
    'disabled',
    'minChars',
  ])
  return {
    ...base,
    label: 'Country (Async)',
  }
})

const searchOptions = async (query: string): Promise<AComboboxOption[]> => {
  const normalized = query.trim().toLowerCase()
  await new Promise(resolve => setTimeout(resolve, 160))
  if (!normalized) return []
  return demoOptions.filter((option) => {
    return (
      option.label.toLowerCase().includes(normalized) ||
      option.value.toLowerCase().includes(normalized) ||
      String(option.group ?? '').toLowerCase().includes(normalized)
    )
  })
}
</script>

<template>
  <section v-if="registryEntry" class="a-grid">
    <header class="a-card a-card--hero">
      <div>
        <p class="a-eyebrow">{{ registryEntry.contract.id }}</p>
        <h1 class="a-title">{{ registryEntry.contract.title }}</h1>
        <p class="a-copy">{{ registryEntry.contract.description }}</p>
      </div>
      <div class="head-actions">
        <NuxtLink class="a-btn a-btn--subtle" to="/components">Back to Components</NuxtLink>
      </div>
    </header>

    <section class="a-card">
      <h2 class="section-title">Contract</h2>
      <div class="chip-list smt-050">
        <span class="a-chip">Value: {{ registryEntry.contract.valueShape }}</span>
        <span class="a-chip">Required: {{ registryEntry.contract.requiredOptions.join(', ') || 'none' }}</span>
        <span class="a-chip">Optional: {{ registryEntry.contract.optionalOptions.length }}</span>
      </div>

      <div class="smt-050 table-wrap">
        <table class="contract-table">
          <thead>
            <tr>
              <th>Option</th>
              <th>Type</th>
              <th>Required</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="option in registryEntry.contract.options" :key="option.key">
              <td><code>{{ option.key }}</code></td>
              <td>
                <span>{{ option.type }}</span>
                <span v-if="option.values?.length"> ({{ option.values.join(' | ') }})</span>
              </td>
              <td>{{ option.required ? 'Yes' : 'No' }}</td>
              <td>
                <code v-if="typeof option.defaultValue !== 'undefined'">{{ JSON.stringify(option.defaultValue) }}</code>
                <span v-else>—</span>
              </td>
              <td>{{ option.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="a-card">
      <div class="section-head">
        <h2 class="section-title">Examples</h2>
        <select v-model="selectedExampleId" class="a-select">
          <option
            v-for="example in registryEntry.examples"
            :key="example.id"
            :value="example.id"
          >
            {{ example.label }}
          </option>
        </select>
      </div>
      <p class="a-copy">{{ selectedExample?.description }}</p>

      <div class="demo-grid smt-050">
        <article class="demo-card">
          <h3 class="demo-title">Live Demo</h3>
          <AInput
            v-if="registryEntry.contract.id === 'AInput'"
            v-model="inputValue"
            v-bind="inputProps"
          />

          <ACombobox
            v-else-if="registryEntry.contract.id === 'ACombobox'"
            v-model="comboboxModel"
            v-bind="comboboxProps"
          />

          <AComboboxAsync
            v-else-if="registryEntry.contract.id === 'AComboboxAsync'"
            v-model="asyncSingle"
            v-bind="asyncProps"
            :search="searchOptions"
          />
        </article>

        <article class="demo-card">
          <h3 class="demo-title">Resolved Options</h3>
          <pre class="code-block">{{ JSON.stringify(mergedOptions, null, 2) }}</pre>
          <div v-if="optionIssues.length" class="contract-issues">
            <p class="a-eyebrow">Validation</p>
            <p
              v-for="(issue, index) in optionIssues"
              :key="`${issue.key}-${index}`"
              class="a-copy"
            >
              {{ issue.message }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="a-card">
      <h2 class="section-title">Spec Snippet</h2>
      <pre class="code-block smt-050">{{ registryEntry.specSnippet }}</pre>
    </section>
  </section>

  <section v-else class="a-grid">
    <article class="a-card">
      <h1 class="a-title">Component Not Found</h1>
      <p class="a-copy">No contract is registered for "{{ componentId }}".</p>
      <NuxtLink class="a-btn a-btn--subtle smt-050" to="/components">Back to Components</NuxtLink>
    </article>
  </section>
</template>

<style scoped>
.head-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.section-title {
  margin: 0;
  font-size: var(--fs-050, 1.14rem);
  letter-spacing: -0.01em;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.section-head .a-select {
  width: min(16rem, 100%);
}

.chip-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.demo-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: color-mix(in srgb, var(--admin-surface) 94%, white 6%);
  padding: 0.78rem;
  display: grid;
  gap: 0.45rem;
}

.table-wrap {
  overflow-x: auto;
}

.contract-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.contract-table th,
.contract-table td {
  text-align: left;
  border-bottom: 1px solid var(--admin-border);
  padding: 0.45rem;
  vertical-align: top;
}

.contract-table th {
  color: var(--admin-text-soft);
  font-weight: 600;
}

.contract-issues {
  display: grid;
  gap: 0.25rem;
}

.demo-title {
  margin: 0;
  font-size: var(--fs--025, 0.94rem);
}

.code-block {
  margin: 0;
  background: #0b1220;
  color: #d6e4ff;
  border-radius: var(--admin-radius-md);
  padding: 0.72rem;
  font-size: 0.78rem;
  line-height: 1.45;
  overflow-x: auto;
}

@media (max-width: 840px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
