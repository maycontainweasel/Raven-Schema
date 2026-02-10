import { createError, defineEventHandler } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
  resolveModelManagerPaths,
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

  const state = await readModelSpec(model)
  const paths = resolveModelManagerPaths()

  return {
    ok: true,
    model,
    source: state.source,
    spec: state.spec,
    files: {
      fragment: paths.fragmentFile(model.modelKey),
      generated: paths.generatedFile(model.modelKey),
    },
  }
})
