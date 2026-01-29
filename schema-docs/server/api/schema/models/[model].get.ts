import { existsSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import { resolve } from 'path'
import { parse } from 'yaml'
import { createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { models } from '@schema/models'

const toLabel = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase())

const resolveFieldType = (value: string | undefined): 'string' | 'number' | 'boolean' => {
  const type = String(value ?? '').toLowerCase()
  if (type.includes('bool')) return 'boolean'
  if (type.includes('int') || type.includes('number') || type.includes('float')) return 'number'
  return 'string'
}

const parseFields = (fields: any[] = []) => {
  return fields.map((entry) => {
    const [key, def] = Object.entries(entry ?? {})[0] as [string, any]
    const rawType = String(def?.type ?? '')
    const rawLower = rawType.toLowerCase()
    return {
      key,
      label: toLabel(key),
      type: resolveFieldType(def?.type),
      typeRaw: rawType,
      isArray: rawLower.includes('array'),
      isRecord: rawLower.includes('record'),
      required: Boolean(def?.required),
      isId: Boolean(def?.isId),
    }
  })
}

const resolveModuleSpecFolder = async (table: string) => {
  const cwd = process.cwd()
  const moduleRoots = [
    resolve(cwd, '../config/bootstrap/modules'),
    resolve(cwd, '../passmed-schema/config/bootstrap/modules'),
    resolve(cwd, '../../passmed-schema/config/bootstrap/modules'),
    resolve(cwd, '../../tools/passmed-schema/config/bootstrap/modules'),
  ].filter(Boolean) as string[]

  for (const moduleRoot of moduleRoots) {
    if (!existsSync(moduleRoot)) continue
    const moduleDirs = await readdir(moduleRoot, { withFileTypes: true })
    for (const entry of moduleDirs) {
      if (!entry.isDirectory()) continue
      const candidates = [
        resolve(moduleRoot, entry.name, 'specs_overrides'),
        resolve(moduleRoot, entry.name, 'specs'),
      ]
      for (const specDir of candidates) {
        if (!existsSync(specDir)) continue
        const files = await readdir(specDir)
        const yamlFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
        for (const file of yamlFiles) {
          const raw = await readFile(resolve(specDir, file), 'utf-8')
          const parsed = parse(raw) as any
          if (!parsed?.primary) continue
          if (String(parsed?.table?.model || '') !== table) continue
          return specDir
        }
      }
    }
  }
  return null
}

export default defineEventHandler(async (event) => {
  const modelKey = event.context.params?.model
  if (!modelKey || typeof modelKey !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'model key is required' })
  }

  const modelEntry = (models as any)[modelKey]
  if (!modelEntry) {
    throw createError({ statusCode: 404, statusMessage: `model not found: ${modelKey}` })
  }

  const { schemaKit } = useRuntimeConfig()
  const cwd = process.cwd()
  const candidates = [
    schemaKit?.specsRoot,
    resolve(cwd, '../config/specs'),
    resolve(cwd, '../passmed-schema/config/specs'),
    resolve(cwd, '../../passmed-schema/config/specs'),
    resolve(cwd, '../../tools/passmed-schema/config/specs'),
  ].filter(Boolean) as string[]

  const specsRoot = candidates.find((candidate) => existsSync(candidate))
  if (!specsRoot) {
    throw createError({
      statusCode: 500,
      statusMessage: `Specs folder not found. Tried: ${candidates.join(', ')}`,
    })
  }
  const folders = await readdir(specsRoot, { withFileTypes: true })
  const folder = folders.find(
    (entry) => entry.isDirectory() && entry.name.endsWith(`(${modelEntry.table})`)
  )

  const folderPath = folder ? resolve(specsRoot, folder.name) : await resolveModuleSpecFolder(modelEntry.table)
  if (!folderPath) {
    throw createError({ statusCode: 404, statusMessage: `specs not found for ${modelKey}` })
  }
  const files = await readdir(folderPath)
  const yamlFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))

  const specs = await Promise.all(
    yamlFiles.map(async (file) => {
      const raw = await readFile(resolve(folderPath, file), 'utf-8')
      const parsed = parse(raw) as any
      return { file, ...parsed }
    })
  )

  const primarySpec = specs.find((spec) => spec.primary === true)
  if (!primarySpec) {
    throw createError({ statusCode: 404, statusMessage: `primary spec not found for ${modelKey}` })
  }

  const taxonomies = (primarySpec.taxonomies ?? []).map((taxonomy: any) => ({
    key: taxonomy.key,
    labelSingular: taxonomy.labels?.singular ?? taxonomy.key,
    labelPlural: taxonomy.labels?.plural ?? taxonomy.key,
    description: taxonomy.taxonomy?.description ?? '',
    hierarchical: Boolean(
      taxonomy.taxonomy?.fields?.some((entry: any) => {
        const def = Object.values(entry ?? {})[0] as any
        return def?.hierarchical === true
      })
    ),
  }))

  const autoCreateMap = new Map<string, boolean>()
  if (Array.isArray(primarySpec.subTables)) {
    primarySpec.subTables.forEach((subtable: any) => {
      if (!subtable?.model) return
      autoCreateMap.set(subtable.model, Boolean(subtable.autoCreate))
    })
  }

  const resources = Array.isArray(primarySpec.views)
    ? primarySpec.views
        .map((view: any) => String(view?.name || '').trim())
        .filter(Boolean)
    : []

  const subTables = specs
    .filter((spec) => spec.primary === false && spec.router?.name)
    .map((spec) => ({
      label: spec.name ?? spec.table?.model,
      model: spec.table?.model,
      parent: spec.router?.parent,
      autoCreate: autoCreateMap.get(spec.table?.model),
      tableType: spec.tableType,
      routerName: spec.router?.name,
      endpoints: Array.isArray(spec.router?.endpoints) ? spec.router.endpoints : [],
      fields: parseFields(spec.fields ?? []),
    }))

  return {
    modelKey,
    table: modelEntry.table,
    routerName: primarySpec.router?.name ?? modelKey,
    fields: parseFields(primarySpec.fields ?? []),
    taxonomies,
    subTables,
    resources,
  }
})
