import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { createError, defineEventHandler } from 'h3'
import { collections } from '@schema/typesense/collections'
import { createContext } from '@schema/server/trpc/context'
import { appRouter } from '~~/server/trpc/routers/_app'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
  resolveModelManagerPaths,
  type ModelLayoutSpec,
  type ModelManagerModel,
  type ModelUIFieldBinding,
  type ModelUIFieldSpec,
  type ModelUIWidgetSpec,
} from '../../../../utils/model-manager'

type AuditStatus = 'pass' | 'fail' | 'warn'

type AuditCheck = {
  id: string
  status: AuditStatus
  message: string
  detail?: string
  meta?: Record<string, any>
}

type AuditGate = {
  id: string
  label: string
  status: AuditStatus
  checks: AuditCheck[]
}

type FieldRef = {
  scope: 'create' | 'single'
  location: string
  field: ModelUIFieldSpec
}

type TypesenseFieldMeta = {
  name: string
  sortable: boolean
  faceted: boolean
}

type ResolvedTypesenseCollection = {
  key: string
  schema: Record<string, any>
  fields: TypesenseFieldMeta[]
  fieldLookup: Map<string, TypesenseFieldMeta>
}

type ModelCaller = Record<string, any>

const unique = <T>(value: T[]) => Array.from(new Set(value))

const normalizeToken = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const collectTypesenseFieldMeta = (schema: Record<string, any> | null): TypesenseFieldMeta[] => {
  const fieldsRaw = Array.isArray(schema?.fields) ? schema.fields : []
  return fieldsRaw
    .map((entry: any) => {
      const name = String(entry?.name ?? '').trim()
      if (!name) return null
      return {
        name,
        sortable: Boolean(entry?.sort),
        faceted: Boolean(entry?.facet),
      } satisfies TypesenseFieldMeta
    })
    .filter(Boolean) as TypesenseFieldMeta[]
}

const createTypesenseFieldLookup = (fields: TypesenseFieldMeta[]) => {
  const lookup = new Map<string, TypesenseFieldMeta>()
  for (const field of fields) {
    const token = normalizeToken(field.name)
    if (!token || lookup.has(token)) continue
    lookup.set(token, field)
  }
  return lookup
}

const resolveTypesenseCollection = (candidates: unknown[]): ResolvedTypesenseCollection | null => {
  const bundle = collections as Record<string, any>
  const candidateList = unique(
    candidates
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry.length > 0),
  )
  if (!candidateList.length) return null

  for (const key of candidateList) {
    const schema = bundle[key]
    if (!schema) continue
    const fields = collectTypesenseFieldMeta(schema)
    return {
      key,
      schema,
      fields,
      fieldLookup: createTypesenseFieldLookup(fields),
    }
  }

  const normalizedToKey = new Map<string, string>()
  for (const key of Object.keys(bundle || {})) {
    const normalized = normalizeToken(key)
    if (normalized && !normalizedToKey.has(normalized)) normalizedToKey.set(normalized, key)
  }

  for (const key of candidateList) {
    const resolvedKey = normalizedToKey.get(normalizeToken(key))
    if (!resolvedKey) continue
    const schema = bundle[resolvedKey]
    if (!schema) continue
    const fields = collectTypesenseFieldMeta(schema)
    return {
      key: resolvedKey,
      schema,
      fields,
      fieldLookup: createTypesenseFieldLookup(fields),
    }
  }

  return null
}

const resolveCanonicalTypesenseField = (
  value: unknown,
  lookup: Map<string, TypesenseFieldMeta>,
): TypesenseFieldMeta | null => {
  const raw = String(value ?? '').trim()
  if (!raw.length) return null
  return lookup.get(normalizeToken(raw)) ?? null
}

const toCamelCase = (value: unknown) => {
  const source = String(value ?? '').trim()
  if (!source.length) return ''
  return source
    .replace(/[_\-\s]+([A-Za-z0-9])/g, (_, token: string) => token.toUpperCase())
    .replace(/^[A-Z]/, token => token.toLowerCase())
}

const resolveFieldKey = (field: Pick<ModelUIFieldSpec, 'modelKey' | 'field' | 'id'>) =>
  String(field.modelKey || field.field || field.id || '').trim()

const newGate = (id: string, label: string): AuditGate => ({
  id,
  label,
  status: 'pass',
  checks: [],
})

const pushCheck = (
  gate: AuditGate,
  id: string,
  status: AuditStatus,
  message: string,
  detail?: string,
  meta?: Record<string, any>,
) => {
  gate.checks.push({ id, status, message, detail, meta })
}

const finalizeGate = (gate: AuditGate): AuditGate => {
  if (gate.checks.some(check => check.status === 'fail')) {
    gate.status = 'fail'
    return gate
  }
  if (gate.checks.some(check => check.status === 'warn')) {
    gate.status = 'warn'
    return gate
  }
  gate.status = 'pass'
  return gate
}

const toActionPath = (actionRaw: unknown, modelKey: string) => {
  const action = String(actionRaw ?? '').trim()
  if (!action.length) {
    return {
      ok: false,
      action,
      reason: 'Action is empty.',
    } as const
  }

  const segments = action
    .split('.')
    .map(entry => entry.trim())
    .filter(Boolean)

  if (segments.length < 2) {
    return {
      ok: false,
      action,
      reason: `Action "${action}" must use dotted form "<model>.<procedure>".`,
    } as const
  }

  const targetModel = segments[0]!.toLowerCase()
  if (targetModel !== modelKey.toLowerCase()) {
    return {
      ok: false,
      action,
      reason: `Action "${action}" targets "${targetModel}" but expected "${modelKey}".`,
    } as const
  }

  return {
    ok: true,
    action,
    path: segments.slice(1),
  } as const
}

const hasCallablePath = (root: Record<string, any> | null, path: string[]) => {
  if (!root || !path.length) return false
  let cursor: any = root
  for (const segment of path) {
    cursor = cursor?.[segment]
    if (typeof cursor === 'undefined' || cursor === null) return false
  }
  return typeof cursor === 'function'
}

const actionPathText = (path: string[]) => path.join('.')

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

const readTextFile = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  }
  catch {
    return null
  }
}

const routeToSegments = (routePath: string) => {
  const normalized = String(routePath || '')
    .trim()
    .split('?')[0]!
    .split('#')[0]!
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '')
  if (!normalized.length) return []
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`
  if (withSlash === '/') return []
  return withSlash
    .slice(1)
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)
}

const collectFieldRefs = (spec: ModelLayoutSpec): FieldRef[] => {
  const refs: FieldRef[] = []

  for (const field of spec.directory.createDialog.fields || []) {
    refs.push({
      scope: 'create',
      location: `directory.createDialog.fields.${field.id}`,
      field,
    })
  }

  for (const tab of spec.single.tabs || []) {
    for (const row of tab.primary || []) {
      for (const column of row.columns || []) {
        for (const widget of column.primary || []) {
          for (const field of widget.fields || []) {
            refs.push({
              scope: 'single',
              location: `single.tabs.${tab.slug}.rows.${row.id}.columns.${column.id}.widgets.${widget.id}.fields.${field.id}`,
              field,
            })
          }
        }
      }
    }
  }

  return refs
}

const resolveModelCallerCandidates = (model: ModelManagerModel) =>
  unique([
    model.routerKey,
    model.modelKey,
    model.table,
    toCamelCase(model.routerKey),
    toCamelCase(model.modelKey),
    toCamelCase(model.table),
  ]
    .map(value => String(value ?? '').trim())
    .filter(value => value.length > 0))

const resolveModelCaller = async (
  event: Parameters<typeof createContext>[0],
  model: ModelManagerModel,
) => {
  const context = await createContext(event)
  const caller = appRouter.createCaller(context as any) as Record<string, any>
  const candidateKeys = resolveModelCallerCandidates(model)

  for (const key of candidateKeys) {
    const modelCaller = caller?.[key]
    if (modelCaller) {
      return {
        ok: true as const,
        key,
        caller: modelCaller as ModelCaller,
      }
    }
  }

  const availableKeys = Object.keys(caller || {})
  const normalizedToKey = new Map<string, string>()
  for (const key of availableKeys) {
    const normalized = normalizeToken(key)
    if (normalized && !normalizedToKey.has(normalized)) normalizedToKey.set(normalized, key)
  }

  for (const candidate of candidateKeys) {
    const normalized = normalizeToken(candidate)
    const resolvedKey = normalizedToKey.get(normalized)
    if (!resolvedKey) continue
    const modelCaller = caller?.[resolvedKey]
    if (!modelCaller) continue
    return {
      ok: true as const,
      key: resolvedKey,
      caller: modelCaller as ModelCaller,
    }
  }

  return {
    ok: false as const,
    reason: `No generated model router found. Tried keys: ${candidateKeys.join(', ')}`,
    candidates: candidateKeys,
    availableKeys,
  }
}

const validateActionContract = (
  gate: AuditGate,
  checkId: string,
  label: string,
  action: unknown,
  model: ModelManagerModel,
  modelCaller: ModelCaller | null,
) => {
  const parsed = toActionPath(action, model.modelKey)
  if (!parsed.ok) {
    pushCheck(gate, checkId, 'fail', `${label} action is invalid.`, parsed.reason, { action })
    return
  }

  if (!modelCaller) {
    pushCheck(
      gate,
      checkId,
      'warn',
      `${label} action format is valid but model router was not resolved.`,
      undefined,
      { action: parsed.action, path: parsed.path },
    )
    return
  }

  const callable = hasCallablePath(modelCaller, parsed.path)
  pushCheck(
    gate,
    checkId,
    callable ? 'pass' : 'fail',
    callable
      ? `${label} action resolves to callable router procedure.`
      : `${label} action does not resolve on model router.`,
    callable ? undefined : `Missing path "${actionPathText(parsed.path)}" on model caller.`,
    { action: parsed.action, path: parsed.path },
  )
}

const validateBindingContract = (
  gate: AuditGate,
  ref: FieldRef,
  model: ModelManagerModel,
  modelCaller: ModelCaller | null,
) => {
  const fieldKey = resolveFieldKey(ref.field)
  const binding = ref.field.binding as ModelUIFieldBinding | undefined
  const prefix = `${ref.location} (${fieldKey || ref.field.id})`

  if (!fieldKey.length) {
    pushCheck(gate, `${ref.location}.key`, 'fail', `${prefix}: field key is empty.`)
  }
  else {
    pushCheck(gate, `${ref.location}.key`, 'pass', `${prefix}: field key resolved.`)
  }

  if (!binding || typeof binding !== 'object') {
    pushCheck(gate, `${ref.location}.binding`, 'fail', `${prefix}: field binding is missing.`)
    return
  }

  if (binding.kind === 'model') {
    if (!String(binding.payloadKey || '').trim()) {
      pushCheck(gate, `${ref.location}.payloadKey`, 'fail', `${prefix}: model binding payloadKey is required.`)
    }
    else {
      pushCheck(gate, `${ref.location}.payloadKey`, 'pass', `${prefix}: model binding payloadKey set.`)
    }

    validateActionContract(
      gate,
      `${ref.location}.action`,
      `${prefix}: model`,
      binding.action,
      model,
      modelCaller,
    )
    return
  }

  if (binding.kind === 'subtable') {
    const subtableKey = String(binding.subtableKey || '').trim()
    const subtableKeys = new Set((model.subtableKeys || []).map(key => String(key || '').trim()))
    const subtableExists = subtableKey.length > 0 && subtableKeys.has(subtableKey)

    pushCheck(
      gate,
      `${ref.location}.subtableKey`,
      subtableExists ? 'pass' : 'fail',
      subtableExists
        ? `${prefix}: subtableKey "${subtableKey}" exists in model metadata.`
        : `${prefix}: subtableKey "${subtableKey}" is not registered on model.`,
      subtableExists ? undefined : `Available subtables: ${(model.subtableKeys || []).join(', ') || '(none)'}`,
    )

    if (!String(binding.payloadKey || '').trim()) {
      pushCheck(gate, `${ref.location}.payloadKey`, 'fail', `${prefix}: subtable binding payloadKey is required.`)
    }
    else {
      pushCheck(gate, `${ref.location}.payloadKey`, 'pass', `${prefix}: subtable binding payloadKey set.`)
    }

    validateActionContract(
      gate,
      `${ref.location}.action`,
      `${prefix}: subtable`,
      binding.action,
      model,
      modelCaller,
    )
    return
  }

  if (binding.kind === 'taxonomy') {
    const taxonomyKey = String(binding.taxonomyKey || '').trim()
    const taxonomyKeys = new Set((model.taxonomyKeys || []).map(key => String(key || '').trim()))
    const taxonomyExists = taxonomyKey.length > 0 && taxonomyKeys.has(taxonomyKey)

    pushCheck(
      gate,
      `${ref.location}.taxonomyKey`,
      taxonomyExists ? 'pass' : 'fail',
      taxonomyExists
        ? `${prefix}: taxonomyKey "${taxonomyKey}" exists in model metadata.`
        : `${prefix}: taxonomyKey "${taxonomyKey}" is not registered on model.`,
      taxonomyExists ? undefined : `Available taxonomies: ${(model.taxonomyKeys || []).join(', ') || '(none)'}`,
    )

    if (binding.valueMode !== 'termIds') {
      pushCheck(
        gate,
        `${ref.location}.valueMode`,
        'fail',
        `${prefix}: taxonomy binding valueMode must be "termIds".`,
        `Received "${String((binding as any).valueMode)}"`,
      )
    }
    else {
      pushCheck(gate, `${ref.location}.valueMode`, 'pass', `${prefix}: taxonomy valueMode is termIds.`)
    }

    validateActionContract(
      gate,
      `${ref.location}.actions.getTerms`,
      `${prefix}: taxonomy.getTerms`,
      binding.actions?.getTerms,
      model,
      modelCaller,
    )
    validateActionContract(
      gate,
      `${ref.location}.actions.getRecordTerms`,
      `${prefix}: taxonomy.getRecordTerms`,
      binding.actions?.getRecordTerms,
      model,
      modelCaller,
    )
    validateActionContract(
      gate,
      `${ref.location}.actions.attach`,
      `${prefix}: taxonomy.attach`,
      binding.actions?.attach,
      model,
      modelCaller,
    )
    validateActionContract(
      gate,
      `${ref.location}.actions.detach`,
      `${prefix}: taxonomy.detach`,
      binding.actions?.detach,
      model,
      modelCaller,
    )

    if (binding.actions?.addTerm) {
      validateActionContract(
        gate,
        `${ref.location}.actions.addTerm`,
        `${prefix}: taxonomy.addTerm`,
        binding.actions?.addTerm,
        model,
        modelCaller,
      )
    }
    else {
      pushCheck(
        gate,
        `${ref.location}.actions.addTerm`,
        'warn',
        `${prefix}: taxonomy.addTerm is not configured (optional).`,
      )
    }
    return
  }

  if (binding.kind === 'custom') {
    const handler = String(binding.handler || '').trim()
    pushCheck(
      gate,
      `${ref.location}.customHandler`,
      handler.length > 0 ? 'warn' : 'fail',
      handler.length > 0
        ? `${prefix}: custom binding handler configured (${handler}).`
        : `${prefix}: custom binding handler is empty.`,
      handler.length > 0
        ? 'Custom save handlers are not implemented by default in Phase 1 widget save path.'
        : undefined,
    )
    return
  }

  pushCheck(gate, `${ref.location}.bindingKind`, 'fail', `${prefix}: unsupported binding kind.`)
}

const validateWidgetLayout = (gate: AuditGate, widget: ModelUIWidgetSpec, location: string) => {
  if (!widget.layout?.rows?.length) {
    pushCheck(gate, `${location}.layout`, 'warn', `${location}: widget has no layout rows; fallback layout will be used.`)
    return
  }

  const fieldIds = new Set((widget.fields || []).map(field => String(field.id || '').trim()).filter(Boolean))
  for (const row of widget.layout.rows || []) {
    for (const column of row.columns || []) {
      for (const fieldId of column.fieldIds || []) {
        const key = String(fieldId || '').trim()
        const exists = fieldIds.has(key)
        pushCheck(
          gate,
          `${location}.layout.${row.id}.${column.id}.${key}`,
          exists ? 'pass' : 'fail',
          exists
            ? `${location}: layout field "${key}" exists in widget fields.`
            : `${location}: layout references missing field "${key}".`,
        )
      }
    }
  }
}

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

  const specState = await readModelSpec(model)
  const spec = specState.spec
  const gates: AuditGate[] = []

  const metadataGate = newGate('model-metadata', 'Model Metadata')
  pushCheck(
    metadataGate,
    'model.key',
    model.modelKey.length > 0 ? 'pass' : 'fail',
    model.modelKey.length > 0 ? 'Model key is defined.' : 'Model key is missing.',
  )
  pushCheck(
    metadataGate,
    'model.table',
    model.table.length > 0 ? 'pass' : 'fail',
    model.table.length > 0 ? 'Model table is defined.' : 'Model table is missing.',
  )
  pushCheck(
    metadataGate,
    'model.fields',
    Array.isArray(model.fields) && model.fields.length > 0 ? 'pass' : 'fail',
    Array.isArray(model.fields) && model.fields.length > 0
      ? `Model exposes ${model.fields.length} field(s).`
      : 'Model has no fields in metadata.',
  )
  const requiredOutsideFields = (model.requiredFields || []).filter(field => !(model.fields || []).includes(field))
  pushCheck(
    metadataGate,
    'model.requiredFields',
    requiredOutsideFields.length === 0 ? 'pass' : 'warn',
    requiredOutsideFields.length === 0
      ? 'All required fields exist in model fields.'
      : 'Some required fields are not listed in model fields.',
    requiredOutsideFields.length ? requiredOutsideFields.join(', ') : undefined,
  )
  gates.push(finalizeGate(metadataGate))

  const specGate = newGate('spec-shape', 'Spec Shape')
  pushCheck(
    specGate,
    'spec.version',
    spec.version === 2 || spec.version === 3 ? 'pass' : 'fail',
    spec.version === 2 || spec.version === 3
      ? `Spec version ${spec.version} is supported.`
      : `Spec version "${String((spec as any).version)}" is unsupported.`,
  )
  pushCheck(
    specGate,
    'spec.kind',
    spec.kind === 'helios-model-ui' ? 'pass' : 'fail',
    spec.kind === 'helios-model-ui'
      ? 'Spec kind is helios-model-ui.'
      : `Spec kind "${String((spec as any).kind)}" is invalid.`,
  )
  pushCheck(
    specGate,
    'spec.model',
    String(spec.model || '').trim() === model.modelKey ? 'pass' : 'warn',
    String(spec.model || '').trim() === model.modelKey
      ? 'Spec model matches model key.'
      : `Spec model "${spec.model}" differs from model key "${model.modelKey}".`,
  )
  pushCheck(
    specGate,
    'spec.table',
    String(spec.table || '').trim() === model.table ? 'pass' : 'warn',
    String(spec.table || '').trim() === model.table
      ? 'Spec table matches model table.'
      : `Spec table "${spec.table}" differs from model table "${model.table}".`,
  )
  pushCheck(
    specGate,
    'spec.route',
    String(spec.directory.route || '').startsWith('/') ? 'pass' : 'fail',
    String(spec.directory.route || '').startsWith('/')
      ? `Directory route "${spec.directory.route}" is valid.`
      : `Directory route "${String(spec.directory.route)}" must start with "/".`,
  )
  pushCheck(
    specGate,
    'spec.tabs',
    Array.isArray(spec.single.tabs) && spec.single.tabs.length > 0 ? 'pass' : 'warn',
    Array.isArray(spec.single.tabs) && spec.single.tabs.length > 0
      ? `Spec defines ${spec.single.tabs.length} tab(s).`
      : 'Spec has no tabs.',
  )
  gates.push(finalizeGate(specGate))

  let modelCaller: ModelCaller | null = null
  let modelCallerKey = ''
  const callerGate = newGate('router-surface', 'Router Surface')
  try {
    const callerResult = await resolveModelCaller(event, model)
    if (callerResult.ok) {
      modelCaller = callerResult.caller
      modelCallerKey = callerResult.key
      pushCheck(
        callerGate,
        'router.resolve',
        'pass',
        `Resolved model caller at key "${callerResult.key}".`,
      )
    }
    else {
      pushCheck(callerGate, 'router.resolve', 'fail', 'Failed to resolve model caller.', callerResult.reason, {
        candidates: callerResult.candidates,
        availableKeys: callerResult.availableKeys,
      })
    }
  }
  catch (error: any) {
    pushCheck(
      callerGate,
      'router.resolve',
      'fail',
      'Failed to create TRPC caller context.',
      error?.message || String(error),
    )
  }
  gates.push(finalizeGate(callerGate))

  const createDialogGate = newGate('create-dialog', 'Create Dialog Contract')
  validateActionContract(
    createDialogGate,
    'createDialog.action',
    'directory.createDialog',
    spec.directory.createDialog.action,
    model,
    modelCaller,
  )
  const createFields = spec.directory.createDialog.fields || []
  pushCheck(
    createDialogGate,
    'createDialog.fields',
    createFields.length > 0 ? 'pass' : 'warn',
    createFields.length > 0
      ? `Create dialog defines ${createFields.length} field(s).`
      : 'Create dialog has no fields.',
  )
  const createFieldKeys = new Set(createFields.map(field => resolveFieldKey(field).toLowerCase()).filter(Boolean))
  const modelRequiredFields = (model.requiredFields || [])
    .map(entry => String(entry || '').trim())
    .filter(entry => entry.length > 0 && entry !== 'id' && entry !== 'rid')
  const createRequiredKeys = (spec.directory.createDialog.required || [])
    .map(entry => String(entry || '').trim())
    .filter(Boolean)
  const missingRequired = (spec.directory.createDialog.required || [])
    .map(entry => String(entry || '').trim())
    .filter(Boolean)
    .filter(key => !createFieldKeys.has(key.toLowerCase()))
  pushCheck(
    createDialogGate,
    'createDialog.required',
    missingRequired.length === 0 ? 'pass' : 'fail',
    missingRequired.length === 0
      ? 'All required create fields exist in create dialog fields.'
      : 'Some required create fields are missing from create dialog fields.',
    missingRequired.length ? missingRequired.join(', ') : undefined,
  )
  const missingModelRequiredInRequired = modelRequiredFields.filter(
    key => !createRequiredKeys.some(required => required.toLowerCase() === key.toLowerCase()),
  )
  pushCheck(
    createDialogGate,
    'createDialog.modelRequired',
    missingModelRequiredInRequired.length === 0 ? 'pass' : 'fail',
    missingModelRequiredInRequired.length === 0
      ? 'Create dialog required keys include all required model fields.'
      : 'Required model fields are missing from create dialog required keys.',
    missingModelRequiredInRequired.length ? missingModelRequiredInRequired.join(', ') : undefined,
  )
  const missingModelRequiredInFields = modelRequiredFields.filter(
    key => !createFieldKeys.has(key.toLowerCase()),
  )
  pushCheck(
    createDialogGate,
    'createDialog.modelRequiredFields',
    missingModelRequiredInFields.length === 0 ? 'pass' : 'fail',
    missingModelRequiredInFields.length === 0
      ? 'Create dialog fields include all required model fields.'
      : 'Required model fields are missing from create dialog fields.',
    missingModelRequiredInFields.length ? missingModelRequiredInFields.join(', ') : undefined,
  )
  gates.push(finalizeGate(createDialogGate))

  const bindingsGate = newGate('field-bindings', 'Field Binding Contracts')
  const refs = collectFieldRefs(spec)
  const createRefs = refs.filter(ref => ref.scope === 'create')
  const singleRefs = refs.filter(ref => ref.scope === 'single')
  pushCheck(
    bindingsGate,
    'fieldRefs.count',
    refs.length > 0 ? 'pass' : 'warn',
    refs.length > 0 ? `Collected ${refs.length} field binding reference(s).` : 'No fields found in create/single specs.',
  )
  pushCheck(
    bindingsGate,
    'fieldRefs.create',
    createRefs.length > 0 ? 'pass' : 'warn',
    createRefs.length > 0
      ? `Create dialog contributes ${createRefs.length} bound field(s).`
      : 'Create dialog has no bound fields.',
  )
  pushCheck(
    bindingsGate,
    'fieldRefs.single',
    singleRefs.length > 0 ? 'pass' : 'fail',
    singleRefs.length > 0
      ? `Single manager contributes ${singleRefs.length} bound field(s).`
      : 'Single manager has no bound fields.',
  )

  for (const ref of refs) {
    validateBindingContract(bindingsGate, ref, model, modelCaller)
  }

  for (const tab of spec.single.tabs || []) {
    for (const row of tab.primary || []) {
      for (const column of row.columns || []) {
        for (const widget of column.primary || []) {
          validateWidgetLayout(
            bindingsGate,
            widget,
            `single.tabs.${tab.slug}.rows.${row.id}.columns.${column.id}.widgets.${widget.id}`,
          )
        }
      }
    }
  }
  gates.push(finalizeGate(bindingsGate))

  const directoryGate = newGate('directory-contract', 'Directory Contract')
  const knownDirectoryKeys = new Set(
    [
      ...model.fields,
      ...model.taxonomyKeys,
      ...model.subtableKeys,
      'rid',
      'id',
    ]
      .map(entry => String(entry || '').trim())
      .filter(Boolean)
      .map(entry => entry.toLowerCase()),
  )
  for (const field of spec.directory.listing.fields || []) {
    const key = String(field.key || '').trim()
    const known = knownDirectoryKeys.has(key.toLowerCase())
    pushCheck(
      directoryGate,
      `directory.listing.${key || 'empty'}`,
      key.length === 0 ? 'fail' : (known ? 'pass' : 'warn'),
      key.length === 0
        ? 'Directory listing field key is empty.'
        : (known
            ? `Directory listing field "${key}" is known.`
            : `Directory listing field "${key}" is not in known model keys (allowed, but verify).`),
    )
  }

  for (const filter of spec.directory.listing.filters || []) {
    const key = String(filter.key || '').trim()
    const known = knownDirectoryKeys.has(key.toLowerCase())
    pushCheck(
      directoryGate,
      `directory.filters.${key || 'empty'}`,
      key.length === 0 ? 'fail' : (known ? 'pass' : 'warn'),
      key.length === 0
        ? 'Directory filter key is empty.'
        : (known
            ? `Directory filter "${key}" is known.`
            : `Directory filter "${key}" is not in known model keys (allowed, but verify).`),
    )
  }

  if (spec.directory.typesense.enabled) {
    pushCheck(
      directoryGate,
      'typesense.modelEnabled',
      model.hasTypesense ? 'pass' : 'fail',
      model.hasTypesense
        ? 'Model metadata indicates TypeSense support.'
        : 'Directory enables TypeSense but model metadata says TypeSense is disabled.',
    )

    const collectionName = String(spec.directory.typesense.collection || '').trim()
    const resolvedCollection = resolveTypesenseCollection([
      collectionName,
      model.typesenseCollection,
      model.table,
      model.modelKey,
      modelCallerKey,
    ])
    pushCheck(
      directoryGate,
      'typesense.collection',
      collectionName.length > 0 && Boolean(resolvedCollection) ? 'pass' : 'fail',
      collectionName.length > 0 && Boolean(resolvedCollection)
        ? `Typesense collection "${resolvedCollection?.schema?.name || resolvedCollection?.key}" is present in schema bundle.`
        : `Typesense collection "${collectionName || '(empty)'}" is missing from schema bundle.`,
    )

    const generatedCollectionName = String(model.typesenseCollection || '').trim()
    if (generatedCollectionName.length > 0 && collectionName.length > 0) {
      const match = normalizeToken(generatedCollectionName) === normalizeToken(collectionName)
      pushCheck(
        directoryGate,
        'typesense.collectionManifestMatch',
        match ? 'pass' : 'warn',
        match
          ? 'Directory TypeSense collection matches generated model metadata.'
          : 'Directory TypeSense collection differs from generated model metadata.',
        match ? undefined : `Spec: "${collectionName}" | Manifest: "${generatedCollectionName}"`,
      )
    }

    const queryByRaw = (spec.directory.typesense.queryBy || [])
      .map(entry => String(entry || '').trim())
      .filter(Boolean)
    pushCheck(
      directoryGate,
      'typesense.queryBy',
      queryByRaw.length > 0 ? 'pass' : 'fail',
      queryByRaw.length > 0
        ? `Typesense queryBy has ${queryByRaw.length} field(s).`
        : 'Typesense queryBy is empty.',
    )

    if (resolvedCollection) {
      for (const field of queryByRaw) {
        const resolved = resolveCanonicalTypesenseField(field, resolvedCollection.fieldLookup)
        pushCheck(
          directoryGate,
          `typesense.queryBy.${field || 'empty'}`,
          resolved ? 'pass' : 'fail',
          resolved
            ? `queryBy "${field}" resolves to collection field "${resolved.name}".`
            : `queryBy "${field}" does not exist on collection "${resolvedCollection.schema?.name || resolvedCollection.key}".`,
        )
      }

      const sortableRaw = (spec.directory.typesense.sortableFields || [])
        .map(entry => String(entry || '').trim())
        .filter(Boolean)
      if (!sortableRaw.length) {
        pushCheck(
          directoryGate,
          'typesense.sortableFields',
          'warn',
          'Typesense sortableFields is empty.',
        )
      }
      for (const field of sortableRaw) {
        const resolved = resolveCanonicalTypesenseField(field, resolvedCollection.fieldLookup)
        if (!resolved) {
          pushCheck(
            directoryGate,
            `typesense.sortableFields.${field}`,
            'fail',
            `Sortable field "${field}" does not exist on collection "${resolvedCollection.schema?.name || resolvedCollection.key}".`,
          )
          continue
        }
        pushCheck(
          directoryGate,
          `typesense.sortableFields.${field}`,
          resolved.sortable ? 'pass' : 'fail',
          resolved.sortable
            ? `Sortable field "${field}" is configured as sortable on collection.`
            : `Sortable field "${field}" exists but is not marked sortable in the collection schema.`,
        )
      }

      const filtersRaw = (spec.directory.typesense.filters || [])
        .map(entry => String(entry || '').trim())
        .filter(Boolean)
      for (const field of filtersRaw) {
        const resolved = resolveCanonicalTypesenseField(field, resolvedCollection.fieldLookup)
        if (!resolved) {
          pushCheck(
            directoryGate,
            `typesense.filters.${field}`,
            'fail',
            `Filter field "${field}" does not exist on collection "${resolvedCollection.schema?.name || resolvedCollection.key}".`,
          )
          continue
        }
        pushCheck(
          directoryGate,
          `typesense.filters.${field}`,
          resolved.faceted ? 'pass' : 'fail',
          resolved.faceted
            ? `Filter field "${field}" is faceted in collection schema.`
            : `Filter field "${field}" exists but is not marked faceted in collection schema.`,
        )
      }
    }

    if (modelCaller?.typesense) {
      const hasList = typeof modelCaller.typesense.list === 'function'
      const hasCount = typeof modelCaller.typesense.count === 'function'
      const hasResource = typeof modelCaller.typesense.resource === 'function'
      pushCheck(
        directoryGate,
        'typesense.router.list',
        hasList ? 'pass' : 'fail',
        hasList ? 'Router exposes typesense.list.' : 'Router is missing typesense.list.',
      )
      pushCheck(
        directoryGate,
        'typesense.router.count',
        hasCount ? 'pass' : 'fail',
        hasCount ? 'Router exposes typesense.count.' : 'Router is missing typesense.count.',
      )
      pushCheck(
        directoryGate,
        'typesense.router.resource',
        hasResource ? 'pass' : 'fail',
        hasResource ? 'Router exposes typesense.resource.' : 'Router is missing typesense.resource.',
      )
    }
    else {
      pushCheck(
        directoryGate,
        'typesense.router.surface',
        'warn',
        'Model router was not resolved; TypeSense router surface checks skipped.',
      )
    }
  }
  else {
    pushCheck(directoryGate, 'typesense.disabled', 'warn', 'Directory Typesense is disabled for this model.')
  }
  gates.push(finalizeGate(directoryGate))

  const artifactGate = newGate('artifacts', 'Fragment/Route Artifacts')
  const paths = resolveModelManagerPaths()
  const fragmentPath = paths.fragmentFile(model.modelKey)
  const generatedPath = paths.generatedFile(model.modelKey)
  const fragmentExists = await fileExists(fragmentPath)
  const generatedExists = await fileExists(generatedPath)

  pushCheck(
    artifactGate,
    'fragment.file',
    fragmentExists ? 'pass' : (specState.source === 'fragment' ? 'fail' : 'warn'),
    fragmentExists
      ? 'Model fragment file exists.'
      : (specState.source === 'fragment'
          ? 'Spec source says fragment, but fragment file is missing.'
          : 'Fragment file does not exist (using default spec source).'),
    undefined,
    { path: fragmentPath },
  )
  pushCheck(
    artifactGate,
    'generated.file',
    generatedExists ? 'pass' : 'warn',
    generatedExists
      ? 'Generated spec JSON file exists.'
      : 'Generated spec JSON file is missing.',
    undefined,
    { path: generatedPath },
  )

  if (spec.directory.enabled) {
    const segments = routeToSegments(spec.directory.route)
    if (!segments.length) {
      pushCheck(
        artifactGate,
        'route.segments',
        'fail',
        'Directory route cannot resolve to page segments.',
        `Route: ${spec.directory.route}`,
      )
    }
    else {
      const directoryFile = resolve(paths.pagesDir, ...segments, 'index.vue')
      const recordFile = resolve(paths.pagesDir, ...segments, '[rid].vue')
      const directorySource = await readTextFile(directoryFile)
      const recordSource = await readTextFile(recordFile)
      const marker = '@helios-generated-model-route'

      pushCheck(
        artifactGate,
        'route.directoryPage',
        directorySource ? 'pass' : 'fail',
        directorySource ? 'Directory route page exists.' : 'Directory route page is missing.',
        undefined,
        { path: directoryFile },
      )
      pushCheck(
        artifactGate,
        'route.recordPage',
        recordSource ? 'pass' : 'fail',
        recordSource ? 'Record route page exists.' : 'Record route page is missing.',
        undefined,
        { path: recordFile },
      )

      if (directorySource) {
        pushCheck(
          artifactGate,
          'route.directoryPage.marker',
          directorySource.includes(marker) ? 'pass' : 'warn',
          directorySource.includes(marker)
            ? 'Directory route page is generator-managed.'
            : 'Directory route page exists but is not generator-managed marker file.',
        )
      }
      if (recordSource) {
        pushCheck(
          artifactGate,
          'route.recordPage.marker',
          recordSource.includes(marker) ? 'pass' : 'warn',
          recordSource.includes(marker)
            ? 'Record route page is generator-managed.'
            : 'Record route page exists but is not generator-managed marker file.',
        )
      }
    }
  }
  else {
    pushCheck(artifactGate, 'route.disabled', 'warn', 'Directory is disabled; route artifact checks skipped.')
  }
  gates.push(finalizeGate(artifactGate))

  const failed = gates.reduce((count, gate) => count + gate.checks.filter(check => check.status === 'fail').length, 0)
  const warned = gates.reduce((count, gate) => count + gate.checks.filter(check => check.status === 'warn').length, 0)
  const passed = gates.reduce((count, gate) => count + gate.checks.filter(check => check.status === 'pass').length, 0)

  const summaryStatus: AuditStatus = failed > 0 ? 'fail' : (warned > 0 ? 'warn' : 'pass')

  return {
    ok: failed === 0,
    status: summaryStatus,
    model: {
      key: model.modelKey,
      table: model.table,
      route: spec.directory.route,
      source: specState.source,
      dataMode: model.dataMode,
      hasTypesense: model.hasTypesense,
      taxonomyKeys: model.taxonomyKeys,
      subtableKeys: model.subtableKeys,
    },
    summary: {
      gates: gates.length,
      checks: passed + warned + failed,
      passed,
      warned,
      failed,
      status: summaryStatus,
    },
    gates,
  }
})
