import { createError, defineEventHandler } from 'h3'
import { readTypesenseServiceHealth } from '../../utils/typesense-service'

export default defineEventHandler(async () => {
  try {
    return await readTypesenseServiceHealth()
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to resolve TypeSense service status.',
    })
  }
})
