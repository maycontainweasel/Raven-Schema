import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { defineEventHandler } from 'h3'
import { normalizeColorPalettes, type HeliosColorPalette } from './colors'
import { createDefaultThemeSettings, normalizeThemeSettings, type HeliosThemeSettings } from './themes'
import { ensureHeliosBaselineArtifacts } from './setup'

type HeliosTypeConfig = {
  baseFontPx: number
  typeRatio: number
  gridRatio: number
  spaceRatio: number
  minStep: number
  maxStep: number
  step: number
  brandColor: string
}

type HeliosBreakpointConfig = {
  id: string
  label: string
  minWidth: number
  maxWidth: number | null
  config: HeliosTypeConfig
}

const defaultConfig: HeliosTypeConfig = {
  baseFontPx: 16,
  typeRatio: 1.2,
  gridRatio: 1.4,
  spaceRatio: 1.25,
  minStep: -2,
  maxStep: 6,
  step: 0.25,
  brandColor: '#2858ff',
}

const defaultBreakpointRanges = [
  { id: 'mobile', label: 'Mobile', minWidth: 0, maxWidth: 500 },
  { id: 'tablet', label: 'Tablet', minWidth: 500, maxWidth: 1024 },
  { id: 'laptop', label: 'Laptop', minWidth: 1024, maxWidth: 1366 },
  { id: 'desktop', label: 'Desktop', minWidth: 1366, maxWidth: null as number | null },
]

const settingsPath = (rootDir: string) => resolve(rootDir, 'app/helios/generated/type.settings.json')
const fragmentPath = (rootDir: string) => resolve(rootDir, 'app/helios/fragments/type.json')
const colorSettingsPath = (rootDir: string) => resolve(rootDir, 'app/helios/generated/colors.settings.json')
const colorFragmentPath = (rootDir: string) => resolve(rootDir, 'app/helios/fragments/colors.json')
const themeSettingsPath = (rootDir: string) => resolve(rootDir, 'app/helios/generated/theme.settings.json')
const themeFragmentPath = (rootDir: string) => resolve(rootDir, 'app/helios/fragments/theme.json')

const sanitizeId = (value: unknown, fallback = 'breakpoint') => {
  const token = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return token || fallback
}

const normalizeConfig = (value: any, fallback: HeliosTypeConfig = defaultConfig): HeliosTypeConfig => {
  const next: HeliosTypeConfig = {
    baseFontPx: Number(value?.baseFontPx ?? fallback.baseFontPx),
    typeRatio: Number(value?.typeRatio ?? fallback.typeRatio),
    gridRatio: Number(value?.gridRatio ?? fallback.gridRatio),
    spaceRatio: Number(value?.spaceRatio ?? fallback.spaceRatio),
    minStep: Number(value?.minStep ?? fallback.minStep),
    maxStep: Number(value?.maxStep ?? fallback.maxStep),
    step: Number(value?.step ?? fallback.step),
    brandColor: String(value?.brandColor ?? fallback.brandColor),
  }

  if (!Number.isFinite(next.baseFontPx) || next.baseFontPx < 8) next.baseFontPx = fallback.baseFontPx
  if (!Number.isFinite(next.typeRatio) || next.typeRatio <= 1) next.typeRatio = fallback.typeRatio
  if (!Number.isFinite(next.gridRatio) || next.gridRatio <= 0.5) next.gridRatio = fallback.gridRatio
  if (!Number.isFinite(next.spaceRatio) || next.spaceRatio <= 1) next.spaceRatio = fallback.spaceRatio
  if (!Number.isFinite(next.minStep)) next.minStep = fallback.minStep
  if (!Number.isFinite(next.maxStep)) next.maxStep = fallback.maxStep
  if (next.maxStep <= next.minStep) {
    next.minStep = fallback.minStep
    next.maxStep = fallback.maxStep
  }
  if (!Number.isFinite(next.step) || next.step <= 0) next.step = fallback.step

  const rawBrand = String(value?.brandColor ?? fallback.brandColor).trim()
  next.brandColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawBrand)
    ? rawBrand
    : fallback.brandColor

  return next
}

const createDefaultBreakpoints = (baseConfig: HeliosTypeConfig): HeliosBreakpointConfig[] => {
  return defaultBreakpointRanges.map((entry) => ({
    id: entry.id,
    label: entry.label,
    minWidth: entry.minWidth,
    maxWidth: entry.maxWidth,
    config: normalizeConfig(baseConfig, baseConfig),
  }))
}

const normalizeBreakpoints = (
  value: unknown,
  baseConfig: HeliosTypeConfig
): HeliosBreakpointConfig[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return createDefaultBreakpoints(baseConfig)
  }

  const normalized: HeliosBreakpointConfig[] = value
    .map((entry: any, index) => {
      if (!entry || typeof entry !== 'object') return null
      const fallbackDefault = defaultBreakpointRanges[defaultBreakpointRanges.length - 1]!
      const fallback = defaultBreakpointRanges[index] ?? fallbackDefault
      const minWidthRaw = Number(entry.minWidth)
      const minWidth = Number.isFinite(minWidthRaw) && minWidthRaw >= 0
        ? Math.round(minWidthRaw)
        : fallback.minWidth

      const maxRaw = entry.maxWidth
      const maxWidth = maxRaw === null || maxRaw === '' || maxRaw === undefined
        ? null
        : Number.isFinite(Number(maxRaw))
          ? Math.round(Number(maxRaw))
          : fallback.maxWidth

      const safeMaxWidth = maxWidth !== null && maxWidth <= minWidth ? null : maxWidth
      const id = sanitizeId(entry.id ?? fallback.id, `${fallback.id}-${index + 1}`)
      const label = String(entry.label ?? fallback.label).trim() || fallback.label

      return {
        id,
        label,
        minWidth,
        maxWidth: safeMaxWidth,
        config: normalizeConfig(entry.config, baseConfig),
      }
    })
    .filter((entry): entry is HeliosBreakpointConfig => Boolean(entry))

  if (normalized.length === 0) {
    return createDefaultBreakpoints(baseConfig)
  }

  const seen = new Set<string>()
  const deduped = normalized.map((entry, index) => {
    let id = entry.id
    while (seen.has(id)) {
      id = `${entry.id}-${index + 1}`
    }
    seen.add(id)
    return { ...entry, id }
  })

  deduped.sort((a, b) => a.minWidth - b.minWidth)

  if (deduped[0]) deduped[0].minWidth = 0

  for (let index = 1; index < deduped.length; index += 1) {
    const previous = deduped[index - 1]
    const current = deduped[index]
    if (!previous || !current) continue
    const minimumAllowed = previous.minWidth + 1
    if (current.minWidth < minimumAllowed) current.minWidth = minimumAllowed
  }

  for (let index = 0; index < deduped.length; index += 1) {
    const current = deduped[index]
    if (!current) continue

    if (current.maxWidth !== null && current.maxWidth <= current.minWidth) {
      current.maxWidth = null
    }

    const next = deduped[index + 1]
    if (!next) continue

    if (current.maxWidth === null || current.maxWidth > next.minWidth) {
      current.maxWidth = next.minWidth
    }
  }

  return deduped
}

const normalizeDocument = (value: any) => {
  if (value && typeof value === 'object' && ('config' in value || 'breakpoints' in value)) {
    const config = normalizeConfig(value.config, defaultConfig)
    const breakpoints = normalizeBreakpoints(value.breakpoints, config)
    const colors = normalizeColorPalettes(value.colors)
    const themes = normalizeThemeSettings(value.themes)
    const baseConfig = breakpoints[0]?.config ?? config
    return { config: baseConfig, breakpoints, colors, themes }
  }

  const config = normalizeConfig(value, defaultConfig)
  const breakpoints = createDefaultBreakpoints(config)
  const colors = normalizeColorPalettes(null)
  const themes = createDefaultThemeSettings()
  return { config, breakpoints, colors, themes }
}

export default defineEventHandler(async () => {
  const rootDir = process.cwd()
  try {
    await ensureHeliosBaselineArtifacts(rootDir, { ensureConfigBridges: true })
  }
  catch (error) {
    console.warn('[helios] Unable to auto-initialize baseline artifacts from /api/helios/type/read:', error)
  }

  try {
    const raw = await fs.readFile(fragmentPath(rootDir), 'utf-8')
    const parsed = JSON.parse(raw)
    const normalized = normalizeDocument(parsed)
    let colors: HeliosColorPalette[] = normalized.colors
    let themes: HeliosThemeSettings = normalized.themes

    try {
      const colorRaw = await fs.readFile(colorFragmentPath(rootDir), 'utf-8')
      const colorParsed = JSON.parse(colorRaw)
      colors = normalizeColorPalettes(colorParsed?.palettes ?? colorParsed)
    }
    catch {
      colors = normalized.colors
    }

    try {
      const themeRaw = await fs.readFile(themeFragmentPath(rootDir), 'utf-8')
      const themeParsed = JSON.parse(themeRaw)
      themes = normalizeThemeSettings(themeParsed)
    }
    catch {
      themes = normalized.themes
    }

    return {
      ok: true,
      config: normalized.config,
      breakpoints: normalized.breakpoints,
      colors,
      themes,
      source: 'fragment',
    }
  }
  catch {
    try {
      const raw = await fs.readFile(settingsPath(rootDir), 'utf-8')
      const parsed = JSON.parse(raw)
      const normalized = normalizeDocument(parsed)
      let colors: HeliosColorPalette[] = normalized.colors
      let themes: HeliosThemeSettings = normalized.themes

      try {
        const colorRaw = await fs.readFile(colorSettingsPath(rootDir), 'utf-8')
        const colorParsed = JSON.parse(colorRaw)
        colors = normalizeColorPalettes(colorParsed?.palettes)
      }
      catch {
        colors = normalized.colors
      }

      try {
        const themeRaw = await fs.readFile(themeSettingsPath(rootDir), 'utf-8')
        const themeParsed = JSON.parse(themeRaw)
        themes = normalizeThemeSettings(themeParsed)
      }
      catch {
        themes = normalized.themes
      }

      return {
        ok: true,
        config: normalized.config,
        breakpoints: normalized.breakpoints,
        colors,
        themes,
        source: 'settings',
      }
    }
    catch {
      const breakpoints = createDefaultBreakpoints(defaultConfig)
      const colors = normalizeColorPalettes(null)
      const themes = createDefaultThemeSettings()
      return {
        ok: true,
        config: { ...defaultConfig },
        breakpoints,
        colors,
        themes,
        source: 'default',
      }
    }
  }
})
