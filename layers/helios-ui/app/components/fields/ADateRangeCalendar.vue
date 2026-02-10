<script setup lang="ts">
import type { DateValue } from '@ark-ui/vue/date-picker'
import ADatePicker, { type ADatePreset } from './ADatePicker.vue'

export type ADateRangePreset = ADatePreset

const model = defineModel<DateValue[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    numOfMonths?: number
    presets?: ADatePreset[]
    unavailablePast?: boolean
    unavailableWeekends?: boolean
    isDateUnavailable?: (date: DateValue, locale: string) => boolean
    startOfWeek?: number
    locale?: string
    timeZone?: string
  }>(),
  {
    label: '',
    helperText: '',
    numOfMonths: 1,
    presets: () => [],
    unavailablePast: false,
    unavailableWeekends: false,
    isDateUnavailable: undefined,
    startOfWeek: 0,
    locale: 'en-US',
    timeZone: '',
  },
)
</script>

<template>
  <ADatePicker
    v-model="model"
    selection-mode="range"
    :label="props.label"
    :helper-text="props.helperText"
    :num-of-months="props.numOfMonths"
    :presets="props.presets"
    :unavailable-past="props.unavailablePast"
    :unavailable-weekends="props.unavailableWeekends"
    :is-date-unavailable="props.isDateUnavailable"
    :start-of-week="props.startOfWeek"
    :locale="props.locale"
    :time-zone="props.timeZone"
  />
</template>
