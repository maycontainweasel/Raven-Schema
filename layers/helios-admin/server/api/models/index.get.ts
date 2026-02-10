import { createError, defineEventHandler } from 'h3'
import { listModelManagerModels } from '../../utils/model-manager'

export default defineEventHandler(async () => {
  try {
    const models = await listModelManagerModels()
    const eligible = models.filter((entry) => entry.canManage)
    const configured = models.filter((entry) => entry.hasFragment)

    return {
      ok: true,
      models,
      counts: {
        total: models.length,
        eligible: eligible.length,
        configured: configured.length,
      },
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to load models.',
    })
  }
})

