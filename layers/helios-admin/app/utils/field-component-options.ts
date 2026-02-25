import { getFieldComponentContract } from '../config/field-component-registry'
import type { FieldComponentContract, FieldComponentOptionDefinition, FieldComponentOptionType } from '../types/field-contract'

export type FieldComponentOptionIssueKind =
  | 'missing-required'
  | 'unknown-option'
  | 'invalid-type'
  | 'invalid-enum'

export type FieldComponentOptionIssue = {
  kind: FieldComponentOptionIssueKind
  key: string
  message: string
  expected?: string
  received?: string
}

export type ResolveFieldComponentOptionsResult = {
  componentName: string
  known: boolean
  contract: FieldComponentContract | null
  providedOptions: Record<string, unknown>
  resolvedOptions: Record<string, unknown>
  issues: FieldComponentOptionIssue[]
  requiredMissing: string[]
  unknownKeys: string[]
}

type ResolveFieldComponentOptionsInput = {
  applyDefaults?: boolean
  requireExplicitRequired?: boolean
  allowUnknown?: boolean
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null
}

const cloneDefaultValue = <T>(value: T): T => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value)
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    return JSON.parse(JSON.stringify(value)) as T
  }
  return value
}

const optionTypeOf = (value: unknown): FieldComponentOptionType | 'null' => {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number' && Number.isFinite(value)) return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'null'
}

const matchesOptionType = (value: unknown, type: FieldComponentOptionType) => {
  if (type === 'object') return isPlainObject(value)
  return optionTypeOf(value) === type
}

const hasRequiredValue = (value: unknown) => {
  if (typeof value === 'undefined' || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (isPlainObject(value)) return Object.keys(value).length > 0
  return true
}

const expectedTypeText = (definition: FieldComponentOptionDefinition) => {
  const enumText = Array.isArray(definition.values) && definition.values.length
    ? ` (${definition.values.join(' | ')})`
    : ''
  return `${definition.type}${enumText}`
}

export const resolveFieldComponentOptions = (
  componentNameRaw: string,
  rawOptions: unknown,
  input: ResolveFieldComponentOptionsInput = {},
): ResolveFieldComponentOptionsResult => {
  const componentName = String(componentNameRaw || '').trim()
  const contractEntry = getFieldComponentContract(componentName)
  const providedOptions = isPlainObject(rawOptions) ? rawOptions : {}
  const resolvedOptions: Record<string, unknown> = {}
  const issues: FieldComponentOptionIssue[] = []

  if (!contractEntry) {
    return {
      componentName,
      known: false,
      contract: null,
      providedOptions,
      resolvedOptions: input.applyDefaults ? { ...providedOptions } : {},
      issues: [
        {
          kind: 'unknown-option',
          key: 'component',
          message: `Component "${componentName}" is not registered.`,
        },
      ],
      requiredMissing: [],
      unknownKeys: Object.keys(providedOptions),
    }
  }

  const contract = contractEntry.contract
  const definitions = contract.options
  const definitionByKey = new Map(definitions.map(definition => [definition.key, definition]))

  if (input.applyDefaults) {
    for (const definition of definitions) {
      if (typeof definition.defaultValue === 'undefined') continue
      resolvedOptions[definition.key] = cloneDefaultValue(definition.defaultValue)
    }
  }

  for (const [key, value] of Object.entries(providedOptions)) {
    if (!definitionByKey.has(key)) continue
    resolvedOptions[key] = value
  }

  const requiredMissing: string[] = []
  for (const definition of definitions) {
    const providedHasKey = Object.prototype.hasOwnProperty.call(providedOptions, definition.key)
    const resolvedValue = resolvedOptions[definition.key]
    const providedValue = providedOptions[definition.key]

    if (providedHasKey) {
      if (!matchesOptionType(providedValue, definition.type)) {
        issues.push({
          kind: 'invalid-type',
          key: definition.key,
          message: `Option "${definition.key}" must be ${expectedTypeText(definition)}.`,
          expected: expectedTypeText(definition),
          received: optionTypeOf(providedValue),
        })
      }
      if (definition.values?.length && !definition.values.includes(String(providedValue))) {
        issues.push({
          kind: 'invalid-enum',
          key: definition.key,
          message: `Option "${definition.key}" must be one of: ${definition.values.join(', ')}.`,
          expected: definition.values.join(', '),
          received: String(providedValue),
        })
      }
    }

    if (!definition.required) continue
    const targetValue = input.requireExplicitRequired ? providedValue : resolvedValue
    const present = input.requireExplicitRequired
      ? providedHasKey && hasRequiredValue(targetValue)
      : hasRequiredValue(targetValue)
    if (!present) {
      requiredMissing.push(definition.key)
      issues.push({
        kind: 'missing-required',
        key: definition.key,
        message: `Missing required option "${definition.key}".`,
      })
    }
  }

  const unknownKeys = Object.keys(providedOptions).filter(key => !definitionByKey.has(key))
  if (!input.allowUnknown) {
    for (const key of unknownKeys) {
      issues.push({
        kind: 'unknown-option',
        key,
        message: `Option "${key}" is not defined on component contract "${contract.id}".`,
      })
    }
  }

  return {
    componentName,
    known: true,
    contract,
    providedOptions,
    resolvedOptions,
    issues,
    requiredMissing,
    unknownKeys,
  }
}
