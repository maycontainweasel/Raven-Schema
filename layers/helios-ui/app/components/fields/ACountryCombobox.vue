<script setup lang="ts">
import ACombobox, { type AComboboxOption } from './ACombobox.vue'

export type ACountryOption = {
  label: string
  value: string
  region?: string
  flag?: string
  dialCode?: string
}

const model = defineModel<string>({ default: '' })

const defaultCountries: ACountryOption[] = [
  { label: 'United States', value: 'us', region: 'North America', flag: 'US', dialCode: '+1' },
  { label: 'Canada', value: 'ca', region: 'North America', flag: 'CA', dialCode: '+1' },
  { label: 'Mexico', value: 'mx', region: 'North America', flag: 'MX', dialCode: '+52' },
  { label: 'United Kingdom', value: 'uk', region: 'Europe', flag: 'UK', dialCode: '+44' },
  { label: 'Germany', value: 'de', region: 'Europe', flag: 'DE', dialCode: '+49' },
  { label: 'France', value: 'fr', region: 'Europe', flag: 'FR', dialCode: '+33' },
  { label: 'Spain', value: 'es', region: 'Europe', flag: 'ES', dialCode: '+34' },
  { label: 'Italy', value: 'it', region: 'Europe', flag: 'IT', dialCode: '+39' },
  { label: 'Netherlands', value: 'nl', region: 'Europe', flag: 'NL', dialCode: '+31' },
  { label: 'Sweden', value: 'se', region: 'Europe', flag: 'SE', dialCode: '+46' },
  { label: 'Japan', value: 'jp', region: 'Asia', flag: 'JP', dialCode: '+81' },
  { label: 'South Korea', value: 'kr', region: 'Asia', flag: 'KR', dialCode: '+82' },
  { label: 'Singapore', value: 'sg', region: 'Asia', flag: 'SG', dialCode: '+65' },
  { label: 'India', value: 'in', region: 'Asia', flag: 'IN', dialCode: '+91' },
  { label: 'Australia', value: 'au', region: 'Oceania', flag: 'AU', dialCode: '+61' },
  { label: 'New Zealand', value: 'nz', region: 'Oceania', flag: 'NZ', dialCode: '+64' },
  { label: 'Brazil', value: 'br', region: 'South America', flag: 'BR', dialCode: '+55' },
  { label: 'Argentina', value: 'ar', region: 'South America', flag: 'AR', dialCode: '+54' },
  { label: 'South Africa', value: 'za', region: 'Africa', flag: 'ZA', dialCode: '+27' },
  { label: 'Nigeria', value: 'ng', region: 'Africa', flag: 'NG', dialCode: '+234' },
]

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    helperText?: string
    clearable?: boolean
    disabled?: boolean
    groupedByRegion?: boolean
    countries?: ACountryOption[]
  }>(),
  {
    label: 'Country',
    placeholder: 'Search for a country...',
    helperText: '',
    clearable: true,
    disabled: false,
    groupedByRegion: true,
  },
)

const normalizedCountries = computed<ACountryOption[]>(() => {
  const sourceCountries = Array.isArray(props.countries) && props.countries.length
    ? props.countries
    : defaultCountries
  const output: ACountryOption[] = []
  const seen = new Set<string>()
  for (const entry of sourceCountries) {
    if (!entry || typeof entry.value !== 'string') continue
    const value = entry.value.trim().toLowerCase()
    if (!value || seen.has(value)) continue
    seen.add(value)
    output.push({
      label: entry.label?.trim() || value.toUpperCase(),
      value,
      region: entry.region?.trim() || 'General',
      flag: entry.flag?.trim() || value.toUpperCase(),
      dialCode: entry.dialCode?.trim() || '',
    })
  }
  return output
})

const options = computed<AComboboxOption[]>(() => normalizedCountries.value.map((country) => ({
  value: country.value,
  label: `[${country.flag}] ${country.label}${country.dialCode ? ` (${country.dialCode})` : ''}`,
  group: props.groupedByRegion ? country.region : undefined,
})))

const selectedCountry = computed(() => normalizedCountries.value.find((country) => country.value === model.value) || null)

const resolvedHelperText = computed(() => {
  if (props.helperText) return props.helperText
  if (!selectedCountry.value) return 'Type to filter countries.'
  return `${selectedCountry.value.label}${selectedCountry.value.dialCode ? ` ${selectedCountry.value.dialCode}` : ''}`
})
</script>

<template>
  <ACombobox
    v-model="model"
    :label="props.label"
    :placeholder="props.placeholder"
    :helper-text="resolvedHelperText"
    :options="options"
    :clearable="props.clearable"
    :disabled="props.disabled"
    :grouped="props.groupedByRegion"
    highlight-match
  />
</template>
