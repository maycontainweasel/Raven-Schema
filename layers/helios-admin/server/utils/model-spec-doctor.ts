import {
  listModelManagerModels,
  readModelSpec,
  type ModelSpecAssetsDiagnostics,
} from './model-manager'

export type ModelSpecDoctorModelReport = {
  modelKey: string
  table: string
  route: string
  source: 'fragment' | 'default' | 'unknown'
  diagnostics?: ModelSpecAssetsDiagnostics
  errors: string[]
  warnings: string[]
}

export type ModelSpecDoctorReport = {
  ok: boolean
  cwd: string
  auditedAt: string
  counts: {
    totalModels: number
    auditableModels: number
    erroredModels: number
    warnedModels: number
    errors: number
    warnings: number
  }
  models: ModelSpecDoctorModelReport[]
}

const normalizeRoutePath = (value: unknown, fallback: string) => {
  const raw = String(value ?? '').trim()
  const seeded = raw.length ? raw : fallback
  const prefixed = seeded.startsWith('/') ? seeded : `/${seeded}`
  return prefixed
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '') || fallback
}

const normalizeAction = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

const validateCreateAction = (value: unknown, modelKey: string) => {
  const action = String(value ?? '').trim()
  if (!action.length) {
    return `Create action is missing (expected "${modelKey}.create").`
  }

  const segments = action
    .split('.')
    .map(entry => entry.trim())
    .filter(Boolean)

  if (segments.length < 2) {
    return `Create action "${action}" is invalid. Use dotted form "<model>.<procedure>".`
  }

  const targetModel = normalizeAction(segments[0])
  if (targetModel !== normalizeAction(modelKey)) {
    return `Create action "${action}" targets "${targetModel}" but expected "${modelKey}".`
  }

  return null
}

export const runModelSpecDoctor = async (
  cwd = process.cwd(),
): Promise<ModelSpecDoctorReport> => {
  const models = await listModelManagerModels(cwd)
  const auditable = models.filter(model => model.canManage)
  const reports: ModelSpecDoctorModelReport[] = []
  const routeOwners = new Map<string, string[]>()

  for (const model of auditable) {
    const fallbackRoute = normalizeRoutePath(model.directoryRoute || `/admin/${model.table}`, `/admin/${model.table}`)
    const report: ModelSpecDoctorModelReport = {
      modelKey: model.modelKey,
      table: model.table,
      route: fallbackRoute,
      source: 'unknown',
      errors: [],
      warnings: [],
    }

    try {
      const state = await readModelSpec(model, cwd, { strictFragment: false })
      report.source = state.source
      report.route = normalizeRoutePath(state.spec.directory.route, fallbackRoute)
      report.diagnostics = state.diagnostics

      if (Array.isArray(state.diagnostics.errors) && state.diagnostics.errors.length) {
        report.errors.push(...state.diagnostics.errors)
      }

      if (Array.isArray(state.diagnostics.warnings) && state.diagnostics.warnings.length) {
        report.warnings.push(...state.diagnostics.warnings)
      }

      const createActionIssue = validateCreateAction(
        state.spec.directory?.createDialog?.action,
        model.modelKey,
      )
      if (createActionIssue) report.warnings.push(createActionIssue)

      const listingActions = (state.spec.directory as any)?.listing?.actions
      if (!listingActions || typeof listingActions !== 'object') {
        report.warnings.push('Directory listing actions are missing. Expected listing.actions.manage/delete booleans.')
      }
    }
    catch (error: any) {
      report.errors.push(error?.message ?? String(error))
    }

    if (!routeOwners.has(report.route)) routeOwners.set(report.route, [])
    routeOwners.get(report.route)!.push(model.modelKey)
    reports.push(report)
  }

  for (const modelReport of reports) {
    const owners = routeOwners.get(modelReport.route) ?? []
    if (owners.length <= 1) continue
    modelReport.errors.push(
      `Directory route collision "${modelReport.route}" shared by models: ${owners.join(', ')}`,
    )
  }

  const errorCount = reports.reduce((total, entry) => total + entry.errors.length, 0)
  const warningCount = reports.reduce((total, entry) => total + entry.warnings.length, 0)
  const erroredModels = reports.filter(entry => entry.errors.length > 0).length
  const warnedModels = reports.filter(entry => entry.errors.length === 0 && entry.warnings.length > 0).length

  return {
    ok: errorCount === 0,
    cwd,
    auditedAt: new Date().toISOString(),
    counts: {
      totalModels: models.length,
      auditableModels: auditable.length,
      erroredModels,
      warnedModels,
      errors: errorCount,
      warnings: warningCount,
    },
    models: reports,
  }
}
