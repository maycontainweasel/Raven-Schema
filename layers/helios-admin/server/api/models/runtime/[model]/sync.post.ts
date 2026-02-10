import { createError, defineEventHandler, readBody } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../utils/model-manager'
import { syncModelDirectoryRecord } from '../../../../utils/model-runtime-manager'

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
  const body = (await readBody(event)) as any
  const record = (body?.record && typeof body.record === 'object')
    ? body.record
    : null
  const id = (typeof body?.id === 'string' || typeof body?.id === 'number')
    ? body.id
    : null

  try {
    const result = await syncModelDirectoryRecord(event, model, specState.spec, {
      record,
      id,
    })

    return {
      ok: true,
      model,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
        typesenseEnabled: specState.spec.directory.typesense.enabled,
      },
      ...result,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to sync model directory record.',
      data: {
        model: model.modelKey,
        table: model.table,
        id,
        hasRecord: Boolean(record),
      },
    })
  }
})
