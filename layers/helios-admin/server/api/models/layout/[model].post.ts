import { createError, defineEventHandler, readBody } from 'h3'
import {
  commitModelSpec,
  findModelManagerModel,
  listModelManagerModels,
} from '../../../utils/model-manager'

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
  const payload = body?.spec ?? body

  const result = await commitModelSpec(model, payload)

  return {
    ok: true,
    model,
    spec: result.spec,
    committedAt: result.committedAt,
    files: result.files,
  }
})
