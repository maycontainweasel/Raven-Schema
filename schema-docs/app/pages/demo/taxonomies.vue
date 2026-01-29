<script setup lang="ts">
import { ref } from 'vue'
import TaxonomyChipsField, { type TaxonomyChipOption } from '~/components/fields/TaxonomyChipsField.vue'
import TaxonomyManagerField, { type TaxonomyTerm } from '~/components/fields/TaxonomyManagerField.vue'

definePageMeta({
  layout: 'demo',
  title: 'Taxonomies',
})

const demoTagOptions = ref<TaxonomyChipOption[]>([
  { slug: 'core', label: 'Core' },
  { slug: 'cardio', label: 'Cardio' },
  { slug: 'resp', label: 'Respiratory' },
  { slug: 'derm', label: 'Dermatology' },
  { slug: 'neuro', label: 'Neurology' },
])

const demoTags = ref<TaxonomyChipOption[]>([
  { slug: 'core', label: 'Core' },
])

const demoTerms = ref<TaxonomyTerm[]>([
  { key: 'core', label: 'Core' },
  { key: 'cardio', label: 'Cardiology' },
  { key: 'resp', label: 'Respiratory' },
  { key: 'derm', label: 'Dermatology' },
  { key: 'neuro', label: 'Neurology' },
  { key: 'cardio-arr', label: 'Arrhythmia', parent: 'cardio' },
  { key: 'cardio-isch', label: 'Ischaemia', parent: 'cardio' },
  { key: 'resp-asth', label: 'Asthma', parent: 'resp' },
])

const demoSelected = ref<string[]>(['core', 'cardio', 'cardio-arr'])
</script>

<template>
  <div class="page stack">
    <div class="surface page-hero">
      <div class="stack">
        <div class="badge">Taxonomies</div>
        <h1>Taxonomy Field Patterns</h1>
        <p class="muted">
          Two taxonomy inputs: flat tags via combo box, and hierarchical taxonomy management via tree.
        </p>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card stack">
        <div>
          <h3>Flat taxonomy (tags)</h3>
          <p class="muted">Search, add, and remove flat terms.</p>
        </div>
        <TaxonomyChipsField
          v-model="demoTags"
          :options="demoTagOptions"
          placeholder="Type to add a tag and press Enter"
        />
        <div class="muted">
          Selected: <code>{{ demoTags.map(tag => tag.label).join(', ') || 'None' }}</code>
        </div>
      </div>

      <div class="card stack">
        <div>
          <h3>Hierarchical taxonomy</h3>
          <p class="muted">Manage parent/child terms in the tree manager.</p>
        </div>
        <TaxonomyManagerField
          mode="demo"
          title="Manage Categories"
          description="Pick categories and organize hierarchy."
          button-label="Manage categories"
          :terms="demoTerms"
          :selected-ids="demoSelected"
          @update:selected-ids="demoSelected = $event"
          @created="demoTerms = [...demoTerms, $event]"
        />
        <div class="muted">
          Selected: <code>{{ demoSelected.join(', ') || 'None' }}</code>
        </div>
      </div>
    </div>
  </div>
</template>
