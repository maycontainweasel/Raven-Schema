import { createError, defineEventHandler } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../utils/model-manager'
import { createModelDirectoryRecord } from '../../../../utils/model-runtime-manager'

const unique = <T>(value: T[]) => Array.from(new Set(value))

const resolveFieldKey = (field: Record<string, any>) =>
  String(field?.modelKey || field?.field || field?.id || '').trim()

const isNumericField = (key: string, field: Record<string, any> | undefined) => {
  if (String(field?.component?.options?.type || '').trim().toLowerCase() === 'number') {
    return true
  }
  const normalized = key.toLowerCase()
  return /price|amount|count|qty|quantity|rank|order|weight|score|level/.test(normalized)
}

const buildSmokeValue = (
  key: string,
  field: Record<string, any> | undefined,
  token: string,
) => {
  const options = (field?.component?.options && typeof field.component.options === 'object')
    ? field.component.options as Record<string, any>
    : {}
  if (typeof options.defaultValue !== 'undefined') return options.defaultValue

  const component = String(field?.component?.name || '').trim().toLowerCase()
  const normalized = key.toLowerCase()

  if (component.includes('color') || normalized.includes('color')) return '#000000'
  if (component.includes('combobox') && normalized.includes('status')) return 'draft'
  if (isNumericField(key, field)) return 0

  if (normalized.endsWith('id') || normalized === 'key' || normalized === 'slug') {
    return `${normalized.replace(/[^a-z0-9]+/gi, '-')}-${token}`
  }

  return `Smoke ${token}`
}

export default defineEventHandler(async (event) => {
  const modelParam = String(event.context.params?.model ?? '').trim()
  if (!modelParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Model is required.',
    })
  }

  const models = await listModelManagerModels()
  const model = findModelManagerModel(models, modelParam)
  if (!model) {
    throw createError({
      statusCode: 404,
      statusMessage: `Unknown model "${modelParam}".`,
    })
  }

  const specState = await readModelSpec(model)
  const createFields = Array.isArray(specState.spec.directory.createDialog.fields)
    ? specState.spec.directory.createDialog.fields
    : []
  const byKey = createFields.reduce<Record<string, Record<string, any>>>((acc, field) => {
    const key = resolveFieldKey(field as Record<string, any>).toLowerCase()
    if (key) acc[key] = field as Record<string, any>
    return acc
  }, {})

  const modelRequired = (model.requiredFields || [])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0 && entry.toLowerCase() !== 'id')
  const specRequired = (specState.spec.directory.createDialog.required || [])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)
  const required = unique([...modelRequired, ...specRequired])
  const token = `${Date.now()}`

  const payload = required.reduce<Record<string, any>>((acc, key) => {
    const lookup = byKey[key.toLowerCase()]
    acc[key] = buildSmokeValue(key, lookup, token)
    return acc
  }, {})

  try {
    const created = await createModelDirectoryRecord(event, model, specState.spec, payload)
    return {
      ok: true,
      model,
      payload,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
        typesenseEnabled: specState.spec.directory.typesense.enabled,
      },
      ...created,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Smoke create failed.',
      data: {
        model: model.modelKey,
        table: model.table,
        payload,
        required,
      },
    })
  }
})
