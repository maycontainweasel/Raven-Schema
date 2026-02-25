export const KNOWN_FIELD_COMPONENT_IDS = [
  'AInput',
  'ACombobox',
  'AComboboxAsync',
] as const

export type FieldComponentId = (typeof KNOWN_FIELD_COMPONENT_IDS)[number]

export type FieldComponentSpec = {
  name: FieldComponentId | string
  options: Record<string, any>
  action?: string
  modelKey?: string
}

export type ModelDataMode = 'source' | 'tenant'

export type FieldValidationRules = Record<string, any>

export type FieldBindingModel = {
  kind: 'model'
  action: string
  payloadKey: string
}

export type FieldBindingSubtable = {
  kind: 'subtable'
  subtableKey: string
  action: string
  payloadKey: string
}

export type FieldBindingTaxonomy = {
  kind: 'taxonomy'
  taxonomyKey: string
  valueMode: 'termIds'
  actions: {
    getTerms: string
    getRecordTerms: string
    attach: string
    detach: string
    addTerm?: string
  }
}

export type FieldBindingCustom = {
  kind: 'custom'
  handler: string
}

export type FieldBinding =
  | FieldBindingModel
  | FieldBindingSubtable
  | FieldBindingTaxonomy
  | FieldBindingCustom

export type FieldCommonProps = {
  id: string
  field: string
  label: string
  component: FieldComponentSpec
  binding?: FieldBinding
  action?: string
  modelKey?: string
  validation?: FieldValidationRules
  class?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  tabindex?: number
  meta?: Record<string, any>
}

export type AComboboxOption = {
  label: string
  value: string
  group?: string
  disabled?: boolean
}

export type AInputOptions = {
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  helperText?: string
  errorText?: string
  required?: boolean
  disabled?: boolean
}

export type AComboboxOptions = {
  placeholder?: string
  helperText?: string
  errorText?: string
  options?: AComboboxOption[]
  multiple?: boolean
  grouped?: boolean
  highlightMatch?: boolean
  clearable?: boolean
  showIndicator?: boolean
  emptyText?: string
  disabled?: boolean
}

export type AComboboxAsyncLoaderOptions = {
  endpoint?: string
  queryParam?: string
  debounceMs?: number
  mode?: 'local' | 'remote'
}

export type AComboboxAsyncOptions = AComboboxOptions & {
  minChars?: number
  searchMode?: 'local' | 'remote'
  loader?: AComboboxAsyncLoaderOptions
}

export type FieldComponentOptionsMap = {
  AInput: AInputOptions
  ACombobox: AComboboxOptions
  AComboboxAsync: AComboboxAsyncOptions
}

export type FieldComponentOptionType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'

export type FieldComponentOptionDefinition = {
  key: string
  type: FieldComponentOptionType
  required?: boolean
  description: string
  values?: string[]
  defaultValue?: unknown
}

export type FieldComponentContract = {
  id: FieldComponentId
  title: string
  description: string
  category: 'form'
  valueShape: string
  options: FieldComponentOptionDefinition[]
  requiredOptions: string[]
  optionalOptions: string[]
  supports: {
    staticOptions?: boolean
    asyncSearch?: boolean
    multiple?: boolean
  }
}

export const isKnownFieldComponentId = (value: unknown): value is FieldComponentId => {
  return KNOWN_FIELD_COMPONENT_IDS.includes(value as FieldComponentId)
}
