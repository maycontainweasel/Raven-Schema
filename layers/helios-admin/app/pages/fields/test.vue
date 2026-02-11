<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { parseDate, type DateValue } from '@ark-ui/vue/date-picker'

import AInput from '#layers/helios-ui/app/components/fields/AInput.vue'
import ACombobox from '#layers/helios-ui/app/components/fields/ACombobox.vue'
import AComboboxAsync from '#layers/helios-ui/app/components/fields/AComboboxAsync.vue'
import ACountryCombobox from '#layers/helios-ui/app/components/fields/ACountryCombobox.vue'
import ASelectBasic from '#layers/helios-ui/app/components/fields/ASelectBasic.vue'
import ASelectFloatingLabel from '#layers/helios-ui/app/components/fields/ASelectFloatingLabel.vue'
import ASelectGrouped from '#layers/helios-ui/app/components/fields/ASelectGrouped.vue'
import ASelectMulti from '#layers/helios-ui/app/components/fields/ASelectMulti.vue'
import ASelectVisual from '#layers/helios-ui/app/components/fields/ASelectVisual.vue'
import type { ASelectOption } from '#layers/helios-ui/app/components/fields/ASelectField.vue'
import ACheckbox from '#layers/helios-ui/app/components/fields/ACheckbox.vue'
import ATodoCheckbox from '#layers/helios-ui/app/components/fields/ATodoCheckbox.vue'
import ACheckboxCard from '#layers/helios-ui/app/components/fields/ACheckboxCard.vue'
import ASwitchBasic from '#layers/helios-ui/app/components/fields/ASwitchBasic.vue'
import ASwitchSquare from '#layers/helios-ui/app/components/fields/ASwitchSquare.vue'
import ASwitchLargeThumb from '#layers/helios-ui/app/components/fields/ASwitchLargeThumb.vue'
import ASwitchBordered from '#layers/helios-ui/app/components/fields/ASwitchBordered.vue'
import ASwitchStateLabel from '#layers/helios-ui/app/components/fields/ASwitchStateLabel.vue'
import ASwitchDualLabels from '#layers/helios-ui/app/components/fields/ASwitchDualLabels.vue'
import ASwitchEmbeddedIcons from '#layers/helios-ui/app/components/fields/ASwitchEmbeddedIcons.vue'
import ASwitchRevealingIcons from '#layers/helios-ui/app/components/fields/ASwitchRevealingIcons.vue'
import ASwitchEmbeddedText from '#layers/helios-ui/app/components/fields/ASwitchEmbeddedText.vue'
import ASwitchCard from '#layers/helios-ui/app/components/fields/ASwitchCard.vue'
import ASwitchIconCard from '#layers/helios-ui/app/components/fields/ASwitchIconCard.vue'
import AColorPicker from '#layers/helios-ui/app/components/fields/AColorPicker.vue'
import APasswordInput from '#layers/helios-ui/app/components/fields/APasswordInput.vue'
import APasswordStrengthInput from '#layers/helios-ui/app/components/fields/APasswordStrengthInput.vue'
import APasswordRequirementsInput from '#layers/helios-ui/app/components/fields/APasswordRequirementsInput.vue'
import APasswordConfirmInput from '#layers/helios-ui/app/components/fields/APasswordConfirmInput.vue'
import ADateCalendar from '#layers/helios-ui/app/components/fields/ADateCalendar.vue'
import ADateRangeCalendar, { type ADateRangePreset } from '#layers/helios-ui/app/components/fields/ADateRangeCalendar.vue'
import ADateMetaCalendar from '#layers/helios-ui/app/components/fields/ADateMetaCalendar.vue'
import AFileUploadBasic from '#layers/helios-ui/app/components/fields/AFileUploadBasic.vue'
import AFileUploadAvatar from '#layers/helios-ui/app/components/fields/AFileUploadAvatar.vue'
import AFileUploadDropzone from '#layers/helios-ui/app/components/fields/AFileUploadDropzone.vue'
import AFileUploadImagesGrid from '#layers/helios-ui/app/components/fields/AFileUploadImagesGrid.vue'
import AFileUploadList from '#layers/helios-ui/app/components/fields/AFileUploadList.vue'
import AFileUploadTable from '#layers/helios-ui/app/components/fields/AFileUploadTable.vue'
import AFileUploadPaste from '#layers/helios-ui/app/components/fields/AFileUploadPaste.vue'
import AFileUploadDirectory from '#layers/helios-ui/app/components/fields/AFileUploadDirectory.vue'
import ANumberInput from '#layers/helios-ui/app/components/fields/ANumberInput.vue'
import ATagsInput from '#layers/helios-ui/app/components/fields/ATagsInput.vue'
import ATree, { type ATreeNode } from '#layers/helios-ui/app/components/fields/ATree.vue'
import ATaxonomyManager from '#layers/helios-admin/app/components/fields/ATaxonomyManager.vue'
import FieldSectionCard from '#layers/helios-ui/app/components/fields/FieldSectionCard.vue'

import { useFieldsStore } from '#layers/helios-admin/app/stores/fields'

const fieldsStore = useFieldsStore()
const { draft, descriptors, schemaDescriptor } = storeToRefs(fieldsStore)

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'reference', label: 'Field Reference' },
  { id: 'schema', label: 'Schema Map' },
]

const activeSection = ref('overview')
const saveCount = ref(0)
const referenceDraft = ref({
  text: '',
  email: '',
  password: '',
  withPrefix: '',
  withSuffix: '',
  colorBasic: '#000000',
  comboboxBasic: '',
  comboboxCountry: 'us',
  comboboxGrouped: '',
  comboboxHighlight: '',
  comboboxMultiple: [] as string[],
  comboboxAsync: '',
  tagsBasic: ['React', 'Vue', 'Svelte'] as string[],
  tagsCombobox: ['React'] as string[],
  numberBasic: '0',
  numberCurrency: '99.00',
  numberQuantity: '2',
  numberPercent: '15',
  numberDecimal: '3.14159',
  numberMinMax: '5',
  numberScrubber: '42',
  numberWheel: '100',
})

const frameworkOptions = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Angular', value: 'angular' },
  { label: 'Preact', value: 'preact' },
]

const groupedTechnologyOptions = [
  { label: 'React', value: 'react', group: 'JavaScript' },
  { label: 'Solid', value: 'solid', group: 'JavaScript' },
  { label: 'Vue', value: 'vue', group: 'JavaScript' },
  { label: 'Svelte', value: 'svelte', group: 'JavaScript' },
  { label: 'Tailwind', value: 'tailwind', group: 'CSS' },
  { label: 'UnoCSS', value: 'unocss', group: 'CSS' },
]

const skillOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Vue', value: 'vue' },
  { label: 'Nuxt', value: 'nuxt' },
  { label: 'Ark UI', value: 'ark-ui' },
  { label: 'UnoCSS', value: 'unocss' },
  { label: 'Node.js', value: 'node' },
  { label: 'Docker', value: 'docker' },
]

const userOptions = [
  { label: 'John Doe', value: 'john-doe', group: 'Engineering' },
  { label: 'Jane Smith', value: 'jane-smith', group: 'Engineering' },
  { label: 'Alice Brown', value: 'alice-brown', group: 'Design' },
  { label: 'Charlie Wilson', value: 'charlie-wilson', group: 'Product' },
  { label: 'Diana Davis', value: 'diana-davis', group: 'Operations' },
]

const tagFrameworkOptions = [
  { label: 'React', value: 'React' },
  { label: 'Vue', value: 'Vue' },
  { label: 'Svelte', value: 'Svelte' },
  { label: 'Angular', value: 'Angular' },
  { label: 'Next.js', value: 'Next.js' },
  { label: 'Nuxt.js', value: 'Nuxt.js' },
  { label: 'SvelteKit', value: 'SvelteKit' },
  { label: 'Solid.js', value: 'Solid.js' },
  { label: 'Qwik', value: 'Qwik' },
  { label: 'Astro', value: 'Astro' },
]

const selectFramework = ref('vue')
const selectFloating = ref('')
const selectCountry = ref('us')
const selectTheme = ref('system')
const selectLanguage = ref('en')
const selectCategory = ref('')
const selectSkills = ref<string[]>(['vue', 'node'])
const selectProfile = ref('sarah')

const selectFrameworkOptions: ASelectOption[] = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
]

const selectCountryOptions: ASelectOption[] = [
  { label: 'United States', value: 'us', emoji: '🇺🇸' },
  { label: 'United Kingdom', value: 'uk', emoji: '🇬🇧' },
  { label: 'Canada', value: 'ca', emoji: '🇨🇦' },
  { label: 'Germany', value: 'de', emoji: '🇩🇪' },
  { label: 'France', value: 'fr', emoji: '🇫🇷' },
  { label: 'Japan', value: 'jp', emoji: '🇯🇵' },
]

const selectThemeOptions: ASelectOption[] = [
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' },
]

const selectLanguageOptions: ASelectOption[] = [
  { label: 'English', value: 'en', meta: 'EN' },
  { label: 'Spanish', value: 'es', meta: 'ES' },
  { label: 'French', value: 'fr', meta: 'FR' },
  { label: 'German', value: 'de', meta: 'DE' },
  { label: 'Italian', value: 'it', meta: 'IT' },
  { label: 'Japanese', value: 'ja', meta: 'JA' },
]

const selectCategoryOptions: ASelectOption[] = [
  { label: 'React', value: 'cat-react', group: 'tech' },
  { label: 'Vue', value: 'cat-vue', group: 'tech' },
  { label: 'Svelte', value: 'cat-svelte', group: 'tech' },
  { label: 'UI Design', value: 'cat-ui', group: 'design' },
  { label: 'UX Design', value: 'cat-ux', group: 'design' },
  { label: 'Marketing', value: 'cat-marketing', group: 'business' },
  { label: 'Sales', value: 'cat-sales', group: 'business' },
]

const selectSkillOptions: ASelectOption[] = [
  { label: 'JavaScript', value: 'js', group: 'frontend' },
  { label: 'TypeScript', value: 'ts', group: 'frontend' },
  { label: 'Vue', value: 'vue', group: 'frontend' },
  { label: 'Node.js', value: 'node', group: 'backend' },
  { label: 'Python', value: 'python', group: 'backend' },
  { label: 'PostgreSQL', value: 'postgres', group: 'database' },
  { label: 'Redis', value: 'redis', group: 'database' },
]

const selectProfileOptions: ASelectOption[] = [
  {
    label: 'Sarah Johnson',
    value: 'sarah',
    avatar: 'SJ',
    meta: 'Product Manager',
    description: 'sarah.johnson@company.com',
  },
  {
    label: 'Michael Chen',
    value: 'michael',
    avatar: 'MC',
    meta: 'Frontend Developer',
    description: 'michael.chen@company.com',
  },
  {
    label: 'Emily Rodriguez',
    value: 'emily',
    avatar: 'ER',
    meta: 'UX Designer',
    description: 'emily.rodriguez@company.com',
  },
  {
    label: 'David Kim',
    value: 'david',
    avatar: 'DK',
    meta: 'Backend Developer',
    description: 'david.kim@company.com',
  },
]

const selectCategoryGroups = {
  tech: 'Technology',
  design: 'Design',
  business: 'Business',
}

const selectSkillGroups = {
  frontend: 'Frontend',
  backend: 'Backend',
  database: 'Database',
}

const checkboxBasic = ref(false)
const checkboxMarketing = ref(false)
const todoSimple = ref(true)
const todoFancy = ref(true)
const checkboxDisabledUnchecked = ref(false)
const checkboxDisabledChecked = ref(true)

const switchBasic = ref(false)
const switchDisabled = ref(true)
const switchSquare = ref(false)
const switchLargeThumb = ref(false)
const switchBordered = ref(false)
const switchStateLabel = ref(false)
const switchDualLabels = ref(false)
const switchEmbeddedIcons = ref(false)
const switchRevealingIcons = ref(false)
const switchEmbeddedText = ref(false)
const switchCard = ref(false)
const switchIconCard = ref(false)

const passwordBasic = ref('')
const passwordStrength = ref('')
const passwordRequirements = ref('')
const passwordApiKey = ref('sk_test_1234567890abcdef')
const passwordWithField = ref('')
const passwordConfirmPrimary = ref('')
const passwordConfirmSecondary = ref('')

const passwordWithFieldError = computed(() => (
  passwordWithField.value.length > 0 && passwordWithField.value.length < 8
    ? 'Password must be at least 8 characters long'
    : ''
))

const passwordWithFieldHelper = computed(() => {
  if (passwordWithFieldError.value) return ''
  if (!passwordWithField.value.length) return 'Enter a secure password for your account'
  return 'Password meets minimum requirements'
})

const featureOptions = [
  { label: 'Dark mode', value: 'dark-mode' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Analytics', value: 'analytics' },
]

const featureStates = ref<Record<string, boolean>>({
  'dark-mode': true,
  notifications: false,
  analytics: false,
})

const selectedFeatureValues = computed(() => featureOptions
  .filter((feature) => featureStates.value[feature.value])
  .map((feature) => feature.value))

const featureParentState = computed<boolean | 'indeterminate'>(() => {
  const selectedCount = selectedFeatureValues.value.length
  if (selectedCount === 0) return false
  if (selectedCount === featureOptions.length) return true
  return 'indeterminate'
})

const onFeatureParentChange = (next: boolean | 'indeterminate') => {
  const nextValue = next === true
  for (const feature of featureOptions) {
    featureStates.value[feature.value] = nextValue
  }
}

const colorOptions = [
  { label: 'Blue', value: 'blue', color: '#2563eb' },
  { label: 'Green', value: 'green', color: '#16a34a' },
  { label: 'Purple', value: 'purple', color: '#7c3aed' },
  { label: 'Red', value: 'red', color: '#dc2626' },
  { label: 'Orange', value: 'orange', color: '#ea580c' },
  { label: 'Pink', value: 'pink', color: '#db2777' },
]

const colorStates = ref<Record<string, boolean>>({
  blue: true,
  green: true,
  purple: false,
  red: false,
  orange: false,
  pink: false,
})

const selectedColorValues = computed(() => colorOptions
  .filter((color) => colorStates.value[color.value])
  .map((color) => color.value))

const planBasicChecked = ref(false)
const planProChecked = ref(false)
const planEnterpriseChecked = ref(false)
const paymentCardChecked = ref(true)
const paymentMobileChecked = ref(false)

const todayDate = parseDate(new Date())
const dateSingle = ref<DateValue[]>([todayDate])
const dateMultiple = ref<DateValue[]>([
  todayDate.set({ day: 2 }),
  todayDate.set({ day: 12 }),
  todayDate.set({ day: 21 }),
  todayDate.set({ day: 24 }),
])
const dateRange = ref<DateValue[]>([
  todayDate,
  todayDate.add({ days: 4 }),
])
const dateUnavailable = ref<DateValue[]>([])
const dateWithWeeks = ref<DateValue[]>([todayDate])
const dateRangeWithPresets = ref<DateValue[]>([
  todayDate.subtract({ days: 7 }),
  todayDate,
])
const dateTwoMonths = ref<DateValue[]>([
  todayDate,
  todayDate.add({ days: 25 }),
])
const datePricing = ref<DateValue[]>([todayDate])

const fileUploadBasic = ref<File[]>([])
const fileUploadAvatar = ref<File[]>([])
const fileUploadDropzone = ref<File[]>([])
const fileUploadImages = ref<File[]>([])
const fileUploadList = ref<File[]>([])
const fileUploadTable = ref<File[]>([])
const fileUploadPaste = ref<File[]>([])
const fileUploadDirectory = ref<File[]>([])

const rangePresets: ADateRangePreset[] = [
  { label: 'Last 3 days', value: 'last3Days' },
  { label: 'Last 7 days', value: 'last7Days' },
  { label: 'Last 14 days', value: 'last14Days' },
  { label: 'Last 30 days', value: 'last30Days' },
  { label: 'Last month', value: 'lastMonth' },
  { label: 'Year to date', value: 'thisYear' },
  { label: 'Last year', value: 'lastYear' },
]

const formatPriceKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const pricingMetaByDate = (() => {
  const output: Record<string, number> = {}
  const start = new Date()
  for (let index = 0; index < 180; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    output[formatPriceKey(date)] = 80 + ((index * 37) % 120)
  }
  return output
})()

const toDateStrings = (values: DateValue[]) => values.map((entry) => entry.toString())

const createTaxonomySeed = (): ATreeNode[] => ([
  {
    id: 'cars-root',
    label: 'Cars',
    children: [
      {
        id: 'cars-make',
        label: 'Make',
        children: [
          { id: 'cars-make-audi', label: 'Audi', children: [] },
          { id: 'cars-make-bmw', label: 'BMW', children: [] },
          { id: 'cars-make-toyota', label: 'Toyota', children: [] },
        ],
      },
      {
        id: 'cars-body',
        label: 'Body Type',
        children: [
          { id: 'cars-sedan', label: 'Sedan', children: [] },
          { id: 'cars-suv', label: 'SUV', children: [] },
          { id: 'cars-coupe', label: 'Coupe', children: [] },
        ],
      },
      {
        id: 'cars-year',
        label: 'Year',
        children: [
          { id: 'cars-2024', label: '2024', children: [] },
          { id: 'cars-2025', label: '2025', children: [] },
        ],
      },
    ],
  },
])

const taxonomyTree = ref<ATreeNode[]>(createTaxonomySeed())
const taxonomyChecked = ref<string[]>(['cars-suv'])
const standaloneTree = ref<ATreeNode[]>(createTaxonomySeed())
const standaloneChecked = ref<string[]>(['cars-sedan', 'cars-make-audi'])
const treeOptions = ref({
  draggable: true,
  checkable: true,
  treeLine: true,
})

const searchUsers = async (query: string) => {
  await new Promise((resolve) => setTimeout(resolve, 380))
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []
  return userOptions.filter((user) => user.label.toLowerCase().includes(normalized))
}

const saveDraft = () => {
  saveCount.value += 1
}

const payloadPreview = computed(() => JSON.stringify(draft.value, null, 2))
const referencePreview = computed(() => JSON.stringify({
  ...referenceDraft.value,
  selects: {
    framework: selectFramework.value,
    floating: selectFloating.value,
    country: selectCountry.value,
    theme: selectTheme.value,
    language: selectLanguage.value,
    category: selectCategory.value,
    skills: selectSkills.value,
    profile: selectProfile.value,
  },
  checkboxBasic: checkboxBasic.value,
  checkboxMarketing: checkboxMarketing.value,
  todoSimple: todoSimple.value,
  todoFancy: todoFancy.value,
  selectedFeatures: selectedFeatureValues.value,
  selectedColors: selectedColorValues.value,
  plans: {
    basic: planBasicChecked.value,
    pro: planProChecked.value,
    enterprise: planEnterpriseChecked.value,
  },
  payments: {
    card: paymentCardChecked.value,
    mobile: paymentMobileChecked.value,
  },
  switches: {
    basic: switchBasic.value,
    disabled: switchDisabled.value,
    square: switchSquare.value,
    largeThumb: switchLargeThumb.value,
    bordered: switchBordered.value,
    withStateLabel: switchStateLabel.value,
    dualLabels: switchDualLabels.value,
    embeddedIcons: switchEmbeddedIcons.value,
    revealingIcons: switchRevealingIcons.value,
    embeddedText: switchEmbeddedText.value,
    card: switchCard.value,
    iconCard: switchIconCard.value,
  },
  passwords: {
    basic: passwordBasic.value,
    strength: passwordStrength.value,
    requirements: passwordRequirements.value,
    apiKey: passwordApiKey.value,
    withField: passwordWithField.value,
    confirmPrimary: passwordConfirmPrimary.value,
    confirmSecondary: passwordConfirmSecondary.value,
    matches: passwordConfirmPrimary.value.length > 0
      && passwordConfirmSecondary.value.length > 0
      && passwordConfirmPrimary.value === passwordConfirmSecondary.value,
  },
  dateSingle: toDateStrings(dateSingle.value),
  dateMultiple: toDateStrings(dateMultiple.value),
  dateRange: toDateStrings(dateRange.value),
  dateUnavailable: toDateStrings(dateUnavailable.value),
  dateWithWeeks: toDateStrings(dateWithWeeks.value),
  dateRangeWithPresets: toDateStrings(dateRangeWithPresets.value),
  dateTwoMonths: toDateStrings(dateTwoMonths.value),
  datePricing: toDateStrings(datePricing.value),
  fileUploads: {
    basic: fileUploadBasic.value.map(file => file.name),
    avatar: fileUploadAvatar.value.map(file => file.name),
    dropzone: fileUploadDropzone.value.map(file => file.name),
    images: fileUploadImages.value.map(file => file.name),
    list: fileUploadList.value.map(file => file.name),
    table: fileUploadTable.value.map(file => file.name),
    paste: fileUploadPaste.value.map(file => file.name),
    directory: fileUploadDirectory.value.map(file => file.webkitRelativePath || file.name),
  },
  standaloneChecked: standaloneChecked.value,
  taxonomyChecked: taxonomyChecked.value,
}, null, 2))
const schemaPreview = computed(() => JSON.stringify(schemaDescriptor.value, null, 2))
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero record-header">
      <div>
        <p class="a-eyebrow">Fields Test</p>
        <h1 class="a-title">Fake User Management</h1>
        <p class="a-copy">
          First pass of reusable field components with explicit Pinia model mapping for page-builder integration.
        </p>
      </div>
      <div class="record-header__actions">
        <span class="a-chip">Saves: {{ saveCount }}</span>
        <button class="a-btn a-btn--subtle" type="button" @click="fieldsStore.resetDraft()">
          Reset
        </button>
        <button class="a-btn a-btn--primary" type="button" @click="saveDraft">
          Simulate Save
        </button>
      </div>
    </header>

    <section class="record-grid">
      <aside class="a-card record-nav">
        <p class="a-eyebrow">Sections</p>
        <div class="record-nav__stack">
          <button
            v-for="section in sections"
            :key="section.id"
            class="record-nav__item"
            :class="activeSection === section.id ? 'is-active' : ''"
            type="button"
            @click="activeSection = section.id"
          >
            {{ section.label }}
          </button>
        </div>
      </aside>

      <main class="record-main">
        <template v-if="activeSection === 'overview'">
          <FieldSectionCard
            title="Identity"
            description="AInput baseline using Ark Field primitives. These values v-model directly to the test Pinia store."
          >
            <div class="form-grid">
              <AInput
                v-model="draft.firstName"
                label="First Name"
                placeholder="Enter first name"
                helper-text="string -> AInput(type=text) -> draft.firstName"
              />

              <AInput
                v-model="draft.surname"
                label="Surname"
                placeholder="Enter surname"
                helper-text="string -> AInput(type=text) -> draft.surname"
              />

              <div class="form-full">
                <AInput
                  v-model="draft.email"
                  label="Email"
                  type="email"
                  placeholder="name@example.com"
                  helper-text="string -> AInput(type=email) -> draft.email"
                />
              </div>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Color Mapping"
            description="Ark color picker mapped to a hex value in the same draft payload used by the page builder."
          >
            <div class="form-grid">
              <AColorPicker
                v-model="draft.brandColor"
                label="Brand Color"
                helper-text="component=AColorPicker, mode=single(hex)"
              />
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Combobox Mapping"
            description="Ark combobox variants mapped into the same Pinia draft contract the page builder will use."
          >
            <div class="form-grid">
              <ACombobox
                v-model="draft.framework"
                label="Framework (basic)"
                placeholder="Select a framework..."
                helper-text="component=ACombobox, mode=single, grouped=false"
                :options="frameworkOptions"
              />

              <ACombobox
                v-model="draft.technology"
                label="Technology (grouped)"
                placeholder="Select a technology..."
                helper-text="component=ACombobox, grouped=true"
                :options="groupedTechnologyOptions"
                grouped
              />

              <div class="form-full">
                <ACombobox
                  v-model="draft.skills"
                  label="Skills (multiple)"
                  placeholder="Add skills..."
                  helper-text="component=ACombobox, mode=multiple"
                  :options="skillOptions"
                  multiple
                />
              </div>

              <div class="form-full">
                <AComboboxAsync
                  v-model="draft.assignee"
                  label="Assignee (async)"
                  placeholder="Type to search users..."
                  helper-text="component=AComboboxAsync, search(query)=>Promise<option[]>"
                  :search="searchUsers"
                  grouped
                  :min-chars="2"
                />
              </div>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Number Input Mapping"
            description="Ark number input variants mapped into the same Pinia draft contract the page builder will use."
          >
            <div class="form-grid">
              <ANumberInput
                v-model="draft.quantity"
                label="Quantity"
                mode="quantity"
                :min="0"
                :step="1"
                helper-text="component=ANumberInput, mode=quantity"
              />

              <ANumberInput
                v-model="draft.price"
                label="Price"
                :min="0"
                :step="0.01"
                :format-options="{
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }"
                helper-text="component=ANumberInput, format=currency"
              />

              <div class="form-full">
                <ANumberInput
                  v-model="draft.discountRate"
                  label="Discount Rate"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :format-options="{
                    style: 'percent',
                    maximumFractionDigits: 1,
                  }"
                  helper-text="component=ANumberInput, format=percent, range=0-100"
                />
              </div>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Store Snapshot"
            description="Live payload preview from `useFieldsStore()` to validate v-model behavior and deployment mapping."
          >
            <pre class="preview-block">{{ payloadPreview }}</pre>
          </FieldSectionCard>
        </template>

        <template v-else-if="activeSection === 'reference'">
          <FieldSectionCard
            title="AInput Reference"
            description="Interactive sandbox for AInput. Click each field and type to validate behavior before we wire dynamic field specs."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Text</h3>
                  <p>Default mode for string values.</p>
                </header>
                <AInput
                  v-model="referenceDraft.text"
                  label="Display Name"
                  placeholder="Type any text"
                  helper-text="Default type=text"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Email</h3>
                  <p>Uses native email input behavior.</p>
                </header>
                <AInput
                  v-model="referenceDraft.email"
                  label="Personal Email"
                  type="email"
                  placeholder="john.doe@example.com"
                  helper-text="type=email from field options"
                >
                  <template #prefix>
                    <i class="i-lucide-mail h-4 w-4" aria-hidden="true" />
                  </template>
                </AInput>
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Password</h3>
                  <p>Baseline secure input type.</p>
                </header>
                <AInput
                  v-model="referenceDraft.password"
                  label="Password"
                  type="password"
                  placeholder="Enter secure password"
                  helper-text="type=password from field options"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Prefix / Suffix Slots</h3>
                  <p>Optional adornments for search and action patterns.</p>
                </header>
                <div class="reference-stack">
                  <AInput
                    v-model="referenceDraft.withPrefix"
                    label="Search"
                    placeholder="Find records"
                    helper-text="prefix slot with icon"
                  >
                    <template #prefix>
                      <i class="i-lucide-search h-4 w-4" aria-hidden="true" />
                    </template>
                  </AInput>

                  <AInput
                    v-model="referenceDraft.withSuffix"
                    label="Website"
                    placeholder="company.com"
                    helper-text="suffix slot with status indicator"
                  >
                    <template #suffix>
                      <i class="i-lucide-check h-4 w-4" aria-hidden="true" />
                    </template>
                  </AInput>
                </div>
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Color Picker</h3>
                  <p>Hex input + popover picker with hue/alpha controls and swatch trigger.</p>
                </header>
                <AColorPicker
                  v-model="referenceDraft.colorBasic"
                  label="Brand Color"
                  helper-text="Hex string mapped from Ark color picker"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Combobox Reference"
            description="Five core variants: basic, grouped, highlight, multiple and async."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Single-value searchable combobox.</p>
                </header>
                <ACombobox
                  v-model="referenceDraft.comboboxBasic"
                  label="Framework"
                  placeholder="Select a framework..."
                  helper-text="Single mode"
                  :options="frameworkOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Grouping</h3>
                  <p>Groups options by category label.</p>
                </header>
                <ACombobox
                  v-model="referenceDraft.comboboxGrouped"
                  label="Technology"
                  placeholder="Select a technology..."
                  helper-text="Grouped mode"
                  :options="groupedTechnologyOptions"
                  grouped
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Country (Search)</h3>
                  <p>Opinionated searchable country picker (recommended over select for country).</p>
                </header>
                <ACountryCombobox
                  v-model="referenceDraft.comboboxCountry"
                  label="Country"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Highlight</h3>
                  <p>Highlights matching query text while typing.</p>
                </header>
                <ACombobox
                  v-model="referenceDraft.comboboxHighlight"
                  label="Framework Search"
                  placeholder="Search frameworks..."
                  helper-text="Highlight mode"
                  :options="frameworkOptions"
                  highlight-match
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Multiple</h3>
                  <p>Select multiple values with inline tags.</p>
                </header>
                <ACombobox
                  v-model="referenceDraft.comboboxMultiple"
                  label="Skills"
                  placeholder="Add skills..."
                  helper-text="Multiple mode"
                  :options="skillOptions"
                  multiple
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Async</h3>
                  <p>Loads options from a search function (great for large datasets).</p>
                </header>
                <AComboboxAsync
                  v-model="referenceDraft.comboboxAsync"
                  label="Search Users"
                  placeholder="Type to search users..."
                  helper-text="Async mode"
                  :search="searchUsers"
                  grouped
                  :min-chars="2"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Select Reference"
            description="Select primitives broken into reusable traits: floating label, grouped, multi, and visual/meta variants."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Single selection baseline.</p>
                </header>
                <ASelectBasic
                  v-model="selectFramework"
                  label="Framework"
                  placeholder="Select a framework"
                  :options="selectFrameworkOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Overlapping Label</h3>
                  <p>Floating label style with the same select behavior.</p>
                </header>
                <ASelectFloatingLabel
                  v-model="selectFloating"
                  label="Select with overlapping label"
                  placeholder="Select a framework"
                  :options="selectFrameworkOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Country Selector</h3>
                  <p>Emoji visual trait for country-like selections.</p>
                </header>
                <ASelectVisual
                  v-model="selectCountry"
                  label="Country"
                  placeholder="Select a country"
                  visual-mode="emoji"
                  :options="selectCountryOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Theme Selector</h3>
                  <p>Icon trait for semantic option visuals.</p>
                </header>
                <ASelectVisual
                  v-model="selectTheme"
                  label="Theme"
                  placeholder="Select a theme"
                  visual-mode="icon"
                  :options="selectThemeOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Language Selector</h3>
                  <p>Meta text trait for compact right-side codes.</p>
                </header>
                <ASelectVisual
                  v-model="selectLanguage"
                  label="Language"
                  placeholder="Select a language"
                  show-meta
                  :options="selectLanguageOptions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Category Filter</h3>
                  <p>Grouped options with per-group labels.</p>
                </header>
                <ASelectGrouped
                  v-model="selectCategory"
                  label="Category"
                  placeholder="Select a category"
                  :options="selectCategoryOptions"
                  :group-labels="selectCategoryGroups"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Multi Select</h3>
                  <p>Same grouped trait, but multi-value selection mode.</p>
                </header>
                <ASelectMulti
                  v-model="selectSkills"
                  label="Skills"
                  placeholder="Select skills"
                  :options="selectSkillOptions"
                  :group-labels="selectSkillGroups"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Profile Selector</h3>
                  <p>Avatar + meta + secondary text traits in one select.</p>
                </header>
                <ASelectVisual
                  v-model="selectProfile"
                  label="Assign to"
                  placeholder="Select a profile"
                  visual-mode="avatar"
                  show-meta
                  show-description
                  :options="selectProfileOptions"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Tags Input Reference"
            description="Tokenized tag entry with a base input mode and a combobox-assisted mode."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Type a value and press Enter to add chips.</p>
                </header>
                <ATagsInput
                  v-model="referenceDraft.tagsBasic"
                  label="Frameworks"
                  placeholder="Add framework"
                  helper-text="Ark TagsInput baseline"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Combobox</h3>
                  <p>Search and pick from options while preserving tag editing.</p>
                </header>
                <ATagsInput
                  v-model="referenceDraft.tagsCombobox"
                  label="Frameworks"
                  placeholder="Add framework..."
                  helper-text="Ark TagsInput + Combobox integration"
                  :options="tagFrameworkOptions"
                  with-combobox
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Checkbox Reference"
            description="Core checkbox primitives plus todo and card variants for richer selection UIs."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Single checkbox for simple toggles.</p>
                </header>
                <ACheckbox
                  v-model="checkboxBasic"
                  label="Accept terms and conditions"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Description</h3>
                  <p>Label + supportive copy.</p>
                </header>
                <ACheckbox
                  v-model="checkboxMarketing"
                  label="Marketing emails"
                  description="Receive emails about new products, features, and release notes."
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Simple Todo</h3>
                  <p>Neutral style todo checkbox.</p>
                </header>
                <ATodoCheckbox
                  v-model="todoSimple"
                  label="Simple todo item"
                  variant="simple"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Fancy Todo</h3>
                  <p>Round success-style todo checkbox.</p>
                </header>
                <ATodoCheckbox
                  v-model="todoFancy"
                  label="Fancy todo item"
                  variant="fancy"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Indeterminate</h3>
                  <p>Parent checkbox controls child feature selection states.</p>
                </header>

                <div class="reference-stack">
                  <ACheckbox
                    :checked="featureParentState"
                    label="Select all features"
                    @checked-change="onFeatureParentChange"
                  />

                  <div class="checkbox-indent">
                    <ACheckbox
                      v-for="feature in featureOptions"
                      :key="feature.value"
                      v-model="featureStates[feature.value]"
                      :label="feature.label"
                    />
                  </div>
                </div>
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Disabled</h3>
                  <p>Disabled unchecked and checked states.</p>
                </header>

                <div class="reference-stack">
                  <ACheckbox
                    v-model="checkboxDisabledUnchecked"
                    label="Disabled unchecked"
                    disabled
                  />
                  <ACheckbox
                    v-model="checkboxDisabledChecked"
                    label="Disabled checked"
                    disabled
                  />
                </div>
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Colors</h3>
                  <p>Color-tinted checked states for themed selectors.</p>
                </header>

                <div class="reference-stack">
                  <ACheckbox
                    v-for="color in colorOptions"
                    :key="color.value"
                    v-model="colorStates[color.value]"
                    :label="color.label"
                    :color="color.color"
                  />
                </div>
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Cards</h3>
                  <p>Card-level selectable surfaces for plans and payment methods.</p>
                </header>

                <div class="checkbox-card-grid">
                  <ACheckboxCard
                    v-model="planBasicChecked"
                    title="Basic Plan"
                    description="Perfect for individuals"
                    caption="$9/month"
                  />
                  <ACheckboxCard
                    v-model="planProChecked"
                    title="Pro Plan"
                    description="Best for teams"
                    caption="$29/month"
                  />
                  <ACheckboxCard
                    v-model="planEnterpriseChecked"
                    title="Enterprise"
                    description="For large organizations"
                    caption="Custom pricing"
                  />
                </div>

                <div class="checkbox-card-grid checkbox-card-grid--two">
                  <ACheckboxCard
                    v-model="paymentCardChecked"
                    title="Credit Card"
                    description="Visa, Mastercard, American Express"
                    icon="i-lucide-credit-card"
                  />
                  <ACheckboxCard
                    v-model="paymentMobileChecked"
                    title="Mobile Payment"
                    description="Apple Pay, Google Pay, Samsung Pay"
                    icon="i-lucide-smartphone"
                  />
                </div>
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Switch Reference"
            description="Switch variants split into purpose-built components so each style stays isolated and lightweight."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Standard rounded switch.</p>
                </header>
                <ASwitchBasic v-model="switchBasic" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Disabled</h3>
                  <p>Disabled state.</p>
                </header>
                <ASwitchBasic v-model="switchDisabled" disabled />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Square</h3>
                  <p>Square control and thumb style.</p>
                </header>
                <ASwitchSquare v-model="switchSquare" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Large Thumb</h3>
                  <p>Compact track with oversized thumb.</p>
                </header>
                <ASwitchLargeThumb v-model="switchLargeThumb" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Bordered</h3>
                  <p>Transparent track with active border fill.</p>
                </header>
                <ASwitchBordered v-model="switchBordered" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Label</h3>
                  <p>Switch label updates between On/Off.</p>
                </header>
                <ASwitchStateLabel v-model="switchStateLabel" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Dual Labels</h3>
                  <p>Moon/Sun indicators on both sides.</p>
                </header>
                <ASwitchDualLabels v-model="switchDualLabels" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Embedded Icons</h3>
                  <p>Icons baked inside the track.</p>
                </header>
                <ASwitchEmbeddedIcons v-model="switchEmbeddedIcons" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Revealing Icons</h3>
                  <p>Side icon visibility changes by state.</p>
                </header>
                <ASwitchRevealingIcons v-model="switchRevealingIcons" />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Embedded Text</h3>
                  <p>ON/OFF text appears inside the track.</p>
                </header>
                <ASwitchEmbeddedText v-model="switchEmbeddedText" />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>In Card</h3>
                  <p>Card layout with content and right-aligned switch.</p>
                </header>
                <ASwitchCard
                  v-model="switchCard"
                  label="Label"
                  sublabel="Sublabel"
                  description="A short description goes here."
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>In Card with Icon</h3>
                  <p>Card layout with feature icon + switch.</p>
                </header>
                <ASwitchIconCard
                  v-model="switchIconCard"
                  label="Billing Method"
                  sublabel="Default"
                  description="Use this method for recurring charges."
                  icon-class="i-lucide-credit-card"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Password Input Reference"
            description="Password field variants for account security flows, API secrets, and confirmation UX."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Standard password entry with visibility toggle.</p>
                </header>
                <APasswordInput
                  v-model="passwordBasic"
                  label="Password"
                  placeholder="Enter password"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Strength</h3>
                  <p>Strength bars and label that update while typing.</p>
                </header>
                <APasswordStrengthInput
                  v-model="passwordStrength"
                  label="Password"
                  placeholder="Create a strong password"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Requirements</h3>
                  <p>Live checklist for minimum password rules.</p>
                </header>
                <APasswordRequirementsInput
                  v-model="passwordRequirements"
                  label="Create Password"
                  placeholder="Create password"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>API Key</h3>
                  <p>Monospace password input with manager suppression.</p>
                </header>
                <APasswordInput
                  v-model="passwordApiKey"
                  label="API Key"
                  placeholder="sk_test_..."
                  helper-text="Keep your API key secure and never share it publicly."
                  ignore-password-managers
                  auto-complete="off"
                  mono
                >
                  <template #label-prefix>
                    <i class="i-lucide-key h-4 w-4" aria-hidden="true" />
                  </template>
                </APasswordInput>
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Validation</h3>
                  <p>Error + helper messaging from field state.</p>
                </header>
                <APasswordInput
                  v-model="passwordWithField"
                  label="Password"
                  placeholder="Minimum 8 characters"
                  :error-text="passwordWithFieldError"
                  :helper-text="passwordWithFieldHelper"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Confirm Password</h3>
                  <p>Two-field confirmation flow with mismatch and match states.</p>
                </header>

                <APasswordConfirmInput
                  v-model:password="passwordConfirmPrimary"
                  v-model:confirm-password="passwordConfirmSecondary"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Number Input Reference"
            description="Core number variants for the field API: base, formatting, ranges, scrubber and wheel."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Standard numeric input with stepper controls.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberBasic"
                  label="Number"
                  helper-text="Step 1"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Currency</h3>
                  <p>Currency display using Intl format options.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberCurrency"
                  label="Price"
                  :step="0.01"
                  :format-options="{
                    style: 'currency',
                    currency: 'EUR',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }"
                  helper-text="formatOptions.style=currency"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Quantity</h3>
                  <p>Inline minus/plus control layout.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberQuantity"
                  mode="quantity"
                  label="Amount"
                  :min="0"
                  :step="1"
                  helper-text="mode=quantity"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Percentage</h3>
                  <p>Percent mode with one decimal place.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberPercent"
                  label="Discount Rate"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :format-options="{
                    style: 'percent',
                    maximumFractionDigits: 1,
                  }"
                  helper-text="formatOptions.style=percent"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Decimal</h3>
                  <p>High precision decimals with custom step.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberDecimal"
                  label="Precision Value"
                  :step="0.001"
                  :format-options="{
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 5,
                  }"
                  helper-text="step=0.001, max 5 decimal places"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Min / Max Clamp</h3>
                  <p>Constrained value range with blur clamping.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberMinMax"
                  label="Rating (0-10)"
                  :min="0"
                  :max="10"
                  :step="1"
                  :clamp-value-on-blur="true"
                  helper-text="clampValueOnBlur=true"
                >
                  <template #footer>
                    <div class="reference-meta">
                      <span>Min: 0</span>
                      <span>Max: 10</span>
                    </div>
                  </template>
                </ANumberInput>
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Scrubber</h3>
                  <p>Drag scrubber icon to adjust value quickly.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberScrubber"
                  label="Interactive Value"
                  :step="1"
                  show-scrubber
                  helper-text="showScrubber=true"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Mouse Wheel</h3>
                  <p>Focus input and use mouse wheel to adjust.</p>
                </header>
                <ANumberInput
                  v-model="referenceDraft.numberWheel"
                  label="Volume Level"
                  :min="0"
                  :max="1000"
                  :step="10"
                  allow-mouse-wheel
                  helper-text="allowMouseWheel=true"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Date Picker Reference"
            description="Ark DatePicker variants tuned as focused widgets: single, multiple, range, unavailable dates, presets, week numbers, and two-month range."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic Calendar</h3>
                  <p>Single-date inline calendar.</p>
                </header>
                <ADateCalendar
                  v-model="dateSingle"
                  label="Basic"
                  helper-text="selectionMode=single"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Multiple Selection</h3>
                  <p>Pick many dates in one calendar.</p>
                </header>
                <ADateCalendar
                  v-model="dateMultiple"
                  selection-mode="multiple"
                  label="Multiple"
                  helper-text="selectionMode=multiple"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Range Selection</h3>
                  <p>Start/end date range selection with in-range styling.</p>
                </header>
                <ADateRangeCalendar
                  v-model="dateRange"
                  label="Range"
                  helper-text="selectionMode=range"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Unavailable Dates</h3>
                  <p>Blocks weekends and past dates.</p>
                </header>
                <ADateCalendar
                  v-model="dateUnavailable"
                  label="Availability"
                  helper-text="unavailablePast + unavailableWeekends"
                  unavailable-past
                  unavailable-weekends
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>With Weeks + Actions</h3>
                  <p>Fixed week rows, week numbers, and footer actions.</p>
                </header>
                <ADateCalendar
                  v-model="dateWithWeeks"
                  label="Week mode"
                  helper-text="fixedWeeks + week numbers + quick actions"
                  fixed-weeks
                  show-week-numbers
                  show-footer-actions
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Range Presets</h3>
                  <p>Preset trigger rail for quick range jumps.</p>
                </header>
                <ADateRangeCalendar
                  v-model="dateRangeWithPresets"
                  label="Range with presets"
                  helper-text="DatePicker.PresetTrigger values"
                  :presets="rangePresets"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Two Months</h3>
                  <p>Two-month range calendar for wider booking windows.</p>
                </header>
                <ADateRangeCalendar
                  v-model="dateTwoMonths"
                  :num-of-months="2"
                  label="Two months"
                  helper-text="numOfMonths=2"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Pricing Meta</h3>
                  <p>Day meta labels (e.g. pricing) with threshold tinting.</p>
                </header>
                <ADateMetaCalendar
                  v-model="datePricing"
                  label="Pricing calendar"
                  helper-text="metaByDate + threshold"
                  :num-of-months="2"
                  :meta-by-date="pricingMetaByDate"
                  :meta-threshold="100"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="File Upload Reference"
            description="File upload variants split by use-case: avatar, dropzone image, multi-image gallery, list/table files, paste flow, and directory upload."
          >
            <div class="reference-grid">
              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Basic</h3>
                  <p>Single image with compact preview + replace action.</p>
                </header>
                <AFileUploadBasic
                  v-model="fileUploadBasic"
                  label="Technology Icon"
                  helper-text="maxFiles=1, accept=image/*"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Avatar Upload</h3>
                  <p>Profile-style rounded uploader with inline delete.</p>
                </header>
                <AFileUploadAvatar
                  v-model="fileUploadAvatar"
                  label="Team Avatar"
                  helper-text="Avatar mode, single image"
                />
              </article>

              <article class="reference-item">
                <header class="reference-item__head">
                  <h3>Drag and Drop</h3>
                  <p>Large dropzone for one hero image.</p>
                </header>
                <AFileUploadDropzone
                  v-model="fileUploadDropzone"
                  label="Hero Image"
                  helper-text="maxFileSize=5MB"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Multiple Images</h3>
                  <p>Image grid manager with per-item remove and bulk clear.</p>
                </header>
                <AFileUploadImagesGrid
                  v-model="fileUploadImages"
                  label="Gallery"
                  helper-text="Image-only, up to 10 files"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Files List</h3>
                  <p>Mixed-file vertical list with previews/icons and sizes.</p>
                </header>
                <AFileUploadList
                  v-model="fileUploadList"
                  label="Attachment List"
                  helper-text="All file types, list style"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Files Table</h3>
                  <p>Table layout with extension, size, download and delete actions.</p>
                </header>
                <AFileUploadTable
                  v-model="fileUploadTable"
                  label="Attachment Table"
                  helper-text="All file types, table style"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>With Paste</h3>
                  <p>Paste files from clipboard while focused on the dropzone.</p>
                </header>
                <AFileUploadPaste
                  v-model="fileUploadPaste"
                  label="Paste Upload"
                  helper-text="Use Ctrl/Cmd + V while focused"
                />
              </article>

              <article class="reference-item reference-item--full">
                <header class="reference-item__head">
                  <h3>Directory Upload</h3>
                  <p>Folder picker with relative path visibility and clear action.</p>
                </header>
                <AFileUploadDirectory
                  v-model="fileUploadDirectory"
                  label="Directory Contents"
                  helper-text="directory=true"
                />
              </article>
            </div>
          </FieldSectionCard>

          <FieldSectionCard
            title="Tree Reference"
            description="he-tree wrapper with fold, checkbox and drag/drop enabled by default. Toggle options to test behavior."
          >
            <div class="taxonomy-controls">
              <label class="taxonomy-controls__item">
                <input v-model="treeOptions.draggable" type="checkbox">
                <span>Draggable</span>
              </label>
              <label class="taxonomy-controls__item">
                <input v-model="treeOptions.checkable" type="checkbox">
                <span>Checkable</span>
              </label>
              <label class="taxonomy-controls__item">
                <input v-model="treeOptions.treeLine" type="checkbox">
                <span>Tree lines</span>
              </label>
            </div>

            <ATree
              v-model="standaloneTree"
              :checked-ids="standaloneChecked"
              :draggable="treeOptions.draggable"
              :checkable="treeOptions.checkable"
              :tree-line="treeOptions.treeLine"
              @update:checked-ids="standaloneChecked = $event"
            />
          </FieldSectionCard>

          <FieldSectionCard
            title="Taxonomy Manager Reference"
            description="Button trigger + large Headless UI modal. Left side tree, right side term creation and selection summary."
          >
            <ATaxonomyManager
              v-model="taxonomyTree"
              :checked-ids="taxonomyChecked"
              taxonomy-label="Car Taxonomy"
              title="Cars Taxonomy"
              description="Create nested terms and select what this record belongs to."
              button-label="Manage Car Taxonomy"
              @update:checked-ids="taxonomyChecked = $event"
            />
          </FieldSectionCard>

          <FieldSectionCard
            title="Live Model"
            description="Current values from the reference demo inputs."
          >
            <pre class="preview-block">{{ referencePreview }}</pre>
          </FieldSectionCard>
        </template>

        <template v-else>
          <FieldSectionCard
            title="Field Component Mapping"
            description="This is the shape we can persist as layout/spec metadata for dynamic page generation."
          >
            <div class="mapping-list">
              <div v-for="field in descriptors" :key="field.key" class="mapping-row">
                <code>{{ field.key }}</code>
                <span>{{ field.type }}</span>
                <span>{{ field.component }}</span>
                <code>{{ field.options.type ?? field.options.mode ?? field.options.formatOptions?.style ?? (field.options.multiple ? 'multiple' : 'single') }}</code>
                <code>draft.{{ field.key }}</code>
              </div>
            </div>
            <pre class="preview-block smt-050">{{ schemaPreview }}</pre>
          </FieldSectionCard>
        </template>
      </main>
    </section>
  </section>
</template>

<style scoped lang="scss">
.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.record-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.record-grid {
  display: grid;
  grid-template-columns: minmax(220px, 248px) minmax(0, 1fr);
  gap: 0.78rem;
}

.record-nav {
  padding: 0.85rem;
  height: fit-content;
  position: sticky;
  top: 0.8rem;
}

.record-nav__stack {
  margin-top: 0.62rem;
  display: grid;
  gap: 0.22rem;
}

.record-nav__item {
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text-soft);
  padding: 0.48rem 0.58rem;
  cursor: pointer;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}

.record-nav__item:hover {
  color: var(--admin-text);
  background: var(--colors-slate-50);
  border-color: var(--colors-slate-200);
  transform: translateY(-1px);
}

.record-nav__item.is-active {
  color: var(--admin-text);
  background: var(--colors-slate-100);
}

.record-main {
  display: grid;
  gap: 0.52rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.52rem;
}

.form-full {
  grid-column: 1 / -1;
}

.preview-block {
  margin: 0;
  padding: 0.75rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: color-mix(in srgb, var(--admin-surface) 94%, white 6%);
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
  line-height: 1.45;
  overflow-x: auto;
}

.mapping-list {
  display: grid;
  gap: 0.4rem;
}

.reference-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.62rem;
}

.reference-item {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  padding: 0.7rem;
  background: color-mix(in srgb, var(--admin-surface) 92%, white 8%);
  display: grid;
  gap: 0.62rem;
}

.reference-item--full {
  grid-column: 1 / -1;
}

.reference-item__head {
  display: grid;
  gap: 0.2rem;
}

.reference-item__head h3 {
  margin: 0;
  font-size: var(--fs-0, 0.95rem);
  color: var(--admin-text);
}

.reference-item__head p {
  margin: 0;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}

.reference-stack {
  display: grid;
  gap: 0.52rem;
}

.checkbox-indent {
  display: grid;
  gap: 0.45rem;
  padding-left: 1.72rem;
}

.checkbox-card-grid {
  display: grid;
  gap: 0.58rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.checkbox-card-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.taxonomy-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 0.65rem;
}

.taxonomy-controls__item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}

.reference-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.mapping-row {
  display: grid;
  grid-template-columns: 1fr 90px 120px 120px 1fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.45rem 0.52rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  font-size: var(--fs--1, 0.78rem);
}

.mapping-row code {
  font-size: 0.78rem;
  color: var(--admin-text-soft);
}

@media (max-width: 1100px) {
  .record-header {
    flex-direction: column;
  }

  .record-grid {
    grid-template-columns: 1fr;
  }

  .record-nav {
    position: static;
  }
}

@media (max-width: 760px) {
  .form-grid,
  .reference-grid,
  .mapping-row {
    grid-template-columns: 1fr;
  }

  .checkbox-card-grid,
  .checkbox-card-grid--two {
    grid-template-columns: 1fr;
  }
}
</style>
