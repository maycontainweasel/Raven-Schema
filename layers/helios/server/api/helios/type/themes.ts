import type { HeliosColorPalette } from './colors'

export const BG_TOKENS = [
  'canvas',
  'surface',
  'surfaceAlt',
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
] as const

export const TEXT_TOKENS = [
  'primary',
  'secondary',
  'muted',
  'inverse',
  'onPrimary',
  'onSurface',
] as const

export const BORDER_TOKENS = [
  'default',
  'muted',
  'strong',
  'primary',
] as const

type BgToken = (typeof BG_TOKENS)[number]
type TextToken = (typeof TEXT_TOKENS)[number]
type BorderToken = (typeof BORDER_TOKENS)[number]

export type HeliosSemanticThemeTokens = {
  bg: Record<BgToken, string>
  text: Record<TextToken, string>
  border: Record<BorderToken, string>
}

export type HeliosSemanticTheme = {
  id: string
  label: string
  enabled: boolean
  tokens: HeliosSemanticThemeTokens
}

export type HeliosThemeSettings = {
  activeThemeId: string
  themes: HeliosSemanticTheme[]
}

const DEFAULT_THEME: HeliosSemanticTheme = {
  id: 'default',
  label: 'Default',
  enabled: true,
  tokens: {
    bg: {
      canvas: '#ffffff',
      surface: 'palette:slate:50',
      surfaceAlt: 'palette:slate:100',
      primary: 'palette:blue:600',
      secondary: 'palette:indigo:600',
      success: 'palette:green:600',
      warning: 'palette:amber:500',
      danger: 'palette:red:600',
    },
    text: {
      primary: 'palette:slate:900',
      secondary: 'palette:slate:700',
      muted: 'palette:slate:500',
      inverse: '#ffffff',
      onPrimary: '#ffffff',
      onSurface: 'palette:slate:900',
    },
    border: {
      default: 'palette:slate:200',
      muted: 'palette:slate:100',
      strong: 'palette:slate:300',
      primary: 'palette:blue:600',
    },
  },
}

const sanitizeId = (value: unknown, fallback = 'theme') => {
  const token = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return token || fallback
}

const sanitizeLabel = (value: unknown, fallback = 'Theme') => {
  const label = String(value ?? '').trim()
  return label || fallback
}

const sanitizeSemanticValue = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw.length > 120) return ''
  if (/[[\]{};`]/.test(raw)) return ''
  return raw
}

const createDefaultTokens = (): HeliosSemanticThemeTokens => {
  return {
    bg: { ...DEFAULT_THEME.tokens.bg },
    text: { ...DEFAULT_THEME.tokens.text },
    border: { ...DEFAULT_THEME.tokens.border },
  }
}

const normalizeThemeTokens = (value: any, fallback = DEFAULT_THEME.tokens): HeliosSemanticThemeTokens => {
  const tokens = createDefaultTokens()

  for (const key of BG_TOKENS) {
    tokens.bg[key] = sanitizeSemanticValue(value?.bg?.[key]) || fallback.bg[key]
  }

  for (const key of TEXT_TOKENS) {
    tokens.text[key] = sanitizeSemanticValue(value?.text?.[key]) || fallback.text[key]
  }

  for (const key of BORDER_TOKENS) {
    tokens.border[key] = sanitizeSemanticValue(value?.border?.[key]) || fallback.border[key]
  }

  return tokens
}

export const createDefaultThemeSettings = (): HeliosThemeSettings => {
  return {
    activeThemeId: DEFAULT_THEME.id,
    themes: [{
      id: DEFAULT_THEME.id,
      label: DEFAULT_THEME.label,
      enabled: true,
      tokens: createDefaultTokens(),
    }],
  }
}

export const normalizeThemeSettings = (value: unknown): HeliosThemeSettings => {
  const defaults = createDefaultThemeSettings()
  if (!value || typeof value !== 'object') return defaults

  const rawThemes = Array.isArray((value as any).themes)
    ? (value as any).themes
    : []

  const parsed = rawThemes
    .map((theme: any, index: number) => {
      if (!theme || typeof theme !== 'object') return null
      const id = sanitizeId(theme.id ?? theme.label, `theme-${index + 1}`)
      const label = sanitizeLabel(theme.label, id)
      const enabled = typeof theme.enabled === 'boolean'
        ? theme.enabled
        : true

      return {
        id,
        label,
        enabled,
        tokens: normalizeThemeTokens(theme.tokens, DEFAULT_THEME.tokens),
      } as HeliosSemanticTheme
    })
    .filter((theme): theme is HeliosSemanticTheme => Boolean(theme))

  const themes = parsed.length > 0 ? parsed : defaults.themes
  const seen = new Set<string>()
  const deduped = themes.map((theme, index) => {
    let id = sanitizeId(theme.id, `theme-${index + 1}`)
    while (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    return { ...theme, id }
  })

  const rawActive = sanitizeId((value as any).activeThemeId, deduped[0]?.id ?? 'default')
  const activeExists = deduped.some((theme) => theme.id === rawActive)

  return {
    activeThemeId: activeExists ? rawActive : (deduped[0]?.id ?? 'default'),
    themes: deduped,
  }
}

const resolveSemanticValue = (raw: string) => {
  const value = sanitizeSemanticValue(raw)
  const paletteRef = value.match(/^palette:([a-z0-9-]+):(50|100|200|300|400|500|600|700|800|900|950)$/i)
  if (paletteRef?.[1] && paletteRef?.[2]) {
    const palette = sanitizeId(paletteRef[1], 'palette')
    const step = paletteRef[2]
    return `var(--hc-${palette}-${step})`
  }

  return value || 'transparent'
}

const appendThemeBlock = (
  lines: string[],
  selector: string,
  theme: HeliosSemanticTheme,
) => {
  lines.push(`${selector} {`)

  for (const key of BG_TOKENS) {
    lines.push(`  --hc-bg-${key}: ${resolveSemanticValue(theme.tokens.bg[key])};`)
  }

  for (const key of TEXT_TOKENS) {
    lines.push(`  --hc-text-${key}: ${resolveSemanticValue(theme.tokens.text[key])};`)
  }

  for (const key of BORDER_TOKENS) {
    lines.push(`  --hc-border-${key}: ${resolveSemanticValue(theme.tokens.border[key])};`)
  }

  lines.push('}')
  lines.push('')
}

export const buildSemanticScss = (
  settings: HeliosThemeSettings,
  _palettes: HeliosColorPalette[],
) => {
  const normalized = normalizeThemeSettings(settings)
  const activeTheme = normalized.themes.find((theme) => theme.id === normalized.activeThemeId)
    ?? normalized.themes[0]
    ?? createDefaultThemeSettings().themes[0]

  const lines: string[] = []
  appendThemeBlock(lines, ':root', activeTheme)

  for (const theme of normalized.themes) {
    if (!theme.enabled || theme.id === activeTheme.id) continue
    const themeId = sanitizeId(theme.id, 'theme')
    appendThemeBlock(lines, `[data-helios-theme='${themeId}']`, theme)
  }

  return lines.join('\n')
}

export const buildSemanticShortcuts = (_settings: HeliosThemeSettings) => {
  const shortcuts: Record<string, string> = {}

  for (const key of BG_TOKENS) {
    shortcuts[`bg-${key}`] = `bg-[var(--hc-bg-${key})]`
  }

  for (const key of TEXT_TOKENS) {
    shortcuts[`text-${key}`] = `text-[var(--hc-text-${key})]`
  }

  for (const key of BORDER_TOKENS) {
    shortcuts[`border-${key}`] = `border-[var(--hc-border-${key})]`
  }

  return shortcuts
}
