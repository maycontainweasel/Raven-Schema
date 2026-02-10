import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { AdminNavConfig, AdminNavItem, AdminNavSection } from '../../app/types/admin-nav'
import { adminNavCustom } from '../../app/config/admin-nav.custom'
import { adminNavGenerated } from '../../app/config/admin-nav.generated'

const safeText = (value: unknown, fallback: string) => {
  const next = String(value ?? fallback).trim()
  return next.length ? next : fallback
}

const slugify = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

const normalizeQuery = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, raw]) => [String(key || '').trim(), String(raw ?? '').trim()] as const)
    .filter(([key, raw]) => key.length > 0 && raw.length > 0)

  if (!entries.length) return undefined
  return Object.fromEntries(entries)
}

const normalizeNavItem = (value: unknown, index: number): AdminNavItem => {
  const fallbackLabel = `Item ${index + 1}`
  if (!value || typeof value !== 'object') {
    const id = `item-${index + 1}`
    return {
      id,
      label: fallbackLabel,
      to: '/',
    }
  }

  const raw = value as Record<string, unknown>
  const label = safeText(raw.label, fallbackLabel)
  const id = slugify(safeText(raw.id, label), `item-${index + 1}`)
  const to = String(raw.to ?? '').trim() || undefined
  const icon = String(raw.icon ?? '').trim() || undefined
  const badge = String(raw.badge ?? '').trim() || undefined
  const query = normalizeQuery(raw.query)
  const defaultOpen = Boolean(raw.defaultOpen)
  const childrenRaw = Array.isArray(raw.children) ? raw.children : []
  const children = childrenRaw.length
    ? childrenRaw.map((entry, childIndex) => normalizeNavItem(entry, childIndex))
    : undefined

  return {
    id,
    label,
    to,
    icon,
    badge,
    query,
    defaultOpen,
    children,
  }
}

const normalizeNavSection = (value: unknown, index: number): AdminNavSection => {
  if (!value || typeof value !== 'object') {
    const id = `section-${index + 1}`
    return {
      id,
      label: `Section ${index + 1}`,
      items: [],
    }
  }

  const raw = value as Record<string, unknown>
  const label = safeText(raw.label, `Section ${index + 1}`)
  const id = slugify(safeText(raw.id, label), `section-${index + 1}`)
  const itemsRaw = Array.isArray(raw.items) ? raw.items : []

  return {
    id,
    label,
    items: itemsRaw.map((entry, itemIndex) => normalizeNavItem(entry, itemIndex)),
  }
}

const buildStaticConfig = (): AdminNavConfig => {
  return {
    sections: [
      ...(adminNavGenerated?.sections ?? []),
      ...(adminNavCustom?.sections ?? []),
    ],
  }
}

export const resolveAdminNavPaths = (cwd = process.cwd()) => {
  const fragmentsDir = resolve(cwd, 'app/helios/fragments/admin')
  const generatedDir = resolve(cwd, 'app/helios/generated/admin')
  const fragmentPath = resolve(fragmentsDir, 'nav.settings.json')
  const generatedPath = resolve(generatedDir, 'nav.generated.json')

  return {
    fragmentsDir,
    generatedDir,
    fragmentPath,
    generatedPath,
  }
}

const normalizeAdminNavConfig = (
  value: unknown,
  fallback: AdminNavConfig,
): AdminNavConfig => {
  const raw = (value && typeof value === 'object') ? value as Record<string, unknown> : {}
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : fallback.sections
  const sections = sectionsRaw.map((entry, index) => normalizeNavSection(entry, index))

  return {
    sections,
  }
}

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

export const readAdminNavConfig = async (cwd = process.cwd()) => {
  const { fragmentPath, generatedPath } = resolveAdminNavPaths(cwd)
  const fallback = buildStaticConfig()
  const raw = await readJsonFile<AdminNavConfig>(fragmentPath)
  const source: 'fragment' | 'default' = raw ? 'fragment' : 'default'
  const config = normalizeAdminNavConfig(raw, fallback)

  return {
    source,
    config,
    files: {
      fragment: fragmentPath,
      generated: generatedPath,
    },
  }
}

export const commitAdminNavConfig = async (
  payload: unknown,
  cwd = process.cwd(),
) => {
  const fallback = buildStaticConfig()
  const config = normalizeAdminNavConfig(payload, fallback)
  const committedAt = new Date().toISOString()
  const { fragmentPath, generatedPath } = resolveAdminNavPaths(cwd)

  const fragmentOutput = {
    version: 1,
    kind: 'helios-admin-nav',
    updatedAt: committedAt,
    sections: config.sections,
  }

  const generatedOutput = {
    version: 1,
    generatedAt: committedAt,
    config,
  }

  await ensureDir(fragmentPath)
  await fs.writeFile(fragmentPath, JSON.stringify(fragmentOutput, null, 2), 'utf-8')

  await ensureDir(generatedPath)
  await fs.writeFile(generatedPath, JSON.stringify(generatedOutput, null, 2), 'utf-8')

  return {
    config,
    committedAt,
    files: {
      fragment: fragmentPath,
      generated: generatedPath,
    },
  }
}

