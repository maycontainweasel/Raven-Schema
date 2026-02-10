import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type AInputType = 'text' | 'email' | 'password'
export type FieldComponentType = 'AInput' | 'ACombobox' | 'AComboboxAsync' | 'AColorPicker' | 'ANumberInput'

export type FieldDescriptor = {
  key: keyof UserFieldDraft
  label: string
  type: 'string' | 'string[]'
  component: FieldComponentType
  options: Record<string, any>
}

export type UserFieldDraft = {
  firstName: string
  surname: string
  email: string
  brandColor: string
  quantity: string
  price: string
  discountRate: string
  framework: string
  technology: string
  skills: string[]
  assignee: string
}

const initialDraft = (): UserFieldDraft => ({
  firstName: '',
  surname: '',
  email: '',
  brandColor: '#000000',
  quantity: '1',
  price: '99.00',
  discountRate: '15',
  framework: '',
  technology: '',
  skills: [],
  assignee: '',
})

export const useFieldsStore = defineStore('fields-store', () => {
  const draft = ref<UserFieldDraft>(initialDraft())

  const descriptors = ref<FieldDescriptor[]>([
    {
      key: 'firstName',
      label: 'First Name',
      type: 'string',
      component: 'AInput',
      options: {
        type: 'text',
        placeholder: 'Enter first name',
        helperText: 'Mapped to `draft.firstName` in the Pinia store.',
      },
    },
    {
      key: 'surname',
      label: 'Surname',
      type: 'string',
      component: 'AInput',
      options: {
        type: 'text',
        placeholder: 'Enter surname',
        helperText: 'Mapped to `draft.surname` in the Pinia store.',
      },
    },
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      component: 'AInput',
      options: {
        type: 'email',
        placeholder: 'name@example.com',
        helperText: 'Mapped to `draft.email` in the Pinia store.',
      },
    },
    {
      key: 'brandColor',
      label: 'Brand Color',
      type: 'string',
      component: 'AColorPicker',
      options: {
        helperText: 'Hex value mapped to `draft.brandColor`.',
      },
    },
    {
      key: 'framework',
      label: 'Framework',
      type: 'string',
      component: 'ACombobox',
      options: {
        grouped: false,
        highlightMatch: true,
        multiple: false,
        placeholder: 'Search frameworks...',
        helperText: 'Mapped to `draft.framework` from combobox value.',
      },
    },
    {
      key: 'quantity',
      label: 'Quantity',
      type: 'string',
      component: 'ANumberInput',
      options: {
        mode: 'quantity',
        min: 0,
        step: 1,
        helperText: 'Mapped to `draft.quantity`.',
      },
    },
    {
      key: 'price',
      label: 'Price',
      type: 'string',
      component: 'ANumberInput',
      options: {
        min: 0,
        step: 0.01,
        formatOptions: {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
        helperText: 'Mapped to `draft.price`.',
      },
    },
    {
      key: 'discountRate',
      label: 'Discount Rate',
      type: 'string',
      component: 'ANumberInput',
      options: {
        min: 0,
        max: 100,
        step: 0.1,
        formatOptions: {
          style: 'percent',
          maximumFractionDigits: 1,
        },
        helperText: 'Mapped to `draft.discountRate`.',
      },
    },
    {
      key: 'technology',
      label: 'Technology',
      type: 'string',
      component: 'ACombobox',
      options: {
        grouped: true,
        highlightMatch: true,
        multiple: false,
        placeholder: 'Search technologies...',
        helperText: 'Grouped combobox mapped to `draft.technology`.',
      },
    },
    {
      key: 'skills',
      label: 'Skills',
      type: 'string[]',
      component: 'ACombobox',
      options: {
        grouped: false,
        highlightMatch: false,
        multiple: true,
        placeholder: 'Add skills...',
        helperText: 'Multiple combobox mapped to `draft.skills`.',
      },
    },
    {
      key: 'assignee',
      label: 'Assignee',
      type: 'string',
      component: 'AComboboxAsync',
      options: {
        minChars: 2,
        grouped: false,
        highlightMatch: false,
        multiple: false,
        placeholder: 'Type to search users...',
        helperText: 'Async combobox mapped to `draft.assignee`.',
      },
    },
  ])

  const schemaDescriptor = computed(() => {
    return descriptors.value.map((field) => ({
      key: field.key,
      type: field.type,
      component: field.component,
      options: field.options,
      modelPath: `draft.${field.key}`,
    }))
  })

  const resetDraft = () => {
    draft.value = initialDraft()
  }

  const setField = (key: keyof UserFieldDraft, value: string | string[]) => {
    draft.value = {
      ...draft.value,
      [key]: value,
    }
  }

  return {
    draft,
    descriptors,
    schemaDescriptor,
    resetDraft,
    setField,
  }
})
