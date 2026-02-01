# Date Picker Notes

## What was added
- `UiDatePicker.vue` headless single-date picker using Headless UI `Popover` and `TransitionRoot`.
- Built on existing `.input` styling from `app/assets/scss/_components.scss` for visual consistency.
- Uses `date-fns` for calendar math and formatting.
- Uses `i-lucide:calendar` icon via Iconify.
- A small lab page for testing: `app/pages/datepicker-test.vue`.

## Component API (current)
- `modelValue: Date | null`
- `placeholder?: string` (default: `Select date`)
- `displayFormat?: string` (default: `MMM d, yyyy`)
- `weekStartsOn?: 0-6` (default: `0` Sunday)
- `min?: Date | null`
- `max?: Date | null`
- `disabledDates?: (date: Date) => boolean`
- `allowClear?: boolean` (default: `false`)
- `closeOnSelect?: boolean` (default: `true`)

## Behavior highlights
- Month navigation (prev/next).
- Outside-month days included in the grid.
- Disabled dates via min/max or custom function.
- Optional clear action.

## Suggestions / next steps
- **Keyboard nav:** roving focus, arrow keys, Home/End, PageUp/Down.
- **Manual input parsing:** optional text input mode with validation.
- **Range variant:** start/end date with hover preview.
- **Presets:** quick actions like Today, Yesterday, Next 7 days.
- **Positioning:** optional portal + smarter placement for small viewports.
- **A11y polish:** aria labels for day buttons (full date), focus trap in popover.
- **Styling tokens:** extract calendar-specific utility classes into SCSS for reuse.

## Open questions
- Should `modelValue` support ISO strings for generator compatibility?
- Do we want timezones or strictly local dates?
- Do we want multi-month view or week picker as a separate variant?
