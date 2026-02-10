import { createError, defineEventHandler, readBody } from 'h3'
import { commitDirectoryLayout, findAdminBuilderModel, listAdminBuilderModels } from '../../../utils/admin-builder'

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

  const body = (await readBody(event)) as any
  const payload = body?.layout ?? body

  const result = await commitDirectoryLayout(model, payload)

  return {
    ok: true,
    model,
    layout: result.layout,
    committedAt: result.committedAt,
    files: result.files,
  }
})
