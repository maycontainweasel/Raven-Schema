import type {
  AComboboxAsyncOptions,
  AComboboxOptions,
  AInputOptions,
  FieldComponentContract,
  FieldComponentId,
} from '../types/field-contract'

type FieldComponentRegistryEntry = {
  contract: FieldComponentContract
  specSnippet: string
  defaults: Record<string, any>
  examples: Array<{
    id: string
    label: string
    description: string
    options: Record<string, any>
  }>
}

const contracts: Record<FieldComponentId, FieldComponentRegistryEntry> = {
  AInput: {
    contract: {
      id: 'AInput',
      title: 'Text Input',
      description: 'Single-line Ark input wrapper with Helios field chrome.',
      category: 'form',
      valueShape: 'string | number',
      requiredOptions: [],
      optionalOptions: ['type', 'placeholder', 'helperText', 'errorText', 'required', 'disabled'],
      supports: {
        multiple: false,
      },
    },
    specSnippet: `component:
  name: AInput
  options:
    type: text
    placeholder: Enter first name
    helperText: Appears on profile card
binding:
  kind: model
  action: user.update
  payloadKey: firstName`,
    defaults: {
      type: 'text',
      placeholder: '',
      helperText: '',
      errorText: '',
      required: false,
      disabled: false,
    } satisfies AInputOptions,
    examples: [
      {
        id: 'default',
        label: 'Default text',
        description: 'Base field for scalar string model values.',
        options: {
          type: 'text',
          placeholder: 'Enter value',
        } satisfies AInputOptions,
      },
      {
        id: 'number',
        label: 'Number input',
        description: 'Numeric field for amounts/count values.',
        options: {
          type: 'number',
          placeholder: '0',
        } satisfies AInputOptions,
      },
    ],
  },
  ACombobox: {
    contract: {
      id: 'ACombobox',
      title: 'Combobox',
      description: 'Searchable select with optional grouping/multi-select.',
      category: 'form',
      valueShape: 'string | string[] | null',
      requiredOptions: ['options'],
      optionalOptions: [
        'placeholder',
        'helperText',
        'errorText',
        'multiple',
        'grouped',
        'highlightMatch',
        'clearable',
        'showIndicator',
        'emptyText',
        'disabled',
      ],
      supports: {
        staticOptions: true,
        multiple: true,
      },
    },
    specSnippet: `component:
  name: ACombobox
  options:
    options:
      - label: South Africa
        value: za
      - label: United Kingdom
        value: uk
    grouped: false
    multiple: false
binding:
  kind: model
  action: user.profile.update
  payloadKey: country`,
    defaults: {
      options: [],
      placeholder: '',
      helperText: '',
      errorText: '',
      multiple: false,
      grouped: false,
      highlightMatch: false,
      clearable: true,
      showIndicator: true,
      emptyText: 'No options found.',
      disabled: false,
    } satisfies AComboboxOptions,
    examples: [
      {
        id: 'single',
        label: 'Single select',
        description: 'Select one option from static list.',
        options: {
          multiple: false,
          grouped: false,
          highlightMatch: true,
        } satisfies AComboboxOptions,
      },
      {
        id: 'multi',
        label: 'Multi select',
        description: 'Collect multiple terms/tags in one field.',
        options: {
          multiple: true,
          grouped: true,
          highlightMatch: true,
        } satisfies AComboboxOptions,
      },
    ],
  },
  AComboboxAsync: {
    contract: {
      id: 'AComboboxAsync',
      title: 'Async Combobox',
      description: 'Combobox with deferred search loader and minimum character threshold.',
      category: 'form',
      valueShape: 'string | string[] | null',
      requiredOptions: ['minChars'],
      optionalOptions: [
        'loader',
        'searchMode',
        'placeholder',
        'helperText',
        'errorText',
        'multiple',
        'grouped',
        'highlightMatch',
        'clearable',
        'showIndicator',
        'emptyText',
        'disabled',
      ],
      supports: {
        staticOptions: true,
        asyncSearch: true,
        multiple: true,
      },
    },
    specSnippet: `component:
  name: AComboboxAsync
  options:
    minChars: 2
    searchMode: local
    loader:
      mode: remote
      endpoint: /api/lookup/countries
      queryParam: q
      debounceMs: 150
binding:
  kind: model
  action: user.profile.update
  payloadKey: country`,
    defaults: {
      minChars: 2,
      searchMode: 'local',
      loader: {
        mode: 'local',
        queryParam: 'q',
        debounceMs: 150,
      },
      multiple: false,
      grouped: false,
      highlightMatch: false,
      clearable: true,
      showIndicator: true,
      emptyText: 'No options found.',
      disabled: false,
    } satisfies AComboboxAsyncOptions,
    examples: [
      {
        id: 'local',
        label: 'Local async',
        description: 'Uses local options with async UX behavior.',
        options: {
          minChars: 1,
          searchMode: 'local',
        } satisfies AComboboxAsyncOptions,
      },
      {
        id: 'remote',
        label: 'Remote loader',
        description: 'Designed for remote API-powered search.',
        options: {
          minChars: 2,
          searchMode: 'remote',
          loader: {
            mode: 'remote',
            endpoint: '/api/lookup/countries',
            queryParam: 'q',
            debounceMs: 200,
          },
        } satisfies AComboboxAsyncOptions,
      },
    ],
  },
}

export const fieldComponentRegistry = contracts

export const fieldComponentIds = Object.keys(contracts) as FieldComponentId[]

export const getFieldComponentContract = (id: string) => {
  const resolved = contracts[id as FieldComponentId]
  return resolved ?? null
}
