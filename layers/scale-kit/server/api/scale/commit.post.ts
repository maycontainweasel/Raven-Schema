import { promises as fs } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { defineEventHandler, readBody } from 'h3'

const formatIndexString = (index: number) => {
  const sign = index < 0 ? '-' : ''
  const absoluteValue = Math.abs(index)
  if (absoluteValue % 1 === 0) return `${sign}${absoluteValue}`
  const fixed = absoluteValue.toFixed(2)
  const [intPart, fracRaw] = fixed.split('.')
  const frac = fracRaw.replace(/0+$/, '')
  const normalized = `${intPart}${frac.padEnd(2, '0')}`
  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized
  return `${sign}${padded}`
}

const buildVariableBlock = (
  tokens: any,
  levels: number,
  minLevel: number
) => {
  const lines: string[] = []
  const fontSizePercentage = (tokens.fontSize / 16) * 100
  lines.push(`  font-size: ${fontSizePercentage.toFixed(4)}%;`)
  lines.push(`  --lh: ${tokens.gridRatio};`)
  lines.push(`  --s: ${tokens.ratio};`)
  lines.push(`  --space-mode: ${tokens.spaceMode};`)
  lines.push(`  --space-sync: ${tokens.spaceSync !== false};`)

  for (let i = minLevel; i <= levels; i += 0.25) {
    const index = Number(i.toFixed(2))
    const key = formatIndexString(index)
    const size = Math.pow(tokens.ratio, index)
    const gridUnit = tokens.gridRatio * index
    const lineHeightUnit = tokens.gridRatio * (index + 1)

    let space = 0
    if (tokens.spaceSync !== false) {
      space = gridUnit
    }
    else if (index !== 0) {
      space = tokens.spaceMode === 'grid'
        ? tokens.spaceBase * index
        : tokens.spaceBase * Math.pow(tokens.spaceRatio, index)
    }

    lines.push(`  --fs-${key}: ${size}rem;`)
    lines.push(`  --v-${key}: ${gridUnit}rem;`)
    lines.push(`  --lh-${key}: ${lineHeightUnit}rem;`)
    lines.push(`  --sp-${key}: ${space}rem;`)
  }

  return lines.join('\n')
}

const buildTokensScss = (tokens: any, ranges: any[], levels: number, minLevel: number) => {
  const lines: string[] = []
  lines.push(':root {')
  lines.push(buildVariableBlock(tokens.base, levels, minLevel))
  lines.push('}')
  lines.push('')

  if (Array.isArray(ranges)) {
    for (const range of ranges) {
      const override = tokens.breakpoints?.[range.max]
      if (!override) continue
      const nextTokens = { ...tokens.base, ...override }
      lines.push(`@media (min-width: ${range.min}px) and (max-width: ${range.max}px) {`)
      lines.push('  :root {')
      lines.push(buildVariableBlock(nextTokens, levels, minLevel))
      lines.push('  }')
      lines.push('}')
      lines.push('')
    }
  }

  return lines.join('\n')
}

const buildDesignScss = (designTokens: any) => {
  if (!designTokens) return ''
  const lines: string[] = []
  const colors = designTokens.colors ?? {}
  const radius = designTokens.radius ?? {}
  const shadows = designTokens.shadows ?? {}
  const borders = designTokens.borders ?? {}
  const buttons = designTokens.buttons ?? {}
  const cards = designTokens.cards ?? {}

  const shadowBaseRaw = colors.text || '#0f172a'
  const shadowBase = shadowBaseRaw.startsWith('#') ? shadowBaseRaw : '#0f172a'
  const alphaHex = (value: number) =>
    Math.round(value * 255).toString(16).padStart(2, '0')

  lines.push(':root {')
  lines.push(`  --ds-bg: ${colors.bg || '#f4f6fb'};`)
  lines.push(`  --ds-panel: ${colors.panel || '#ffffff'};`)
  lines.push(`  --ds-panel-soft: ${colors.panelSoft || '#f8f9fc'};`)
  lines.push(`  --ds-text: ${colors.text || '#0f172a'};`)
  lines.push(`  --ds-muted: ${colors.muted || '#667085'};`)
  lines.push(`  --ds-border: ${colors.border || '#e3e7ef'};`)
  lines.push(`  --ds-accent: ${colors.accent || '#1c2b4f'};`)
  lines.push(`  --ds-accent-strong: ${colors.accentStrong || '#2858ff'};`)
  lines.push(`  --ds-accent-soft: ${colors.accentSoft || '#e7ecff'};`)
  lines.push(`  --ds-success: ${colors.success || '#19a974'};`)
  lines.push(`  --ds-warning: ${colors.warning || '#f59f00'};`)
  lines.push(`  --ds-danger: ${colors.danger || '#e03131'};`)
  lines.push(`  --ds-radius-sm: ${(radius.sm ?? 8)}px;`)
  lines.push(`  --ds-radius-md: ${(radius.md ?? 12)}px;`)
  lines.push(`  --ds-radius-lg: ${(radius.lg ?? 18)}px;`)
  lines.push(`  --ds-radius-xl: ${(radius.xl ?? 28)}px;`)
  lines.push(`  --ds-shadow-sm: 0 6px 18px ${shadowBase}${alphaHex(shadows.sm ?? 0.06)};`)
  lines.push(`  --ds-shadow-md: 0 18px 40px ${shadowBase}${alphaHex(shadows.md ?? 0.12)};`)
  lines.push(`  --ds-shadow-lg: 0 30px 70px ${shadowBase}${alphaHex(shadows.lg ?? 0.2)};`)
  lines.push(`  --ds-border-width: ${(borders.width ?? 1)}px;`)
  lines.push(`  --ds-btn-height: ${(buttons.height ?? 44)}px;`)
  lines.push(`  --ds-btn-pad-x: ${(buttons.padX ?? 20)}px;`)
  lines.push(`  --ds-btn-radius: ${(buttons.radius ?? 999)}px;`)
  lines.push(`  --ds-card-radius: ${(cards.radius ?? 20)}px;`)
  lines.push(`  --ds-card-border: ${(cards.border ?? 1)}px;`)
  lines.push('}')
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
    '',
    'ul, ol {',
    '  margin: 0;',
    '  padding-left: var(--v-1);',
    '}',
  ].join('\n')
}

const buildBreakpointsScss = (breakpoints: Array<{ key: string; value: string }>) => {
  const lines: string[] = []
  lines.push('@theme {')
  for (const bp of breakpoints) {
    if (!bp.key || !bp.value) continue
    lines.push(`  --breakpoint-${bp.key}: ${bp.value};`)
  }
  lines.push('}')
  return lines.join('\n')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tokens, ranges, settings, levels, minLevel, breakpoints, designTokens } = body || {}
  if (!tokens) return { ok: false }

  const outputDir = settings?.outputDir || 'app/assets/scss/helios'
  const outputEntry = settings?.outputEntry || 'helios.scss'
  const tokensFile = settings?.tokensFile || 'app/assets/scss/helios/helios.tokens.json'
  const tokensScssFile = settings?.tokensScssFile || '_tokens.scss'
  const typographyFile = settings?.typographyFile || '_typography.scss'
  const breakpointsFile = settings?.breakpointsFile || '_breakpoints.scss'
  const designFile = settings?.designFile || '_design-system.scss'

  const rootDir = process.cwd()
  const outputPath = resolve(rootDir, outputDir)
  await fs.mkdir(outputPath, { recursive: true })

  const tokensScssPath = join(outputPath, tokensScssFile)
  const typographyScssPath = join(outputPath, typographyFile)
  const breakpointsScssPath = join(outputPath, breakpointsFile)
  const designScssPath = join(outputPath, designFile)
  const entryPath = join(outputPath, outputEntry)

  const tokensScss = buildTokensScss(tokens, ranges || [], levels || 10, minLevel ?? -5)
  const typographyScss = buildTypographyScss()
  const breakpointsScss = buildBreakpointsScss(breakpoints || [])
  const designScss = buildDesignScss(designTokens)

  await fs.writeFile(tokensScssPath, tokensScss, 'utf-8')
  await fs.writeFile(typographyScssPath, typographyScss, 'utf-8')
  await fs.writeFile(breakpointsScssPath, breakpointsScss, 'utf-8')
  await fs.writeFile(designScssPath, designScss, 'utf-8')
  await fs.writeFile(
    entryPath,
    `@use "${tokensScssFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n` +
    `@use "${typographyFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n` +
    `@use "${breakpointsFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n` +
    `@use "${designFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n`,
    'utf-8'
  )

  await fs.mkdir(dirname(resolve(rootDir, tokensFile)), { recursive: true })
  await fs.writeFile(
    resolve(rootDir, tokensFile),
    JSON.stringify({ tokens, ranges, settings, breakpoints: breakpoints || [], designTokens }, null, 2),
    'utf-8'
  )

  return { ok: true }
})
