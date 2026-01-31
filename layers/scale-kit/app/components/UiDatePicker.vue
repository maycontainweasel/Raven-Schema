<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel, TransitionRoot } from '@headlessui/vue'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  endOfDay,
  startOfMonth,
  startOfWeek,
  subMonths
} from 'date-fns'

const props = withDefaults(
  defineProps<{
    modelValue: Date | null
    placeholder?: string
    displayFormat?: string
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
    min?: Date | null
    max?: Date | null
    disabledDates?: (date: Date) => boolean
    allowClear?: boolean
    closeOnSelect?: boolean
  }>(),
  {
    placeholder: 'Select date',
    displayFormat: 'MMM d, yyyy',
    weekStartsOn: 0,
    allowClear: false,
    closeOnSelect: true
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: Date | null): void
}>()

const selectedDate = computed(() => props.modelValue)

const visibleMonth = ref(startOfMonth(selectedDate.value ?? new Date()))

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      visibleMonth.value = startOfMonth(value)
    }
  }
)

const minDate = computed(() => (props.min ? startOfDay(props.min) : null))
const maxDate = computed(() => (props.max ? endOfDay(props.max) : null))

const weekdayLabels = computed(() => {
  const start = startOfWeek(new Date(), { weekStartsOn: props.weekStartsOn })
  return Array.from({ length: 7 }, (_, index) => format(addDays(start, index), 'EEEEE'))
})

const calendarDays = computed(() => {
  const start = startOfWeek(startOfMonth(visibleMonth.value), { weekStartsOn: props.weekStartsOn })
  const end = endOfWeek(endOfMonth(visibleMonth.value), { weekStartsOn: props.weekStartsOn })
  const days: Date[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return days
})

const displayValue = computed(() => {
  if (!selectedDate.value) return ''
  return format(selectedDate.value, props.displayFormat)
})

const isDisabled = (date: Date) => {
  if (minDate.value && isBefore(date, minDate.value)) return true
  if (maxDate.value && isAfter(date, maxDate.value)) return true
  if (props.disabledDates?.(date)) return true
  return false
}

const isSelected = (date: Date) => {
  if (!selectedDate.value) return false
  return isSameDay(date, selectedDate.value)
}

const selectDate = (date: Date, close?: () => void) => {
  if (isDisabled(date)) return
  emit('update:modelValue', date)
  if (props.closeOnSelect) close?.()
}

const clearDate = (close?: () => void) => {
  emit('update:modelValue', null)
  close?.()
}

const goPrev = () => {
  visibleMonth.value = startOfMonth(subMonths(visibleMonth.value, 1))
}

const goNext = () => {
  visibleMonth.value = startOfMonth(addMonths(visibleMonth.value, 1))
}
</script>

<template>
  <Popover v-slot="{ open, close }" class="relative w-full">
    <div class="relative">
      <PopoverButton class="input w-full text-left pr-10" type="button">
        <span v-if="displayValue">{{ displayValue }}</span>
        <span v-else class="text-muted">{{ placeholder }}</span>
      </PopoverButton>
      <button
        v-if="allowClear && selectedDate"
        type="button"
        class="absolute inset-y-0 right-7 flex items-center px-1 text-muted"
        @click.stop="clearDate()"
      >
        <span class="i-lucide:x text-sm" />
      </button>
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-muted">
        <span class="i-lucide:calendar text-base" />
      </span>
    </div>

    <TransitionRoot
      :show="open"
      as="template"
      enter="transition ease-out duration-150"
      enter-from="opacity-0 translate-y-1"
      enter-to="opacity-100 translate-y-0"
      leave="transition ease-in duration-100"
      leave-from="opacity-100 translate-y-0"
      leave-to="opacity-0 translate-y-1"
    >
      <PopoverPanel
        class="absolute left-0 z-50 mt-2 w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-lg"
      >
        <div class="flex items-center justify-between">
          <button class="btn btn-ghost btn-sm" type="button" @click="goPrev">
            <span class="i-lucide:chevron-down text-base rotate-90" />
          </button>
          <div class="text-sm font-semibold">{{ format(visibleMonth, 'MMMM yyyy') }}</div>
          <button class="btn btn-ghost btn-sm" type="button" @click="goNext">
            <span class="i-lucide:chevron-down text-base -rotate-90" />
          </button>
        </div>

        <div class="mt-3 grid grid-cols-7 text-xs text-muted">
          <div v-for="label in weekdayLabels" :key="label" class="text-center">
            {{ label }}
          </div>
        </div>

        <div class="mt-2 grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarDays"
            :key="format(day, 'yyyy-MM-dd')"
            type="button"
            class="h-8 w-8 rounded-md text-sm transition"
            :class="{
              'text-muted': !isSameMonth(day, visibleMonth),
              'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]': isSelected(day),
              'hover:bg-[var(--color-surface-muted)]': !isSelected(day) && !isDisabled(day),
              'border border-[var(--color-border)]': isToday(day) && !isSelected(day),
              'cursor-not-allowed opacity-40': isDisabled(day)
            }"
            :disabled="isDisabled(day)"
            :aria-selected="isSelected(day)"
            :aria-disabled="isDisabled(day)"
            @click="selectDate(day, close)"
          >
            {{ format(day, 'd') }}
          </button>
        </div>

        <div v-if="allowClear && selectedDate" class="mt-3 flex justify-end">
          <button class="btn btn-ghost btn-sm" type="button" @click="clearDate(close)">Clear</button>
        </div>
      </PopoverPanel>
    </TransitionRoot>
  </Popover>
</template>
