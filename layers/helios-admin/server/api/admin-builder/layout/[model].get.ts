import { createError, defineEventHandler } from 'h3'
import { findAdminBuilderModel, listAdminBuilderModels, readDirectoryLayout, resolveAdminBuilderPaths } from '../../../utils/admin-builder'

export default defineEventHandler(async (event) => {
  const modelParam = String(event.context.params?.model ?? '').trim()
  if (!modelParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Model is required.',
    })
  }

  const models = await listAdminBuilderModels()
  const model = findAdminBuilderModel(models, modelParam)

  if (!model) {
    throw createError({
      statusCode: 404,
      statusMessage: `Unknown model "${modelParam}".`,
    })
  }

  const state = await readDirectoryLayout(model)
  const paths = resolveAdminBuilderPaths()

  return {
    ok: true,
    model,
    source: state.source,
    layout: state.layout,
    files: {
      fragment: paths.fragmentFile(model.modelKey),
      generated: paths.generatedFile(model.modelKey),
    },
  }
})

