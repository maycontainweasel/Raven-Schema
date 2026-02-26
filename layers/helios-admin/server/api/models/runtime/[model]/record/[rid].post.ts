import { createError, defineEventHandler, readBody } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../../utils/model-manager'
import { updateModelRecordBySlug } from '../../../../../utils/model-runtime-manager'

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

  const body = (await readBody(event)) as any
  const payload = (body?.payload && typeof body.payload === 'object')
    ? body.payload
    : ((body && typeof body === 'object') ? body : {})
  const id = body?.id
  const specState = await readModelSpec(model)

  try {
    const updated = await updateModelRecordBySlug(
      event,
      model,
      ridParam,
      payload || {},
      id,
      specState.spec,
    )
    return {
      ok: true,
      model,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
      },
      slug: ridParam,
      ...updated,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `Failed to update record "${ridParam}".`,
    })
  }
})
