import { runModelSpecDoctor } from '../utils/model-spec-doctor'

const parseBool = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  const token = String(value ?? '').trim().toLowerCase()
  if (!token.length) return fallback
  if (['1', 'true', 'yes', 'y', 'on'].includes(token)) return true
  if (['0', 'false', 'no', 'n', 'off'].includes(token)) return false
  return fallback
}

const formatIssuePreview = (issues: string[], max = 2) => {
  if (!issues.length) return ''
  if (issues.length <= max) return issues.join(' | ')
  return `${issues.slice(0, max).join(' | ')} | +${issues.length - max} more`
}

export default defineNitroPlugin(async () => {
  const g = globalThis as Record<string, any>
  if (g.__heliosModelSpecDoctorRan) return
  g.__heliosModelSpecDoctorRan = true

  const enabled = parseBool(
    process.env.HELIOS_MODEL_SPEC_AUDIT_ON_START
      ?? process.env.HELIOS_MODEL_SPEC_DOCTOR_ON_START,
    process.env.NODE_ENV !== 'production',
  )
  if (!enabled) return

  const failOnError = parseBool(process.env.HELIOS_MODEL_SPEC_AUDIT_FAIL_ON_ERROR, false)
  const verbose = parseBool(process.env.HELIOS_MODEL_SPEC_AUDIT_VERBOSE, true)

  try {
    const report = await runModelSpecDoctor(process.cwd())
    const prefix = '[helios-admin:model-spec-doctor]'
    const summary = `audited=${report.counts.auditableModels}/${report.counts.totalModels} errors=${report.counts.errors} warnings=${report.counts.warnings}`

    if (report.counts.errors > 0) {
      console.error(`${prefix} ${summary}`)
    } else if (report.counts.warnings > 0) {
      console.warn(`${prefix} ${summary}`)
    } else {
      console.log(`${prefix} ${summary}`)
    }

    if (verbose) {
      const problematic = report.models.filter(model => model.errors.length > 0 || model.warnings.length > 0)
      for (const model of problematic) {
        const errorPreview = formatIssuePreview(model.errors)
        const warningPreview = formatIssuePreview(model.warnings)
        const parts = [`model=${model.modelKey}`, `route=${model.route}`]
        if (errorPreview) parts.push(`errors: ${errorPreview}`)
        if (warningPreview) parts.push(`warnings: ${warningPreview}`)
        const line = parts.join(' | ')
        if (model.errors.length > 0) console.error(`${prefix} ${line}`)
        else console.warn(`${prefix} ${line}`)
      }
    }

    if (failOnError && report.counts.errors > 0) {
      throw new Error(`Model spec audit failed with ${report.counts.errors} error(s).`)
    }
  }
  catch (error: any) {
    const message = error?.message ?? String(error)
    if (failOnError) {
      throw new Error(`[helios-admin:model-spec-doctor] ${message}`)
    }
    console.error('[helios-admin:model-spec-doctor] failed', message)
  }
})
