import { createError, defineEventHandler } from 'h3'
import { listAdminBuilderModels } from '../../utils/admin-builder'

export default defineEventHandler(async () => {
  try {
    const models = await listAdminBuilderModels()
    const eligible = models.filter((entry) => entry.canManage)

    return {
      ok: true,
      models,
      counts: {
        total: models.length,
        eligible: eligible.length,
      },
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to load admin builder models.',
    })
  }
})

