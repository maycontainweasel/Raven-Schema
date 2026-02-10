import { createError, defineEventHandler, readBody } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../utils/model-manager'
import { createModelDirectoryRecord } from '../../../../utils/model-runtime-manager'

const unique = <T>(value: T[]) => Array.from(new Set(value))

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

  const body = (await readBody(event)) as any
  const payload = (body?.payload && typeof body.payload === 'object')
    ? body.payload
    : ((body && typeof body === 'object') ? body : {})

  const specState = await readModelSpec(model)
  const modelRequired = (model.requiredFields || [])
    .map((field) => String(field || '').trim())
    .filter((field) => field.length > 0 && field.toLowerCase() !== 'id')
  const specRequired = (specState.spec.directory.createDialog.required || [])
    .map((field) => String(field || '').trim())
    .filter((field) => field.length > 0)
  const required = unique([...modelRequired, ...specRequired])
  const missing = required.filter((key) => {
    const value = payload?.[key]
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'string') return value.trim().length === 0
    return typeof value === 'undefined' || value === null
  })

  console.info(
    `[model-create:${model.modelKey}] request`,
    JSON.stringify({
      model: model.modelKey,
      table: model.table,
      payload,
      required,
      missing,
    }),
  )

  if (missing.length) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing required create fields: ${missing.join(', ')}`,
      data: {
        model: model.modelKey,
        table: model.table,
        payload,
        required,
        missing,
        modelRequired,
        specRequired,
      },
    })
  }

  try {
    const created = await createModelDirectoryRecord(
      event,
      model,
      specState.spec,
      payload || {},
    )

    return {
      ok: true,
      model,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
      },
      debug: {
        payload,
        required,
        modelRequired,
        specRequired,
      },
      ...created,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to create record.',
      data: {
        model: model.modelKey,
        table: model.table,
        payload,
        required,
        modelRequired,
        specRequired,
      },
    })
  }
})
