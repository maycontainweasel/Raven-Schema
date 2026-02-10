<script setup lang="ts">
import { computed } from 'vue'
import { DatePicker, parseDate, type DateValue } from '@ark-ui/vue/date-picker'

export type ADatePreset = {
  label: string
  value: string
}

const model = defineModel<DateValue[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    selectionMode?: 'single' | 'multiple' | 'range'
    inline?: boolean
    fixedWeeks?: boolean
    numOfMonths?: number
    startOfWeek?: number
    locale?: string
    timeZone?: string
    presets?: ADatePreset[]
    showFooterActions?: boolean
    showWeekNumbers?: boolean
    unavailablePast?: boolean
    unavailableWeekends?: boolean
    isDateUnavailable?: (date: DateValue, locale: string) => boolean
    metaByDate?: Record<string, string | number>
    metaThreshold?: number
    metaPrefix?: string
  }>(),
  {
    label: '',
    helperText: '',
    selectionMode: 'single',
    inline: true,
    fixedWeeks: false,
    numOfMonths: 1,
    startOfWeek: 0,
    locale: 'en-US',
    timeZone: '',
    presets: () => [],
    showFooterActions: false,
    showWeekNumbers: false,
    unavailablePast: false,
    unavailableWeekends: false,
    isDateUnavailable: undefined,
    metaByDate: () => ({}),
    metaThreshold: 100,
    metaPrefix: '$',
  },
)

const resolvedTimeZone = computed(() => props.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone)
const monthOffsets = computed(() => Array.from({ length: Math.max(1, Number(props.numOfMonths || 1)) }, (_, index) => index))
const hasPresets = computed(() => props.presets.length > 0)
const showFooter = computed(() => props.showFooterActions && props.selectionMode === 'single')
const today = computed(() => parseDate(new Date()))

const dateKey = (value: DateValue) => value.toString()

const getWeekNumber = (value: DateValue) => {
  const date = value.toDate(resolvedTimeZone.value)
  const jan1 = new Date(date.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((Number(date) - Number(jan1)) / 86400000) + 1
  const jan1Day = jan1.getDay()
  return Math.ceil((dayOfYear + jan1Day) / 7)
}

const isWeekendDate = (value: DateValue) => {
  const day = value.toDate(resolvedTimeZone.value).getDay()
  return day === 0 || day === 6
}

const isUnavailable = (value: DateValue, locale: string) => {
  if (props.unavailableWeekends && isWeekendDate(value)) return true
  if (props.unavailablePast && value.compare(today.value) <= 0) return true
  if (props.isDateUnavailable?.(value, locale)) return true
  return false
}

const getMeta = (value: DateValue) => {
  const raw = props.metaByDate[dateKey(value)]
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'number') {
    return {
      text: `${props.metaPrefix}${raw}`,
      tone: raw <= props.metaThreshold ? 'good' : 'neutral',
    }
  }
  const text = String(raw).trim()
  if (!text.length) return null
  return {
    text,
    tone: 'neutral',
  }
}

const metaClass = (value: DateValue) => {
  const meta = getMeta(value)
  if (!meta) return ''
  if (meta.tone === 'good') return 'a-date-picker__meta--good'
  return 'a-date-picker__meta--neutral'
}

const monthLabel = (value: DateValue) => {
  return new Intl.DateTimeFormat(props.locale, {
    month: 'long',
    timeZone: resolvedTimeZone.value,
  }).format(value.toDate(resolvedTimeZone.value))
}

const setToday = (api: any) => {
  api.setValue([today.value])
}

const focusCurrentMonth = (api: any) => {
  api.focusMonth(today.value.month)
}
</script>

<template>
  <DatePicker.Root
    v-model="model"
    class="a-field a-date-picker"
    :inline="inline"
    :selection-mode="selectionMode"
    :time-zone="resolvedTimeZone"
    :fixed-weeks="fixedWeeks"
    :num-of-months="numOfMonths"
    :start-of-week="startOfWeek"
    :locale="locale"
    :is-date-unavailable="isUnavailable"
  >
    <DatePicker.Content class="a-date-picker__content" :class="{ 'a-date-picker__content--with-presets': hasPresets }">
      <DatePicker.Context v-if="hasPresets" v-slot="api">
        <aside class="a-date-picker__presets">
          <DatePicker.PresetTrigger
            v-for="preset in presets"
            :key="preset.value"
            :value="preset.value"
            class="a-date-picker__preset-btn"
          >
            {{ preset.label }}
          </DatePicker.PresetTrigger>
          <button class="a-date-picker__preset-btn" type="button" @click="setToday(api)">
            Today
          </button>
        </aside>
      </DatePicker.Context>

      <div class="a-date-picker__calendar">
        <DatePicker.View view="day" class="a-date-picker__day-view">
          <nav class="a-date-picker__nav">
            <DatePicker.PrevTrigger class="a-date-picker__nav-btn" aria-label="Previous month">
              <i class="i-lucide-chevron-left h-4 w-4" aria-hidden="true" />
            </DatePicker.PrevTrigger>
            <DatePicker.NextTrigger class="a-date-picker__nav-btn" aria-label="Next month">
              <i class="i-lucide-chevron-right h-4 w-4" aria-hidden="true" />
            </DatePicker.NextTrigger>
          </nav>

          <DatePicker.Context v-slot="api">
            <div class="a-date-picker__months" :style="{ '--month-count': String(monthOffsets.length) }">
              <div v-for="offset in monthOffsets" :key="offset" class="a-date-picker__month">
                <DatePicker.ViewControl class="a-date-picker__month-head">
                  <DatePicker.ViewTrigger class="a-date-picker__month-trigger">
                    {{ monthLabel(api.getOffset({ months: offset }).visibleRange.start) }}
                    {{ api.getOffset({ months: offset }).visibleRange.start.year }}
                  </DatePicker.ViewTrigger>
                </DatePicker.ViewControl>

                <DatePicker.Table class="a-date-picker__table">
                  <DatePicker.TableHead>
                    <DatePicker.TableRow>
                      <th v-if="showWeekNumbers" class="a-date-picker__weekhead">Wk</th>
                      <DatePicker.TableHeader
                        v-for="(weekDay, weekDayId) in api.weekDays"
                        :key="weekDayId"
                        class="a-date-picker__weekday"
                      >
                        {{ weekDay.narrow }}
                      </DatePicker.TableHeader>
                    </DatePicker.TableRow>
                  </DatePicker.TableHead>

                  <DatePicker.TableBody>
                    <DatePicker.TableRow
                      v-for="(week, weekId) in api.getOffset({ months: offset }).weeks"
                      :key="weekId"
                    >
                      <td v-if="showWeekNumbers" class="a-date-picker__weeknum">
                        {{ getWeekNumber(week[0]) }}
                      </td>

                      <DatePicker.TableCell
                        v-for="(day, dayId) in week"
                        :key="dayId"
                        :value="day"
                        :visible-range="api.getOffset({ months: offset }).visibleRange"
                        class="a-date-picker__cell"
                      >
                        <DatePicker.TableCellTrigger class="a-date-picker__cell-trigger">
                          <span class="a-date-picker__day">{{ day.day }}</span>
                          <span v-if="getMeta(day)" class="a-date-picker__meta" :class="metaClass(day)">
                            {{ getMeta(day)?.text }}
                          </span>
                        </DatePicker.TableCellTrigger>
                      </DatePicker.TableCell>
                    </DatePicker.TableRow>
                  </DatePicker.TableBody>
                </DatePicker.Table>
              </div>
            </div>

            <div v-if="showFooter" class="a-date-picker__footer">
              <button type="button" class="a-date-picker__footer-btn" @click="setToday(api)">
                Today
              </button>
              <button type="button" class="a-date-picker__footer-btn" @click="focusCurrentMonth(api)">
                Current month
              </button>
            </div>
          </DatePicker.Context>
        </DatePicker.View>

        <DatePicker.View view="month">
          <DatePicker.Context v-slot="api">
            <DatePicker.ViewControl class="a-date-picker__sub-nav">
              <DatePicker.PrevTrigger class="a-date-picker__nav-btn" aria-label="Previous year">
                <i class="i-lucide-chevron-left h-4 w-4" aria-hidden="true" />
              </DatePicker.PrevTrigger>
              <DatePicker.ViewTrigger class="a-date-picker__sub-title">
                <DatePicker.RangeText />
              </DatePicker.ViewTrigger>
              <DatePicker.NextTrigger class="a-date-picker__nav-btn" aria-label="Next year">
                <i class="i-lucide-chevron-right h-4 w-4" aria-hidden="true" />
              </DatePicker.NextTrigger>
            </DatePicker.ViewControl>

            <DatePicker.Table class="a-date-picker__sub-table">
              <DatePicker.TableBody>
                <DatePicker.TableRow
                  v-for="(months, rowId) in api.getMonthsGrid({ columns: 4, format: 'short' })"
                  :key="rowId"
                >
                  <DatePicker.TableCell
                    v-for="(month, monthId) in months"
                    :key="monthId"
                    :value="month.value"
                    class="a-date-picker__sub-cell"
                  >
                    <DatePicker.TableCellTrigger class="a-date-picker__sub-trigger">
                      {{ month.label }}
                    </DatePicker.TableCellTrigger>
                  </DatePicker.TableCell>
                </DatePicker.TableRow>
              </DatePicker.TableBody>
            </DatePicker.Table>
          </DatePicker.Context>
        </DatePicker.View>

        <DatePicker.View view="year">
          <DatePicker.Context v-slot="api">
            <DatePicker.ViewControl class="a-date-picker__sub-nav">
              <DatePicker.PrevTrigger class="a-date-picker__nav-btn" aria-label="Previous year page">
                <i class="i-lucide-chevron-left h-4 w-4" aria-hidden="true" />
              </DatePicker.PrevTrigger>
              <DatePicker.ViewTrigger class="a-date-picker__sub-title">
                <DatePicker.RangeText />
              </DatePicker.ViewTrigger>
              <DatePicker.NextTrigger class="a-date-picker__nav-btn" aria-label="Next year page">
                <i class="i-lucide-chevron-right h-4 w-4" aria-hidden="true" />
              </DatePicker.NextTrigger>
            </DatePicker.ViewControl>

            <DatePicker.Table class="a-date-picker__sub-table">
              <DatePicker.TableBody>
                <DatePicker.TableRow v-for="(years, rowId) in api.getYearsGrid({ columns: 4 })" :key="rowId">
                  <DatePicker.TableCell
                    v-for="(year, yearId) in years"
                    :key="yearId"
                    :value="year.value"
                    class="a-date-picker__sub-cell"
                  >
                    <DatePicker.TableCellTrigger class="a-date-picker__sub-trigger">
                      {{ year.label }}
                    </DatePicker.TableCellTrigger>
                  </DatePicker.TableCell>
                </DatePicker.TableRow>
              </DatePicker.TableBody>
            </DatePicker.Table>
          </DatePicker.Context>
        </DatePicker.View>
      </div>
    </DatePicker.Content>

    <p v-if="label" class="a-date-picker__label">{{ label }}</p>
    <p v-if="helperText" class="a-date-picker__helper">{{ helperText }}</p>
  </DatePicker.Root>
</template>

<style scoped>
.a-date-picker {
  gap: 0.4rem;
}

.a-date-picker__content {
  display: inline-flex;
  background: var(--admin-surface);
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-md);
  box-shadow: 0 16px 34px rgba(17, 32, 62, 0.15);
  padding: 0.72rem;
}

.a-date-picker__content--with-presets {
  gap: 0.74rem;
}

.a-date-picker__presets {
  border-right: 1px solid var(--admin-border);
  padding-right: 0.7rem;
  width: 8rem;
  display: grid;
  gap: 0.25rem;
  align-content: start;
}

.a-date-picker__preset-btn {
  border: 1px solid transparent;
  border-radius: 0.52rem;
  background: transparent;
  color: var(--admin-text-soft);
  text-align: left;
  padding: 0.38rem 0.44rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  cursor: pointer;
}

.a-date-picker__preset-btn:hover {
  color: var(--admin-text);
  background: var(--admin-surface-soft);
  border-color: var(--admin-border);
}

.a-date-picker__calendar {
  min-width: 19rem;
}

.a-date-picker__day-view {
  position: relative;
}

.a-date-picker__nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  z-index: 2;
}

.a-date-picker__nav-btn {
  border: 0;
  background: transparent;
  color: var(--admin-text-soft);
  width: 1.8rem;
  height: 1.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  cursor: pointer;
}

.a-date-picker__nav-btn:hover {
  background: var(--admin-surface-soft);
  color: var(--admin-text);
}

.a-date-picker__months {
  display: grid;
  gap: 0.72rem;
  grid-template-columns: repeat(var(--month-count), minmax(0, 1fr));
}

.a-date-picker__month {
  min-width: 0;
}

.a-date-picker__month-head {
  margin: 0 2.1rem 0.28rem;
  min-height: 1.8rem;
  display: flex;
  justify-content: center;
}

.a-date-picker__month-trigger {
  border: 0;
  background: transparent;
  border-radius: 0.44rem;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  padding: 0.18rem 0.44rem;
  cursor: pointer;
}

.a-date-picker__month-trigger:hover {
  background: var(--admin-surface-soft);
}

.a-date-picker__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.12rem;
}

.a-date-picker__weekday {
  width: 2.2rem;
  height: 1.52rem;
  text-align: center;
  color: var(--admin-muted-2);
  font-size: 0.73rem;
  font-weight: 600;
}

.a-date-picker__weekhead,
.a-date-picker__weeknum {
  width: 1.8rem;
  text-align: center;
  color: var(--admin-muted-2);
  font-size: 0.7rem;
}

.a-date-picker__cell {
  padding: 0;
}

.a-date-picker__cell-trigger {
  width: 2.2rem;
  min-height: 2.2rem;
  padding: 0.14rem 0;
  border: 0;
  border-radius: 0.58rem;
  background: transparent;
  color: var(--admin-text);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.06rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  cursor: pointer;
}

.a-date-picker__cell-trigger:hover {
  background: var(--admin-surface-soft);
}

.a-date-picker__cell-trigger[data-selected] {
  background: var(--admin-brand);
  color: #fff;
}

.a-date-picker__cell-trigger[data-in-range] {
  background: color-mix(in srgb, var(--admin-brand) 16%, transparent);
  border-radius: 0;
}

.a-date-picker__cell-trigger[data-range-start],
.a-date-picker__cell-trigger[data-range-end] {
  background: var(--admin-brand);
  color: #fff;
  border-radius: 0.58rem;
}

.a-date-picker__cell-trigger[data-outside-range] {
  color: var(--admin-muted-2);
}

.a-date-picker__cell-trigger[data-outside-range='true'] {
  color: var(--admin-muted-2);
}

.a-date-picker__cell-trigger[data-unavailable] {
  text-decoration: line-through;
  color: var(--admin-muted-2);
  opacity: 0.55;
  cursor: not-allowed;
}

.a-date-picker__day {
  line-height: 1;
}

.a-date-picker__meta {
  font-size: 0.62rem;
  line-height: 1;
  font-weight: 600;
}

.a-date-picker__meta--good {
  color: #169c53;
}

.a-date-picker__meta--neutral {
  color: var(--admin-muted-2);
}

.a-date-picker__cell-trigger[data-selected] .a-date-picker__meta {
  color: rgba(255, 255, 255, 0.88);
}

.a-date-picker__footer {
  margin-top: 0.55rem;
  display: flex;
  justify-content: space-between;
  gap: 0.44rem;
}

.a-date-picker__footer-btn {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text);
  border-radius: 0.5rem;
  padding: 0.28rem 0.5rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  cursor: pointer;
}

.a-date-picker__footer-btn:hover {
  background: var(--admin-surface-soft);
}

.a-date-picker__sub-nav {
  margin-top: 0.48rem;
  margin-bottom: 0.44rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.a-date-picker__sub-title {
  border: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  border-radius: 0.45rem;
  padding: 0.16rem 0.4rem;
  cursor: pointer;
}

.a-date-picker__sub-title:hover {
  background: var(--admin-surface-soft);
}

.a-date-picker__sub-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0.12rem;
}

.a-date-picker__sub-cell {
  padding: 0;
}

.a-date-picker__sub-trigger {
  width: 4rem;
  height: 2.25rem;
  border: 0;
  background: transparent;
  border-radius: 0.56rem;
  color: var(--admin-text);
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  cursor: pointer;
}

.a-date-picker__sub-trigger:hover {
  background: var(--admin-surface-soft);
}

.a-date-picker__sub-trigger[data-selected] {
  background: var(--admin-brand);
  color: #fff;
}

.a-date-picker__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-date-picker__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

@media (max-width: 900px) {
  .a-date-picker__content {
    width: 100%;
    overflow-x: auto;
  }
}
</style>
