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

  try {
    const result = await commitModelSpec(model, payload)

    return {
      ok: true,
      model,
      spec: result.spec,
      diagnostics: result.diagnostics,
      committedAt: result.committedAt,
      files: result.files,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? `Failed to commit model layout for "${model.modelKey}".`,
    })
  }
})
