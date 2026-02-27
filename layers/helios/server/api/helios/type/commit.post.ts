import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineEventHandler, readBody } from 'h3'
import { buildColorsScss, getEnabledColorMap, normalizeColorPalettes } from './colors'
import { buildSemanticScss, buildSemanticShortcuts, createDefaultThemeSettings, normalizeThemeSettings } from './themes'
import {
  ensureHeliosBaselineArtifacts,
  ensureNuxtAdditions as ensureHeliosNuxtAdditions,
  ensureUnoConfigBridge as ensureHeliosUnoConfigBridge,
} from './setup'

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

type HeliosSetupConfig = {
  attributify: boolean
  icons: boolean
  iconCollection: string
  variantGroup: boolean
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

const defaultSetup: HeliosSetupConfig = {
  attributify: true,
  icons: true,
  iconCollection: 'lucide',
  variantGroup: true,
}

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

  const brand = String(value?.brandColor ?? fallback.brandColor).trim()
  next.brandColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(brand)
    ? brand
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

const normalizeSetup = (value: any): HeliosSetupConfig => {
  const iconCollection = String(value?.iconCollection ?? defaultSetup.iconCollection)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

  return {
    attributify: value?.attributify !== false,
    icons: value?.icons !== false,
    iconCollection: iconCollection || defaultSetup.iconCollection,
    variantGroup: value?.variantGroup !== false,
  }
}

const formatScaleKey = (raw: number) => {
  const sign = raw < 0 ? '-' : ''
  const absolute = Math.abs(raw)
  if (absolute % 1 === 0) return `${sign}${absolute}`
  const fixed = absolute.toFixed(2)
  const [intPart, fracRaw = ''] = fixed.split('.')
  const frac = fracRaw.replace(/0+$/, '')
  const normalized = `${intPart}${frac.padEnd(2, '0')}`
  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized
  return `${sign}${padded}`
}

const buildTokenLines = (config: HeliosTypeConfig, indent = '  ') => {
  const lines: string[] = []
  lines.push(`${indent}font-size: ${((config.baseFontPx / 16) * 100).toFixed(4)}%;`)
  lines.push(`${indent}--bf: ${config.baseFontPx};`)
  lines.push(`${indent}--tr: ${config.typeRatio};`)
  lines.push(`${indent}--gr: ${config.gridRatio};`)
  lines.push(`${indent}--sr: ${config.spaceRatio};`)
  lines.push(`${indent}--ds-brand: ${config.brandColor};`)
  lines.push(`${indent}--lh-0: ${config.gridRatio.toFixed(6)}rem;`)
  lines.push(`${indent}--lh-1: ${(config.gridRatio * 2).toFixed(6)}rem;`)

  for (let i = config.minStep; i <= config.maxStep; i += config.step) {
    const step = Number(i.toFixed(2))
    const key = formatScaleKey(step)
    const fsRem = Math.pow(config.typeRatio, step)
    const gridRem = config.gridRatio * step
    const spaceRem = Math.pow(config.spaceRatio, step)
    const lineRem = config.gridRatio * (step + 1)
    lines.push(`${indent}--fs-${key}: ${fsRem.toFixed(6)}rem;`)
    lines.push(`${indent}--v-${key}: ${gridRem.toFixed(6)}rem;`)
    lines.push(`${indent}--sp-${key}: ${spaceRem.toFixed(6)}rem;`)
    lines.push(`${indent}--lh-${key}: ${lineRem.toFixed(6)}rem;`)
  }

  return lines
}

const buildTokensScss = (breakpoints: HeliosBreakpointConfig[]) => {
  const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth)
  const base = sorted[0] ?? createDefaultBreakpoints(defaultConfig)[0]!

  const lines: string[] = []
  lines.push(':root {')
  lines.push(...buildTokenLines(base.config, '  '))
  lines.push('}')
  lines.push('')

  for (const breakpoint of sorted.slice(1)) {
    lines.push(`@media (min-width: ${breakpoint.minWidth}px) {`)
    lines.push('  :root {')
    lines.push(...buildTokenLines(breakpoint.config, '    '))
    lines.push('  }')
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n')
}

const buildTypographyScss = () => {
  return [
    'h1 { font-size: var(--fs-6); line-height: var(--lh-1); }',
    'h2 { font-size: var(--fs-5); line-height: var(--lh-1); }',
    'h3 { font-size: var(--fs-4); line-height: var(--lh-1); }',
    'h4 { font-size: var(--fs-3); line-height: var(--lh-0); }',
    'h5 { font-size: var(--fs-2); line-height: var(--lh-0); }',
    'h6 { font-size: var(--fs-1); line-height: var(--lh-0); }',
    'p, li { font-size: var(--fs-0); line-height: var(--lh-0); }',
    'small { font-size: var(--fs--1); line-height: var(--lh-0); }',
    '',
    '.type-default :is(p, li, h1, h2, h3, h4, h5, h6) {',
    '  margin: 0;',
    '}',
  ].join('\n')
}

const buildScssEntry = () => {
  return ['@use "tokens";', '@use "type";', '@use "colors";', '@use "semantic";', ''].join('\n')
}

const sanitizeThemeKey = (value: string, fallback: string) => {
  const cleaned = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^([^a-z_])/, '_$1')
  return cleaned || fallback
}

const buildUnoGenerated = (
  config: HeliosTypeConfig,
  setup: HeliosSetupConfig,
  breakpoints: HeliosBreakpointConfig[],
  palettes: ReturnType<typeof normalizeColorPalettes>,
  themeSettings: ReturnType<typeof normalizeThemeSettings>
) => {
  const presetEntries = [
    '    presetWind4({',
    '      preflights: {',
    '        reset: true,',
    '        theme: true,',
    '      },',
    '    }),',
  ]
  if (setup.icons) {
    presetEntries.push(
      '    presetIcons({',
      '      extraProperties: {',
      "        display: 'inline-block',",
      "        'vertical-align': 'middle',",
      '      },',
      '    }),'
    )
  }
  if (setup.attributify) {
    presetEntries.push('    presetAttributify(),')
  }

  const sortedBreakpoints = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth)
  const generatedBreakpoints = sortedBreakpoints
    .filter((entry) => entry.minWidth > 0)
    .reduce<Record<string, string>>((acc, entry, index) => {
      const key = sanitizeThemeKey(entry.id, `bp_${index + 1}`)
      acc[key] = `${Math.round(entry.minWidth)}px`
      return acc
    }, {})
  // Legacy mq.scss aliases used throughout existing templates (e.g. t:, tm:, ds:).
  const legacyBreakpointAliases = {
    mobile: '320px',
    tablet: '740px',
    desktop: '980px',
    wide: '1300px',
    m: '320px',
    mm: '380px',
    mmx: '381px',
    ml: '480px',
    mlx: '481px',
    txs: '550px',
    ts: '600px',
    t: '767px',
    tx: '768px',
    txl: '800px',
    tm: '991px',
    tmx: '992px',
    tl: '1024px',
    ds: '1024px',
    d: '1200px',
    dm: '1366px',
    dmx: '1440px',
    dmxx: '1441px',
    dml: '1600px',
    dmlx: '1750px',
    dl: '1900px',
    dxl: '2560px',
    dxxl: '3840px',
    dsx: '1100px',
    brandslider: '1771px',
    midtab: '800px',
    desktopAd: '810px',
    mobileLandscape: '480px',
  }
  const heliosBreakpoints = {
    ...legacyBreakpointAliases,
    ...(Object.keys(generatedBreakpoints).length > 0 ? generatedBreakpoints : { md: '768px' }),
  }
  const selectedThemeColors = getEnabledColorMap(palettes)
  const semanticShortcuts = buildSemanticShortcuts(themeSettings)

  return [
    "import { defineConfig, presetAttributify, presetIcons, presetWind4 } from 'unocss'",
    "import transformerVariantGroup from '@unocss/transformer-variant-group'",
    '',
    `const heliosPaletteColors = ${JSON.stringify(selectedThemeColors)}`,
    `const heliosSemanticShortcuts = ${JSON.stringify(semanticShortcuts)}`,
    `const heliosBreakpoints = ${JSON.stringify(heliosBreakpoints)}`,
    '',
    'const formatScaleKey = (raw: string) => {',
    '  const value = Number(raw)',
    '  if (!Number.isFinite(value)) return raw',
    "  const sign = value < 0 ? '-' : ''",
    '  const absoluteValue = Math.abs(value)',
    '  if (absoluteValue % 1 === 0) return `${sign}${absoluteValue}`',
    '  const fixed = absoluteValue.toFixed(2)',
    "  const [intPart, fracRaw = ''] = fixed.split('.')",
    "  const frac = fracRaw.replace(/0+$/, '')",
    "  const normalized = `${intPart}${frac.padEnd(2, '0')}`",
    "  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized",
    '  return `${sign}${padded}`',
    '}',
    '',
    "const toMaxWidth = (width: string) => {",
    "  const value = Number.parseFloat(width)",
    "  if (!Number.isFinite(value)) return width",
    "  return `${Math.max(0, value - 0.02).toFixed(2)}px`",
    "}",
    '',
    'const heliosBreakpointVariant = (matcher: string) => {',
    "  const idx = matcher.indexOf(':')",
    '  if (idx <= 0) return matcher',
    '  const prefix = matcher.slice(0, idx)',
    '  const body = matcher.slice(idx + 1)',
    "  if (prefix.startsWith('lt-')) {",
    "    const key = prefix.slice(3)",
    '    const width = heliosBreakpoints[key]',
    '    if (!width) return matcher',
    "    return { matcher: body, parent: `@media (max-width: ${toMaxWidth(width)})` }",
    '  }',
    '  const width = heliosBreakpoints[prefix]',
    '  if (!width) return matcher',
    "  return { matcher: body, parent: `@media (min-width: ${width})` }",
    '}',
    '',
    'export default defineConfig({',
    '  presets: [',
    ...presetEntries,
    '  ],',
    setup.variantGroup
      ? '  transformers: [transformerVariantGroup()],'
      : '  transformers: [],',
    '  variants: [heliosBreakpointVariant],',
    '  shortcuts: {',
    '    ...heliosSemanticShortcuts,',
    "    'type-h1': 'f-6 lh-1 font-700',",
    "    'type-h2': 'f-5 lh-1 font-600',",
    "    'type-h3': 'f-4 lh-1 font-600',",
    "    'type-body': 'f-0 lh-0',",
    "    'type-small': 'f--1 lh-0',",
    "    'chip-brand': 'inline-flex items-center rounded-full px-3 py-1 text-sm font-600 text-white bg-brand',",
    '  },',
    '  rules: [',
    "    [/^f-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'font-size': `var(--fs-${formatScaleKey(value)})` })],",
    "    [/^lh-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'line-height': `var(--lh-${formatScaleKey(value)})` })],",
    "    [/^v-(-?[\\d.]+)$/, ([, value = '0']) => ({ height: `var(--v-${formatScaleKey(value)})` })],",
    "    [/^gp-(-?[\\d.]+)$/, ([, value = '0']) => ({ padding: `var(--v-${formatScaleKey(value)})` })],",
    "    [/^gm-(-?[\\d.]+)$/, ([, value = '0']) => ({ margin: `var(--v-${formatScaleKey(value)})` })],",
    "    [/^gg-(-?[\\d.]+)$/, ([, value = '0']) => ({ gap: `var(--v-${formatScaleKey(value)})` })],",
    "    [/^sp-(-?[\\d.]+)$/, ([, value = '0']) => ({ padding: `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spt-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-top': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spr-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-right': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spb-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-bottom': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spl-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-left': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spx-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-left': `var(--sp-${formatScaleKey(value)})`, 'padding-right': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^spy-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'padding-top': `var(--sp-${formatScaleKey(value)})`, 'padding-bottom': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^sm-(-?[\\d.]+)$/, ([, value = '0']) => ({ margin: `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^smt-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-top': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^smr-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-right': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^smb-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-bottom': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^sml-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-left': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^smx-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-left': `var(--sp-${formatScaleKey(value)})`, 'margin-right': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^smy-(-?[\\d.]+)$/, ([, value = '0']) => ({ 'margin-top': `var(--sp-${formatScaleKey(value)})`, 'margin-bottom': `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^sg-(-?[\\d.]+)$/, ([, value = '0']) => ({ gap: `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^sw-(-?[\\d.]+)$/, ([, value = '0']) => ({ width: `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^sh-(-?[\\d.]+)$/, ([, value = '0']) => ({ height: `var(--sp-${formatScaleKey(value)})` })],",
    "    [/^mw-([\\d.]+)$/, ([, num]) => ({ 'max-width': `${num}%` })],",
    "    [/^mw-g-([\\d.]+)$/, ([, num]) => ({ 'max-width': `calc(100% - calc(var(--lh) * ${num}rem))` })],",
    "    [/^cg-([\\d.]+)$/, ([, num]) => ({ 'column-gap': `calc(var(--lh) * ${num}rem)` })],",
    "    [/^mx-a$/, () => ({ margin: '0 auto' })],",
    '  ],',
    '  theme: {',
    '    breakpoints: heliosBreakpoints,',
    '    colors: {',
    '      ...heliosPaletteColors,',
    `      heliosbrand: '${config.brandColor}',`,
    "      brand: 'var(--ds-brand, #2858ff)',",
    "      ink: 'var(--ds-text, #0f172a)',",
    '    },',
    '  },',
    '})',
    '',
  ].join('\n')
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

const ensureNuxtAdditions = async (rootDir: string): Promise<string[]> => {
  const notes: string[] = []
  const filePath = resolve(rootDir, 'nuxt.config.additions.ts')
  const cssEntry = "'~/helios/scss/index.scss'"
  const moduleEntry = "'@unocss/nuxt'"
  const piniaModuleEntry = "'@pinia/nuxt'"

  let source = ''
  try {
    source = await fs.readFile(filePath, 'utf-8')
  }
  catch {
    const created = [
      '// Local overrides for arrays like modules/css/transpile.',
      '// This file is safe to edit and will be merged into the generated config.',
      'export default {',
      `  modules: [${moduleEntry}, ${piniaModuleEntry}],`,
      `  css: [${cssEntry}],`,
      '  unocss: {',
      '    preflight: true,',
      '    nuxtLayers: true,',
      "    configFile: './uno.config.ts',",
      '  },',
      '}',
      '',
    ].join('\n')
    await fs.writeFile(filePath, created, 'utf-8')
    notes.push('Created nuxt.config.additions.ts with Helios defaults.')
    return notes
  }

  let updated = source

  if (!updated.includes(moduleEntry)) {
    const modulesMatch = updated.match(/modules\s*:\s*\[([\s\S]*?)\]/m)
    if (modulesMatch) {
      const full = modulesMatch[0]
      const inner = (modulesMatch[1] ?? '').trim()
      const nextInner = inner.length > 0 ? `${inner},\n    ${moduleEntry}` : moduleEntry
      updated = updated.replace(full, `modules: [\n    ${nextInner}\n  ]`)
    }
    else if (updated.includes('export default {')) {
      updated = updated.replace('export default {', `export default {\n  modules: [${moduleEntry}],`)
    }
  }

  if (!updated.includes(piniaModuleEntry)) {
    const modulesMatch = updated.match(/modules\s*:\s*\[([\s\S]*?)\]/m)
    if (modulesMatch) {
      const full = modulesMatch[0]
      const inner = (modulesMatch[1] ?? '').trim()
      const nextInner = inner.length > 0 ? `${inner},\n    ${piniaModuleEntry}` : piniaModuleEntry
      updated = updated.replace(full, `modules: [\n    ${nextInner}\n  ]`)
    }
    else if (updated.includes('export default {')) {
      updated = updated.replace('export default {', `export default {\n  modules: [${piniaModuleEntry}],`)
    }
  }

  if (!updated.includes(cssEntry)) {
    const cssMatch = updated.match(/css\s*:\s*\[([\s\S]*?)\]/m)
    if (cssMatch) {
      const full = cssMatch[0]
      const inner = (cssMatch[1] ?? '').trim()
      const nextInner = inner.length > 0 ? `${inner},\n    ${cssEntry}` : cssEntry
      updated = updated.replace(full, `css: [\n    ${nextInner}\n  ]`)
    }
    else if (updated.includes('export default {')) {
      updated = updated.replace('export default {', `export default {\n  css: [${cssEntry}],`)
    }
  }

  if (!updated.includes('preflight: true') || !updated.includes("configFile: './uno.config.ts'")) {
    if (updated.includes('unocss: {')) {
      updated = updated.replace(
        /unocss\s*:\s*\{([\s\S]*?)\}/m,
        `unocss: {\n    preflight: true,\n    nuxtLayers: true,\n    configFile: './uno.config.ts',\n  }`
      )
    }
    else if (updated.includes('export default {')) {
      updated = updated.replace(
        'export default {',
        `export default {\n  unocss: {\n    preflight: true,\n    nuxtLayers: true,\n    configFile: './uno.config.ts',\n  },`
      )
    }
  }

  if (updated !== source) {
    await fs.writeFile(filePath, updated, 'utf-8')
    notes.push('Updated nuxt.config.additions.ts with Helios defaults.')
  }

  return notes
}

const ensureUnoConfigBridge = async (rootDir: string): Promise<string[]> => {
  const notes: string[] = []
  const filePath = resolve(rootDir, 'uno.config.ts')
  const marker = "app/helios/generated/uno.generated.ts"

  let source = ''
  try {
    source = await fs.readFile(filePath, 'utf-8')
  }
  catch {
    const created = [
      "import { existsSync } from 'node:fs'",
      "import { mergeConfigs } from '@unocss/core'",
      "import base from './.nuxt/uno.config.mjs'",
      '',
      "const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)",
      "const overridesPath = new URL('./uno.overrides.config.ts', import.meta.url)",
      '',
      'let heliosGenerated: any = {}',
      'if (existsSync(heliosPath)) {',
      '  try {',
      "    const mod = await import('./app/helios/generated/uno.generated.ts')",
      '    heliosGenerated = mod.default ?? {}',
      '  } catch {',
      '    heliosGenerated = {}',
      '  }',
      '}',
      '',
      'let overrides: any = {}',
      'if (existsSync(overridesPath)) {',
      '  try {',
      "    const mod = await import('./uno.overrides.config.ts')",
      '    overrides = mod.default ?? {}',
      '  } catch {',
      '    overrides = {}',
      '  }',
      '}',
      '',
      'export default mergeConfigs([base, heliosGenerated, overrides])',
      '',
    ].join('\n')
    await fs.writeFile(filePath, created, 'utf-8')
    notes.push('Created uno.config.ts bridge for Helios generated config.')
    return notes
  }

  if (source.includes(marker)) {
    if (source.includes('globalThis._importMeta_.url')) {
      const normalized = source.replaceAll('globalThis._importMeta_.url', 'import.meta.url')
      await fs.writeFile(filePath, normalized, 'utf-8')
      notes.push('Normalized uno.config.ts import.meta bridge token.')
    }
    return notes
  }

  const mergePattern = 'mergeConfigs([base, overrides])'
  if (!source.includes(mergePattern)) {
    notes.push('Could not auto-patch uno.config.ts merge list; add Helios generated merge manually.')
    return notes
  }

  let updated = source.replace(mergePattern, 'mergeConfigs([base, heliosGenerated, overrides])')
  updated = updated.replaceAll('globalThis._importMeta_.url', 'import.meta.url')

  if (!updated.includes("const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)")) {
    const insertBlock = [
      "const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)",
      '',
      'let heliosGenerated: any = {}',
      'if (existsSync(heliosPath)) {',
      '  try {',
      "    const mod = await import('./app/helios/generated/uno.generated.ts')",
      '    heliosGenerated = mod.default ?? {}',
      '  } catch {',
      '    heliosGenerated = {}',
      '  }',
      '}',
      '',
    ].join('\n')

    const anchor = 'let overrides: any = {}'
    if (updated.includes(anchor)) {
      updated = updated.replace(anchor, `${insertBlock}${anchor}`)
    }
    else {
      notes.push('Could not find standard override block in uno.config.ts; Helios bridge block not inserted.')
    }
  }

  await fs.writeFile(filePath, updated, 'utf-8')
  notes.push('Updated uno.config.ts to include Helios generated config.')
  return notes
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const requestedConfig = normalizeConfig(body?.config, defaultConfig)
  const breakpoints = normalizeBreakpoints(body?.breakpoints, requestedConfig)
  const baseConfig = breakpoints[0]?.config ?? requestedConfig
  const rootDir = process.cwd()
  try {
    await ensureHeliosBaselineArtifacts(rootDir, { ensureConfigBridges: true })
  }
  catch (error) {
    console.warn('[helios] Unable to auto-initialize baseline artifacts from /api/helios/type/commit:', error)
  }
  const colorFragmentFile = resolve(rootDir, 'app/helios/fragments/colors.json')
  const colorSettingsFile = resolve(rootDir, 'app/helios/generated/colors.settings.json')
  const themeFragmentFile = resolve(rootDir, 'app/helios/fragments/theme.json')
  const themeSettingsFile = resolve(rootDir, 'app/helios/generated/theme.settings.json')
  const setupFragmentFile = resolve(rootDir, 'app/helios/fragments/setup.json')
  let palettes = normalizeColorPalettes(body?.colors)
  let themes = normalizeThemeSettings(body?.themes)

  if (body?.colors === undefined) {
    try {
      const savedColors = await fs.readFile(colorFragmentFile, 'utf-8')
      const savedColorsParsed = JSON.parse(savedColors)
      palettes = normalizeColorPalettes(savedColorsParsed?.palettes ?? savedColorsParsed)
    }
    catch {
      palettes = normalizeColorPalettes(null)
    }
  }

  if (body?.themes === undefined) {
    try {
      const savedThemes = await fs.readFile(themeFragmentFile, 'utf-8')
      themes = normalizeThemeSettings(JSON.parse(savedThemes))
    }
    catch {
      themes = createDefaultThemeSettings()
    }
  }

  let setup = defaultSetup
  try {
    const setupRaw = await fs.readFile(setupFragmentFile, 'utf-8')
    setup = normalizeSetup(JSON.parse(setupRaw))
  }
  catch {
    setup = defaultSetup
  }

  const fragmentFile = resolve(rootDir, 'app/helios/fragments/type.json')
  const settingsFile = resolve(rootDir, 'app/helios/generated/type.settings.json')
  const tokensScssFile = resolve(rootDir, 'app/helios/scss/_tokens.scss')
  const typeScssFile = resolve(rootDir, 'app/helios/scss/_type.scss')
  const colorsScssFile = resolve(rootDir, 'app/helios/scss/_colors.scss')
  const semanticScssFile = resolve(rootDir, 'app/helios/scss/_semantic.scss')
  const indexScssFile = resolve(rootDir, 'app/helios/scss/index.scss')
  const unoGeneratedFile = resolve(rootDir, 'app/helios/generated/uno.generated.ts')

  await ensureDir(fragmentFile)
  await ensureDir(colorFragmentFile)
  await ensureDir(themeFragmentFile)
  await ensureDir(setupFragmentFile)
  await ensureDir(settingsFile)
  await ensureDir(colorSettingsFile)
  await ensureDir(themeSettingsFile)
  await ensureDir(tokensScssFile)
  await ensureDir(typeScssFile)
  await ensureDir(colorsScssFile)
  await ensureDir(semanticScssFile)
  await ensureDir(indexScssFile)
  await ensureDir(unoGeneratedFile)

  const typePayload = {
    version: 2,
    config: baseConfig,
    breakpoints,
    colors: palettes,
    themes,
  }

  await fs.writeFile(fragmentFile, JSON.stringify(typePayload, null, 2), 'utf-8')
  await fs.writeFile(colorFragmentFile, JSON.stringify({ version: 1, palettes }, null, 2), 'utf-8')
  await fs.writeFile(themeFragmentFile, JSON.stringify(themes, null, 2), 'utf-8')
  await fs.writeFile(setupFragmentFile, JSON.stringify(setup, null, 2), 'utf-8')
  await fs.writeFile(
    settingsFile,
    JSON.stringify({ version: 2, savedAt: new Date().toISOString(), config: baseConfig, breakpoints, colors: palettes, themes }, null, 2),
    'utf-8'
  )
  await fs.writeFile(
    colorSettingsFile,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), palettes }, null, 2),
    'utf-8'
  )
  await fs.writeFile(
    themeSettingsFile,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...themes }, null, 2),
    'utf-8'
  )
  await fs.writeFile(tokensScssFile, buildTokensScss(breakpoints), 'utf-8')
  await fs.writeFile(typeScssFile, buildTypographyScss(), 'utf-8')
  await fs.writeFile(colorsScssFile, buildColorsScss(palettes), 'utf-8')
  await fs.writeFile(semanticScssFile, buildSemanticScss(themes, palettes), 'utf-8')
  await fs.writeFile(indexScssFile, buildScssEntry(), 'utf-8')
  await fs.writeFile(unoGeneratedFile, buildUnoGenerated(baseConfig, setup, breakpoints, palettes, themes), 'utf-8')

  const notes = [
    ...(await ensureHeliosNuxtAdditions(rootDir)),
    ...(await ensureHeliosUnoConfigBridge(rootDir)),
  ]

  return {
    ok: true,
    files: [
      'app/helios/fragments/type.json',
      'app/helios/fragments/colors.json',
      'app/helios/fragments/theme.json',
      'app/helios/fragments/setup.json',
      'app/helios/generated/type.settings.json',
      'app/helios/generated/colors.settings.json',
      'app/helios/generated/theme.settings.json',
      'app/helios/generated/uno.generated.ts',
      'app/helios/scss/_tokens.scss',
      'app/helios/scss/_type.scss',
      'app/helios/scss/_colors.scss',
      'app/helios/scss/_semantic.scss',
      'app/helios/scss/index.scss',
    ],
    notes,
  }
})
