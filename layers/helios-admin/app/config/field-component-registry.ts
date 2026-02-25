import type {
  AComboboxAsyncOptions,
  AComboboxOptions,
  AInputOptions,
  FieldComponentContract,
  FieldComponentId,
  FieldComponentOptionDefinition,
} from '../types/field-contract'

type FieldComponentRegistryEntry = {
  contract: FieldComponentContract
  specSnippet: string
  examples: Array<{
    id: string
    label: string
    description: string
    options: Record<string, any>
  }>
}

const createContract = (
  value: Omit<FieldComponentContract, 'requiredOptions' | 'optionalOptions'>,
): FieldComponentContract => {
  const requiredOptions = value.options
    .filter(option => option.required)
    .map(option => option.key)
  const optionalOptions = value.options
    .filter(option => !option.required)
    .map(option => option.key)

  return {
    ...value,
    requiredOptions,
    optionalOptions,
  }
}

const baseTextOptions: FieldComponentOptionDefinition[] = [
  {
    key: 'placeholder',
    type: 'string',
    description: 'Placeholder text shown when value is empty.',
    defaultValue: '',
  },
  {
    key: 'helperText',
    type: 'string',
    description: 'Secondary hint text rendered under the field.',
    defaultValue: '',
  },
  {
    key: 'errorText',
    type: 'string',
    description: 'Validation message text shown in error states.',
    defaultValue: '',
  },
  {
    key: 'disabled',
    type: 'boolean',
    description: 'Disables input interactions when true.',
    defaultValue: false,
  },
]

const contracts: Record<FieldComponentId, FieldComponentRegistryEntry> = {
  AInput: {
    contract: createContract({
      id: 'AInput',
      title: 'Text Input',
      description: 'Single-line Ark input wrapper with Helios field chrome.',
      category: 'form',
      valueShape: 'string | number',
      options: [
        {
          key: 'type',
          type: 'string',
          description: 'Native input type.',
          values: ['text', 'email', 'password', 'number'],
          defaultValue: 'text',
        },
        ...baseTextOptions,
        {
          key: 'required',
          type: 'boolean',
          description: 'Marks field as required in UI state.',
          defaultValue: false,
        },
      ],
      supports: {
        multiple: false,
      },
    }),
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
    contract: createContract({
      id: 'ACombobox',
      title: 'Combobox',
      description: 'Searchable select with optional grouping/multi-select.',
      category: 'form',
      valueShape: 'string | string[] | null',
      options: [
        {
          key: 'options',
          type: 'array',
          required: true,
          description: 'List of options. Shape: [{ label, value, group?, disabled? }].',
          defaultValue: [],
        },
        ...baseTextOptions,
        {
          key: 'multiple',
          type: 'boolean',
          description: 'Enable multi-select mode.',
          defaultValue: false,
        },
        {
          key: 'grouped',
          type: 'boolean',
          description: 'Treat options as grouped by `group` key.',
          defaultValue: false,
        },
        {
          key: 'highlightMatch',
          type: 'boolean',
          description: 'Highlights query matches in option labels.',
          defaultValue: false,
        },
        {
          key: 'clearable',
          type: 'boolean',
          description: 'Shows clear/reset action.',
          defaultValue: true,
        },
        {
          key: 'showIndicator',
          type: 'boolean',
          description: 'Shows dropdown indicator icon.',
          defaultValue: true,
        },
        {
          key: 'emptyText',
          type: 'string',
          description: 'Text shown when no options match the query.',
          defaultValue: 'No options found.',
        },
      ],
      supports: {
        staticOptions: true,
        multiple: true,
      },
    }),
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
    contract: createContract({
      id: 'AComboboxAsync',
      title: 'Async Combobox',
      description: 'Combobox with deferred search loader and minimum character threshold.',
      category: 'form',
      valueShape: 'string | string[] | null',
      options: [
        {
          key: 'minChars',
          type: 'number',
          required: true,
          description: 'Minimum typed characters before search runs.',
          defaultValue: 2,
        },
        {
          key: 'searchMode',
          type: 'string',
          description: 'Controls async source strategy.',
          values: ['local', 'remote'],
          defaultValue: 'local',
        },
        {
          key: 'loader',
          type: 'object',
          description: 'Optional loader config: { mode, endpoint, queryParam, debounceMs }.',
          defaultValue: {
            mode: 'local',
            queryParam: 'q',
            debounceMs: 150,
          },
        },
        {
          key: 'options',
          type: 'array',
          description: 'Optional local fallback options.',
          defaultValue: [],
        },
        ...baseTextOptions,
        {
          key: 'multiple',
          type: 'boolean',
          description: 'Enable multi-select mode.',
          defaultValue: false,
        },
        {
          key: 'grouped',
          type: 'boolean',
          description: 'Treat options as grouped by `group` key.',
          defaultValue: false,
        },
        {
          key: 'highlightMatch',
          type: 'boolean',
          description: 'Highlights query matches in option labels.',
          defaultValue: false,
        },
        {
          key: 'clearable',
          type: 'boolean',
          description: 'Shows clear/reset action.',
          defaultValue: true,
        },
        {
          key: 'showIndicator',
          type: 'boolean',
          description: 'Shows dropdown indicator icon.',
          defaultValue: true,
        },
        {
          key: 'emptyText',
          type: 'string',
          description: 'Text shown when no options match the query.',
          defaultValue: 'No options found.',
        },
      ],
      supports: {
        staticOptions: true,
        asyncSearch: true,
        multiple: true,
      },
    }),
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
