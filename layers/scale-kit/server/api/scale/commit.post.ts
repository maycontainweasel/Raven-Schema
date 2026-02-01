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
  const { tokens, ranges, settings, levels, minLevel, breakpoints } = body || {}
  if (!tokens) return { ok: false }

  const outputDir = settings?.outputDir || 'app/assets/scss/helios'
  const outputEntry = settings?.outputEntry || 'helios.scss'
  const tokensFile = settings?.tokensFile || 'app/assets/scss/helios/helios.tokens.json'
  const tokensScssFile = settings?.tokensScssFile || '_tokens.scss'
  const typographyFile = settings?.typographyFile || '_typography.scss'
  const breakpointsFile = settings?.breakpointsFile || '_breakpoints.scss'

  const rootDir = process.cwd()
  const outputPath = resolve(rootDir, outputDir)
  await fs.mkdir(outputPath, { recursive: true })

  const tokensScssPath = join(outputPath, tokensScssFile)
  const typographyScssPath = join(outputPath, typographyFile)
  const breakpointsScssPath = join(outputPath, breakpointsFile)
  const entryPath = join(outputPath, outputEntry)

  const tokensScss = buildTokensScss(tokens, ranges || [], levels || 10, minLevel ?? -5)
  const typographyScss = buildTypographyScss()
  const breakpointsScss = buildBreakpointsScss(breakpoints || [])

  await fs.writeFile(tokensScssPath, tokensScss, 'utf-8')
  await fs.writeFile(typographyScssPath, typographyScss, 'utf-8')
  await fs.writeFile(breakpointsScssPath, breakpointsScss, 'utf-8')
  await fs.writeFile(
    entryPath,
    `@use "${tokensScssFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n` +
    `@use "${typographyFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n` +
    `@use "${breakpointsFile.replace(/^_/, '').replace(/\.scss$/, '')}";\n`,
    'utf-8'
  )

  await fs.mkdir(dirname(resolve(rootDir, tokensFile)), { recursive: true })
  await fs.writeFile(resolve(rootDir, tokensFile), JSON.stringify({ tokens, ranges, settings, breakpoints: breakpoints || [] }, null, 2), 'utf-8')

  return { ok: true }
})
