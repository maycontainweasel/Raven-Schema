<script setup lang="ts">
import type { DateValue } from '@ark-ui/vue/date-picker'
import ADatePicker from './ADatePicker.vue'

const model = defineModel<DateValue[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    selectionMode?: 'single' | 'multiple'
    fixedWeeks?: boolean
    showWeekNumbers?: boolean
    showFooterActions?: boolean
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
    selectionMode: 'single',
    fixedWeeks: false,
    showWeekNumbers: false,
    showFooterActions: false,
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
    :label="props.label"
    :helper-text="props.helperText"
    :selection-mode="props.selectionMode"
    :fixed-weeks="props.fixedWeeks"
    :show-week-numbers="props.showWeekNumbers"
    :show-footer-actions="props.showFooterActions"
    :unavailable-past="props.unavailablePast"
    :unavailable-weekends="props.unavailableWeekends"
    :is-date-unavailable="props.isDateUnavailable"
    :start-of-week="props.startOfWeek"
    :locale="props.locale"
    :time-zone="props.timeZone"
  />
</template>
