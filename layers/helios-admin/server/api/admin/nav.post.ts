import { createError, defineEventHandler, readBody } from 'h3'
import { commitAdminNavConfig } from '../../utils/admin-nav-manager'

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as any
    const payload = body?.config ?? body
    const result = await commitAdminNavConfig(payload)

    return {
      ok: true,
      config: result.config,
      committedAt: result.committedAt,
      files: result.files,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to save admin nav config.',
    })
  }
})

