import { createError, defineEventHandler } from 'h3'
import { readAdminNavConfig } from '../../utils/admin-nav-manager'

export default defineEventHandler(async () => {
  try {
    const state = await readAdminNavConfig()
    return {
      ok: true,
      source: state.source,
      config: state.config,
      files: state.files,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to load admin nav config.',
    })
  }
})

