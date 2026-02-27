import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { buildColorsScss, createDefaultColorPalettes } from './colors'
import { buildSemanticScss, createDefaultThemeSettings } from './themes'

export type HeliosTypeConfig = {
  baseFontPx: number
  typeRatio: number
  gridRatio: number
  spaceRatio: number
  minStep: number
  maxStep: number
  step: number
  brandColor: string
}

export type HeliosBreakpointConfig = {
  id: string
  label: string
  minWidth: number
  maxWidth: number | null
  config: HeliosTypeConfig
}

export type HeliosSetupConfig = {
  attributify: boolean
  icons: boolean
  iconCollection: string
  variantGroup: boolean
}

export const HELIOS_DEFAULT_CONFIG: HeliosTypeConfig = {
  baseFontPx: 16,
  typeRatio: 1.2,
  gridRatio: 1.4,
  spaceRatio: 1.25,
  minStep: -2,
  maxStep: 6,
  step: 0.25,
  brandColor: '#2858ff',
}

const DEFAULT_BREAKPOINTS: Array<Omit<HeliosBreakpointConfig, 'config'>> = [
  { id: 'mobile', label: 'Mobile', minWidth: 0, maxWidth: 500 },
  { id: 'tablet', label: 'Tablet', minWidth: 500, maxWidth: 1024 },
  { id: 'laptop', label: 'Laptop', minWidth: 1024, maxWidth: 1366 },
  { id: 'desktop', label: 'Desktop', minWidth: 1366, maxWidth: null },
]

export const HELIOS_DEFAULT_SETUP: HeliosSetupConfig = {
  attributify: true,
  icons: true,
  iconCollection: 'lucide',
  variantGroup: true,
}

export type HeliosBaselineResult = {
  created: string[]
  notes: string[]
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
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

const createDefaultBreakpoints = (config: HeliosTypeConfig): HeliosBreakpointConfig[] => {
  return DEFAULT_BREAKPOINTS.map((entry) => ({
    ...entry,
    config: { ...config },
  }))
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
  const base = sorted[0] ?? createDefaultBreakpoints(HELIOS_DEFAULT_CONFIG)[0]!

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

const buildBaselineUnoGenerated = (
  config: HeliosTypeConfig,
  breakpoints: HeliosBreakpointConfig[],
) => {
  const sorted = [...breakpoints].sort((a, b) => a.minWidth - b.minWidth)
  const generatedBreakpoints = sorted
    .filter((entry) => entry.minWidth > 0)
    .reduce<Record<string, string>>((acc, entry, index) => {
      const key = sanitizeThemeKey(entry.id, `bp_${index + 1}`)
      acc[key] = `${Math.round(entry.minWidth)}px`
      return acc
    }, {})
  const heliosBreakpoints = Object.keys(generatedBreakpoints).length > 0
    ? generatedBreakpoints
    : { md: '768px' }

  return [
    "import { defineConfig } from 'unocss'",
    '',
    `const heliosBreakpoints = ${JSON.stringify(heliosBreakpoints)}`,
    '',
    'export default defineConfig({',
    '  theme: {',
    '    breakpoints: heliosBreakpoints,',
    '    colors: {',
    `      heliosbrand: '${config.brandColor}',`,
    "      brand: 'var(--ds-brand, #2858ff)',",
    "      ink: 'var(--ds-text, #0f172a)',",
    '    },',
    '  },',
    '})',
    '',
  ].join('\n')
}

const createUnoConfigTemplate = () => {
  return [
    "import { mergeConfigs } from '@unocss/core'",
    "import { existsSync } from 'node:fs'",
    '',
    "const overridesPath = new URL('./uno.overrides.config.ts', import.meta.url)",
    "const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)",
    '',
    'let base: any = {}',
    'try {',
    "  const mod = await import('./.nuxt/uno.config.mjs')",
    '  base = (mod as any).default ?? mod',
    '} catch {',
    '  base = {}',
    '}',
    '',
    'let heliosGenerated: any = {}',
    'if (existsSync(heliosPath)) {',
    '  try {',
    "    const mod = await import('./app/helios/generated/uno.generated.ts')",
    '    heliosGenerated = (mod as any).default ?? {}',
    '  } catch {',
    '    heliosGenerated = {}',
    '  }',
    '}',
    '',
    'let overrides: any = {}',
    'if (existsSync(overridesPath)) {',
    '  try {',
    "    const mod = await import('./uno.overrides.config.ts')",
    '    overrides = (mod as any).default ?? {}',
    '  } catch {',
    '    overrides = {}',
    '  }',
    '}',
    '',
    'export default mergeConfigs([base, heliosGenerated, overrides])',
    '',
  ].join('\n')
}

const ensureExistsSyncImport = (source: string) => {
  if (source.includes("from 'node:fs'") && source.includes('existsSync')) return source
  const importLine = "import { existsSync } from 'node:fs'\n"
  if (source.startsWith('import ')) {
    return source.replace(/^(import[^\n]*\n)/, `$1${importLine}`)
  }
  return `${importLine}${source}`
}

const ensureDynamicBaseImport = (source: string) => {
  let updated = source.replace(
    /import\s+base\s+from\s+['"]\.\/\.nuxt\/uno\.config\.mjs['"]\s*\n?/m,
    '',
  )
  const hasBaseBlock = updated.includes('let base: any = {}')
  if (!hasBaseBlock) {
    const baseBlock = [
      'let base: any = {}',
      'try {',
      "  const mod = await import('./.nuxt/uno.config.mjs')",
      '  base = (mod as any).default ?? mod',
      '} catch {',
      '  base = {}',
      '}',
      '',
    ].join('\n')
    if (updated.includes('let heliosGenerated: any = {}')) {
      updated = updated.replace('let heliosGenerated: any = {}', `${baseBlock}let heliosGenerated: any = {}`)
    } else if (updated.includes('let overrides: any = {}')) {
      updated = updated.replace('let overrides: any = {}', `${baseBlock}let overrides: any = {}`)
    } else if (updated.includes('export default')) {
      updated = updated.replace('export default', `${baseBlock}export default`)
    } else {
      updated = `${updated.trimEnd()}\n\n${baseBlock}`
    }
  }
  return updated
}

const ensureHeliosGeneratedMerge = (source: string) => {
  if (source.includes('heliosGenerated')) return source

  let updated = source
  if (!updated.includes("const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)")) {
    const block = [
      "const heliosPath = new URL('./app/helios/generated/uno.generated.ts', import.meta.url)",
      '',
      'let heliosGenerated: any = {}',
      'if (existsSync(heliosPath)) {',
      '  try {',
      "    const mod = await import('./app/helios/generated/uno.generated.ts')",
      '    heliosGenerated = (mod as any).default ?? {}',
      '  } catch {',
      '    heliosGenerated = {}',
      '  }',
      '}',
      '',
    ].join('\n')
    if (updated.includes('let overrides: any = {}')) {
      updated = updated.replace('let overrides: any = {}', `${block}let overrides: any = {}`)
    } else if (updated.includes('export default')) {
      updated = updated.replace('export default', `${block}export default`)
    } else {
      updated = `${updated.trimEnd()}\n\n${block}`
    }
  }

  updated = updated.replace(
    /mergeConfigs\(\[([\s\S]*?)\]\)/m,
    (_full, inner: string) => {
      const parts = inner
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      if (parts.includes('heliosGenerated')) {
        return `mergeConfigs([${parts.join(', ')}])`
      }
      const overridesIndex = parts.findIndex((entry) => entry === 'overrides')
      if (overridesIndex >= 0) {
        parts.splice(overridesIndex, 0, 'heliosGenerated')
      } else {
        parts.push('heliosGenerated')
      }
      return `mergeConfigs([${parts.join(', ')}])`
    },
  )

  return updated
}

export const ensureNuxtAdditions = async (rootDir: string): Promise<string[]> => {
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
    } else if (updated.includes('export default {')) {
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
    } else if (updated.includes('export default {')) {
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
    } else if (updated.includes('export default {')) {
      updated = updated.replace('export default {', `export default {\n  css: [${cssEntry}],`)
    }
  }

  if (!updated.includes('preflight: true') || !updated.includes("configFile: './uno.config.ts'")) {
    if (updated.includes('unocss: {')) {
      updated = updated.replace(
        /unocss\s*:\s*\{([\s\S]*?)\}/m,
        `unocss: {\n    preflight: true,\n    nuxtLayers: true,\n    configFile: './uno.config.ts',\n  }`,
      )
    } else if (updated.includes('export default {')) {
      updated = updated.replace(
        'export default {',
        `export default {\n  unocss: {\n    preflight: true,\n    nuxtLayers: true,\n    configFile: './uno.config.ts',\n  },`,
      )
    }
  }

  if (updated !== source) {
    await fs.writeFile(filePath, updated, 'utf-8')
    notes.push('Updated nuxt.config.additions.ts with Helios defaults.')
  }

  return notes
}

export const ensureUnoConfigBridge = async (rootDir: string): Promise<string[]> => {
  const notes: string[] = []
  const filePath = resolve(rootDir, 'uno.config.ts')
  const marker = "app/helios/generated/uno.generated.ts"

  let source = ''
  try {
    source = await fs.readFile(filePath, 'utf-8')
  }
  catch {
    await fs.writeFile(filePath, createUnoConfigTemplate(), 'utf-8')
    notes.push('Created uno.config.ts bridge for Helios generated config.')
    return notes
  }

  let updated = source.replaceAll('globalThis._importMeta_.url', 'import.meta.url')
  updated = ensureExistsSyncImport(updated)
  updated = ensureDynamicBaseImport(updated)
  updated = ensureHeliosGeneratedMerge(updated)

  if (!updated.includes(marker)) {
    notes.push('Could not auto-confirm Helios merge marker in uno.config.ts; verify generated merge manually.')
  }

  if (updated !== source) {
    await fs.writeFile(filePath, updated, 'utf-8')
    notes.push('Updated uno.config.ts to use resilient Helios merge bridge.')
  }

  return notes
}

export const ensureHeliosBaselineArtifacts = async (
  rootDir: string,
  options?: { ensureConfigBridges?: boolean },
): Promise<HeliosBaselineResult> => {
  const created: string[] = []
  const notes: string[] = []
  const shouldBridge = options?.ensureConfigBridges !== false

  const defaultConfig = { ...HELIOS_DEFAULT_CONFIG }
  const breakpoints = createDefaultBreakpoints(defaultConfig)
  const palettes = createDefaultColorPalettes()
  const themes = createDefaultThemeSettings()

  const files = {
    setupFragment: resolve(rootDir, 'app/helios/fragments/setup.json'),
    typeFragment: resolve(rootDir, 'app/helios/fragments/type.json'),
    colorFragment: resolve(rootDir, 'app/helios/fragments/colors.json'),
    themeFragment: resolve(rootDir, 'app/helios/fragments/theme.json'),
    typeSettings: resolve(rootDir, 'app/helios/generated/type.settings.json'),
    colorSettings: resolve(rootDir, 'app/helios/generated/colors.settings.json'),
    themeSettings: resolve(rootDir, 'app/helios/generated/theme.settings.json'),
    unoGenerated: resolve(rootDir, 'app/helios/generated/uno.generated.ts'),
    tokensScss: resolve(rootDir, 'app/helios/scss/_tokens.scss'),
    typeScss: resolve(rootDir, 'app/helios/scss/_type.scss'),
    colorsScss: resolve(rootDir, 'app/helios/scss/_colors.scss'),
    semanticScss: resolve(rootDir, 'app/helios/scss/_semantic.scss'),
    indexScss: resolve(rootDir, 'app/helios/scss/index.scss'),
  }

  const writeIfMissing = async (filePath: string, content: string) => {
    if (await fileExists(filePath)) return
    await ensureDir(filePath)
    await fs.writeFile(filePath, content, 'utf-8')
    created.push(filePath.replace(`${rootDir}/`, ''))
  }

  await writeIfMissing(files.setupFragment, JSON.stringify(HELIOS_DEFAULT_SETUP, null, 2))

  const typePayload = {
    version: 2,
    config: defaultConfig,
    breakpoints,
    colors: palettes,
    themes,
  }
  await writeIfMissing(files.typeFragment, JSON.stringify(typePayload, null, 2))
  await writeIfMissing(files.colorFragment, JSON.stringify({ version: 1, palettes }, null, 2))
  await writeIfMissing(files.themeFragment, JSON.stringify(themes, null, 2))

  await writeIfMissing(
    files.typeSettings,
    JSON.stringify({ version: 2, savedAt: new Date().toISOString(), ...typePayload }, null, 2),
  )
  await writeIfMissing(
    files.colorSettings,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), palettes }, null, 2),
  )
  await writeIfMissing(
    files.themeSettings,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), ...themes }, null, 2),
  )

  await writeIfMissing(files.tokensScss, buildTokensScss(breakpoints))
  await writeIfMissing(files.typeScss, buildTypographyScss())
  await writeIfMissing(files.colorsScss, buildColorsScss(palettes))
  await writeIfMissing(files.semanticScss, buildSemanticScss(themes, palettes))
  await writeIfMissing(files.indexScss, buildScssEntry())
  await writeIfMissing(files.unoGenerated, buildBaselineUnoGenerated(defaultConfig, breakpoints))

  if (shouldBridge) {
    notes.push(...(await ensureNuxtAdditions(rootDir)))
    notes.push(...(await ensureUnoConfigBridge(rootDir)))
  }

  return { created, notes }
}
