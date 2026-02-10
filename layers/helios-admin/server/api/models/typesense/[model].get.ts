import { createError, defineEventHandler, getQuery } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
} from '../../../utils/model-manager'
import { readTypesenseStatus } from '../../../utils/model-typesense-manager'

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

  const query = getQuery(event)
  const previewLimit = Number(String(query.limit ?? '10'))
  const previewStart = Number(String(query.start ?? '0'))

  try {
    const status = await readTypesenseStatus(event, model.modelKey, {
      previewLimit: Number.isFinite(previewLimit) ? previewLimit : 10,
      previewStart: Number.isFinite(previewStart) ? previewStart : 0,
    })

    return {
      ok: true,
      model,
      status,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to read Typesense model status.',
    })
  }
})
