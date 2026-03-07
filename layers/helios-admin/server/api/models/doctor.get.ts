import { createError, defineEventHandler, getQuery } from 'h3'
import { runModelSpecDoctor } from '../../utils/model-spec-doctor'

const parseBool = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  const token = String(value ?? '').trim().toLowerCase()
  if (!token.length) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(token)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(token)) return false
  return fallback
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const strict = parseBool(query.strict, false)
  const includeHealthy = parseBool(query.includeHealthy, true)

  try {
    const report = await runModelSpecDoctor()
    const models = includeHealthy
      ? report.models
      : report.models.filter(model => model.errors.length > 0 || model.warnings.length > 0)

    if (strict && report.counts.errors > 0) {
      throw createError({
        statusCode: 500,
        statusMessage: `Model spec doctor found ${report.counts.errors} error(s).`,
        data: {
          ok: report.ok,
          counts: report.counts,
          models,
        },
      })
    }

    return {
      ok: report.ok,
      cwd: report.cwd,
      auditedAt: report.auditedAt,
      counts: report.counts,
      models,
    }
  }
  catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to run model spec doctor.',
    })
  }
})
