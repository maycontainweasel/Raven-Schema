import { createError, defineEventHandler } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../../utils/model-manager'
import { readModelRecordBySlug } from '../../../../../utils/model-runtime-manager'

export default defineEventHandler(async (event) => {
  const modelParam = String(event.context.params?.model ?? '').trim()
  const ridParam = String(event.context.params?.rid ?? '').trim()
  if (!modelParam || !ridParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Model and record slug are required.',
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

  try {
    const recordState = await readModelRecordBySlug(event, model, ridParam)
    if (!recordState) {
      throw createError({
        statusCode: 404,
        statusMessage: `No record found for "${ridParam}".`,
      })
    }

    return {
      ok: true,
      model,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
      },
      slug: ridParam,
      record: recordState.record,
      identifiers: recordState.identifiers,
    }
  }
  catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `Failed to load record "${ridParam}".`,
    })
  }
})
