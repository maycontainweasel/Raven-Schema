import { createError, defineEventHandler, readBody } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
} from '../../../../utils/model-manager'
import { scaffoldWidgetOverride } from '../../../../utils/model-override-manager'

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

  const body = (await readBody(event).catch(() => null)) as any
  const widgetId = String(body?.widgetId ?? body?.id ?? '').trim()
  const force = Boolean(body?.force)
  if (!widgetId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'widgetId is required.',
    })
  }

  try {
    const result = await scaffoldWidgetOverride(model.modelKey, widgetId, { force })
    return {
      ok: true,
      model,
      override: result,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to scaffold widget override.',
    })
  }
})
