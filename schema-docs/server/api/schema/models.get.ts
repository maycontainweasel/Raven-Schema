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

const resolveRouteKey = (spec: any, modelEntry: any) => {
  if (modelEntry?.slugPolicy) return modelEntry.slugPolicy
  const structure = String(spec?.id?.structure || '').toLowerCase()
  if (structure.includes('qid')) return 'qid'
  if (structure.includes('key')) return 'key'
  return 'id'
}

const resolveModulePrimarySpec = async (table: string) => {
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
          return { spec: parsed, folderPath: specDir }
        }
      }
    }
  }
  return null
}

const resolvePrimarySpec = async (specsRoot: string, table: string) => {
  const folders = await readdir(specsRoot, { withFileTypes: true })
  const folder = folders.find(
    (entry) => entry.isDirectory() && entry.name.endsWith(`(${table})`)
  )
  if (!folder) {
    return resolveModulePrimarySpec(table)
  }
  const folderPath = resolve(specsRoot, folder.name)
  const files = await readdir(folderPath)
  const yamlFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
  for (const file of yamlFiles) {
    const raw = await readFile(resolve(folderPath, file), 'utf-8')
    const parsed = parse(raw) as any
    if (parsed?.primary) {
      return { spec: parsed, folderPath }
    }
  }
  return resolveModulePrimarySpec(table)
}

const resolveSpecsRoot = () => {
  const { schemaKit } = useRuntimeConfig()
  const cwd = process.cwd()
  const candidates = [
    schemaKit?.specsRoot,
    resolve(cwd, '../config/specs'),
    resolve(cwd, '../passmed-schema/config/specs'),
    resolve(cwd, '../../passmed-schema/config/specs'),
    resolve(cwd, '../../tools/passmed-schema/config/specs'),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw createError({
    statusCode: 500,
    statusMessage: `Specs folder not found. Tried: ${candidates.join(', ')}`,
  })
}

export default defineEventHandler(async () => {
  const specsRoot = resolveSpecsRoot()
  const entries = await Promise.all(
    Object.entries(models).map(async ([modelKey, modelEntry]) => {
      const primary = await resolvePrimarySpec(specsRoot, (modelEntry as any).table)
      if (!primary) return null
      const { spec } = primary
      return {
        modelKey,
        label: spec?.name ?? toLabel(modelKey),
        description: spec?.description ?? '',
        table: (modelEntry as any).table,
        data: (modelEntry as any).data,
        routerName: spec?.router?.name ?? modelKey,
        hasTypesense: Boolean(spec?.typesense?.schema?.collection),
        typesenseCollection: spec?.typesense?.schema?.collection ?? null,
        routeKey: resolveRouteKey(spec, modelEntry),
      }
    })
  )

  return entries.filter(Boolean)
})
