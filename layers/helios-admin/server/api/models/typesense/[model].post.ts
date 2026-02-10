import { createError, defineEventHandler, readBody } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
} from '../../../utils/model-manager'
import { readTypesenseStatus, runTypesenseAction } from '../../../utils/model-typesense-manager'

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
  const action = String(body?.action ?? '').trim()
  if (!action) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Action is required.',
    })
  }

  try {
    const payload = (body?.payload && typeof body.payload === 'object') ? body.payload : body
    const result = await runTypesenseAction(event, model.modelKey, action, payload || {})
    const status = await readTypesenseStatus(event, model.modelKey, {
      previewLimit: 10,
      previewStart: 0,
    })

    return {
      ok: true,
      model,
      action,
      result,
      status,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `Failed to run Typesense action "${action}".`,
    })
  }
})
