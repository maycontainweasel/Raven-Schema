<script setup lang="ts">
import type { DateValue } from '@ark-ui/vue/date-picker'
import ADatePicker from './ADatePicker.vue'

const model = defineModel<DateValue[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    numOfMonths?: number
    metaByDate?: Record<string, string | number>
    metaThreshold?: number
    metaPrefix?: string
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
    numOfMonths: 2,
    metaByDate: () => ({}),
    metaThreshold: 100,
    metaPrefix: '$',
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
    selection-mode="single"
    :label="props.label"
    :helper-text="props.helperText"
    :num-of-months="props.numOfMonths"
    :meta-by-date="props.metaByDate"
    :meta-threshold="props.metaThreshold"
    :meta-prefix="props.metaPrefix"
    :unavailable-past="props.unavailablePast"
    :unavailable-weekends="props.unavailableWeekends"
    :is-date-unavailable="props.isDateUnavailable"
    :start-of-week="props.startOfWeek"
    :locale="props.locale"
    :time-zone="props.timeZone"
  />
</template>
