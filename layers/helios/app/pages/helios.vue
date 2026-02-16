<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { useHeliosManagerStore } from '../stores/heliosManager'


definePageMeta({
  ssr: false,
  layout: "helios"
});

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

type BreakpointDraft = {
  sourceId: string | null
  label: string
  minWidth: string
  maxWidth: string
}

type HeliosColorStep = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950'

type HeliosColorSteps = Record<HeliosColorStep, string>

type HeliosColorEnabledSteps = Record<HeliosColorStep, boolean>

type HeliosColorPalette = {
  id: string
  label: string
  enabled: boolean
  steps: HeliosColorSteps
  enabledSteps: HeliosColorEnabledSteps
  custom?: boolean
}

type ActiveColorCell = {
  paletteId: string
  step: HeliosColorStep
}

type HeliosThemeBgToken =
  | 'canvas'
  | 'surface'
  | 'surfaceAlt'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'

type HeliosThemeTextToken =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'onPrimary'
  | 'onSurface'

type HeliosThemeBorderToken =
  | 'default'
  | 'muted'
  | 'strong'
  | 'primary'

type HeliosSemanticThemeTokens = {
  bg: Record<HeliosThemeBgToken, string>
  text: Record<HeliosThemeTextToken, string>
  border: Record<HeliosThemeBorderToken, string>
}

type HeliosSemanticTheme = {
  id: string
  label: string
  enabled: boolean
  tokens: HeliosSemanticThemeTokens
}

type HeliosThemeSettings = {
  activeThemeId: string
  themes: HeliosSemanticTheme[]
}

type PanelId =
  | 'typography'
  | 'spacing'
  | 'colors'
  | 'themes'
  | 'design'
  | 'components'
  | 'utilities'
  | 'breakpoints'
  | 'settings'

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

const colorSteps: HeliosColorStep[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
const bgThemeTokens: HeliosThemeBgToken[] = ['canvas', 'surface', 'surfaceAlt', 'primary', 'secondary', 'success', 'warning', 'danger']
const textThemeTokens: HeliosThemeTextToken[] = ['primary', 'secondary', 'muted', 'inverse', 'onPrimary', 'onSurface']
const borderThemeTokens: HeliosThemeBorderToken[] = ['default', 'muted', 'strong', 'primary']

const panelItems: Array<{ id: PanelId; label: string }> = [
  { id: 'typography', label: 'Typography' },
  { id: 'spacing', label: 'Spacing' },
  { id: 'colors', label: 'Colors' },
  { id: 'themes', label: 'Themes' },
  { id: 'design', label: 'Design system' },
  { id: 'components', label: 'Components' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'breakpoints', label: 'Breakpoints' },
  { id: 'settings', label: 'Settings' },
]

const sanitizeId = (value: unknown, fallback = 'breakpoint') => {
  const token = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return token || fallback
}

const sanitizeConfig = (value: Partial<HeliosTypeConfig> | null | undefined, fallback = defaultConfig): HeliosTypeConfig => {
  const safe = {
    baseFontPx: Number(value?.baseFontPx ?? fallback.baseFontPx),
    typeRatio: Number(value?.typeRatio ?? fallback.typeRatio),
    gridRatio: Number(value?.gridRatio ?? fallback.gridRatio),
    spaceRatio: Number(value?.spaceRatio ?? fallback.spaceRatio),
    minStep: Number(value?.minStep ?? fallback.minStep),
    maxStep: Number(value?.maxStep ?? fallback.maxStep),
    step: Number(value?.step ?? fallback.step),
    brandColor: String(value?.brandColor ?? fallback.brandColor),
  }

  if (!Number.isFinite(safe.baseFontPx) || safe.baseFontPx < 8) safe.baseFontPx = fallback.baseFontPx
  if (!Number.isFinite(safe.typeRatio) || safe.typeRatio <= 1) safe.typeRatio = fallback.typeRatio
  if (!Number.isFinite(safe.gridRatio) || safe.gridRatio <= 0.5) safe.gridRatio = fallback.gridRatio
  if (!Number.isFinite(safe.spaceRatio) || safe.spaceRatio <= 1) safe.spaceRatio = fallback.spaceRatio
  if (!Number.isFinite(safe.minStep)) safe.minStep = fallback.minStep
  if (!Number.isFinite(safe.maxStep)) safe.maxStep = fallback.maxStep
  if (safe.maxStep <= safe.minStep) {
    safe.minStep = fallback.minStep
    safe.maxStep = fallback.maxStep
  }
  if (!Number.isFinite(safe.step) || safe.step <= 0) safe.step = fallback.step

  const rawBrand = safe.brandColor.trim()
  safe.brandColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawBrand)
    ? rawBrand
    : fallback.brandColor

  return safe
}

const createDefaultBreakpoints = (baseConfig: HeliosTypeConfig): HeliosBreakpointConfig[] => {
  return defaultBreakpointRanges.map((entry) => ({
    id: entry.id,
    label: entry.label,
    minWidth: entry.minWidth,
    maxWidth: entry.maxWidth,
    config: sanitizeConfig(baseConfig, baseConfig),
  }))
}

const normalizeBreakpoints = (
  value: unknown,
  baseConfig: HeliosTypeConfig
): HeliosBreakpointConfig[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return createDefaultBreakpoints(baseConfig)
  }

  const normalized = value
    .map((entry: any, index) => {
      if (!entry || typeof entry !== 'object') return null
      const fallback = defaultBreakpointRanges[index] ?? defaultBreakpointRanges[defaultBreakpointRanges.length - 1]
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
        config: sanitizeConfig(entry.config, baseConfig),
      } as HeliosBreakpointConfig
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

const createEmptyColorSteps = (fill = ''): HeliosColorSteps => {
  return Object.fromEntries(colorSteps.map((step) => [step, fill])) as HeliosColorSteps
}

const createEmptyEnabledSteps = (fill = false): HeliosColorEnabledSteps => {
  return Object.fromEntries(colorSteps.map((step) => [step, fill])) as HeliosColorEnabledSteps
}

const sanitizeColorValue = (value: unknown) => {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (raw.length > 120) return ''
  if (/[[\]{};`]/.test(raw)) return ''
  return raw
}

const normalizeColorPalettes = (value: unknown): HeliosColorPalette[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return []
  }

  const parsed = value
    .map((entry: any, index) => {
      if (!entry || typeof entry !== 'object') return null
      const id = sanitizeId(entry.id ?? entry.label, `palette-${index + 1}`)
      const label = String(entry.label ?? id).trim() || id
      const steps = createEmptyColorSteps('')
      const enabledSteps = createEmptyEnabledSteps(false)

      for (const step of colorSteps) {
        steps[step] = sanitizeColorValue(entry?.steps?.[step])
        const explicit = entry?.enabledSteps?.[step]
        enabledSteps[step] = typeof explicit === 'boolean'
          ? explicit
          : Boolean(steps[step])
      }

      const enabled = typeof entry.enabled === 'boolean'
        ? entry.enabled
        : true

      return {
        id,
        label,
        enabled,
        custom: entry.custom === true,
        steps,
        enabledSteps,
      } as HeliosColorPalette
    })
    .filter((entry): entry is HeliosColorPalette => Boolean(entry))

  const seen = new Set<string>()
  const deduped = parsed.map((palette, index) => {
    let id = sanitizeId(palette.id, `palette-${index + 1}`)
    while (seen.has(id)) id = `${id}-${index + 1}`
    seen.add(id)
    return { ...palette, id }
  })

  return deduped
}

const createDefaultThemeSettings = (): HeliosThemeSettings => {
  return {
    activeThemeId: 'default',
    themes: [
      {
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
      },
    ],
  }
}

const normalizeThemeSettings = (value: unknown): HeliosThemeSettings => {
  const defaults = createDefaultThemeSettings()
  if (!value || typeof value !== 'object') return defaults

  const rawThemes = Array.isArray((value as any).themes) ? (value as any).themes : []
  const parsed = rawThemes
    .map((theme: any, index) => {
      if (!theme || typeof theme !== 'object') return null
      const id = sanitizeId(theme.id ?? theme.label, `theme-${index + 1}`)
      const label = String(theme.label ?? id).trim() || id
      const enabled = typeof theme.enabled === 'boolean' ? theme.enabled : true
      const fallback = defaults.themes[0]!.tokens

      const next: HeliosSemanticTheme = {
        id,
        label,
        enabled,
        tokens: {
          bg: { ...fallback.bg },
          text: { ...fallback.text },
          border: { ...fallback.border },
        },
      }

      for (const token of bgThemeTokens) {
        next.tokens.bg[token] = sanitizeColorValue(theme?.tokens?.bg?.[token]) || fallback.bg[token]
      }
      for (const token of textThemeTokens) {
        next.tokens.text[token] = sanitizeColorValue(theme?.tokens?.text?.[token]) || fallback.text[token]
      }
      for (const token of borderThemeTokens) {
        next.tokens.border[token] = sanitizeColorValue(theme?.tokens?.border?.[token]) || fallback.border[token]
      }

      return next
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

  const activeCandidate = sanitizeId((value as any).activeThemeId, deduped[0]?.id ?? 'default')
  const activeExists = deduped.some((theme) => theme.id === activeCandidate)

  return {
    activeThemeId: activeExists ? activeCandidate : (deduped[0]?.id ?? 'default'),
    themes: deduped,
  }
}

const heliosManagerStore = useHeliosManagerStore()
const {
  breakpoints,
  loading,
  committing,
  status,
  colorPalettes,
  themeSettings,
} = storeToRefs(heliosManagerStore)

if (breakpoints.value.length === 0) {
  breakpoints.value = createDefaultBreakpoints(defaultConfig)
}
if (themeSettings.value.themes.length === 0) {
  themeSettings.value = createDefaultThemeSettings()
}

const activePanel = ref<PanelId>('typography')
const activeBreakpointId = ref('mobile')
const controlsExpanded = ref(false)
const sample = ref('The quick brown fox jumps over the lazy dog')

const breakpointManagerOpen = ref(false)
const breakpointDraftError = ref('')
const breakpointDrafts = ref<BreakpointDraft[]>([])
const activeColorCell = ref<ActiveColorCell | null>(null)

const sortedBreakpoints = computed(() => {
  return [...breakpoints.value].sort((a, b) => a.minWidth - b.minWidth)
})

const activeColorPalette = computed(() => {
  const cell = activeColorCell.value
  if (!cell) return null
  return colorPalettes.value.find((palette) => palette.id === cell.paletteId) ?? null
})

const activeColorValue = computed({
  get: () => {
    const palette = activeColorPalette.value
    const step = activeColorCell.value?.step
    if (!palette || !step) return ''
    return palette.steps[step] ?? ''
  },
  set: (next) => {
    const palette = activeColorPalette.value
    const step = activeColorCell.value?.step
    if (!palette || !step) return
    const cleaned = sanitizeColorValue(next)
    palette.steps[step] = cleaned
    if (cleaned) {
      palette.enabled = true
      palette.enabledSteps[step] = true
    }
  },
})

const activeColorHex = computed(() => {
  const raw = activeColorValue.value.trim()
  const shortHex = raw.match(/^#([0-9a-fA-F]{3})$/)
  if (shortHex?.[1]) {
    const [r, g, b] = shortHex[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const fullHex = raw.match(/^#([0-9a-fA-F]{6})$/)
  return fullHex?.[0]?.toLowerCase() ?? '#000000'
})

const activeTheme = computed(() => {
  const themes = themeSettings.value.themes
  const current = themes.find((theme) => theme.id === themeSettings.value.activeThemeId)
  return current ?? themes[0] ?? null
})

const paletteOptionItems = computed(() => {
  const options: Array<{ label: string; value: string }> = []
  for (const palette of colorPalettes.value) {
    for (const step of colorSteps) {
      const color = palette.steps[step]
      if (!color) continue
      options.push({
        label: `${palette.label} ${step}`,
        value: `palette:${palette.id}:${step}`,
      })
    }
  }
  return options
})

const fallbackBreakpoint = createDefaultBreakpoints(defaultConfig)[0]

const activeBreakpoint = computed<HeliosBreakpointConfig>(() => {
  const found = breakpoints.value.find((item) => item.id === activeBreakpointId.value)
  return found ?? breakpoints.value[0] ?? fallbackBreakpoint
})

const activeConfig = computed(() => activeBreakpoint.value.config)

const currentBreakpointLabel = computed(() => {
  const target = activeBreakpoint.value
  if (!target) return ''
  if (target.maxWidth === null) return `${target.label} (${target.minWidth}px+)`
  return `${target.label} (${target.minWidth}px-${target.maxWidth}px)`
})

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

const scaleSteps = computed(() => {
  const cfg = sanitizeConfig(activeConfig.value, defaultConfig)
  const out: number[] = []
  for (let step = cfg.maxStep; step >= cfg.minStep - 1e-9; step -= cfg.step) {
    out.push(Number(step.toFixed(2)))
    if (out.length >= 200) break
  }
  const min = Number(cfg.minStep.toFixed(2))
  if (out.length === 0 || out[out.length - 1] !== min) out.push(min)
  return out
})

const rows = computed(() => {
  const cfg = sanitizeConfig(activeConfig.value, defaultConfig)
  return scaleSteps.value.map((step) => {
    const rem = Math.pow(cfg.typeRatio, step)
    const px = rem * cfg.baseFontPx
    return {
      step,
      key: formatScaleKey(step),
      className: `f-${formatScaleKey(step)} lh-0`,
      rem: `${rem.toFixed(4)}rem`,
      px: `${px.toFixed(2)}px`,
      sizeCss: `${rem.toFixed(4)}rem`,
    }
  })
})

const spacingRows = computed(() => {
  const cfg = sanitizeConfig(activeConfig.value, defaultConfig)
  return scaleSteps.value.map((step) => {
    const rem = Math.pow(cfg.spaceRatio, step)
    return {
      step,
      key: formatScaleKey(step),
      className: `sp-${formatScaleKey(step)} sm-${formatScaleKey(step)} sg-${formatScaleKey(step)}`,
      rem: `${rem.toFixed(4)}rem`,
      px: `${(rem * cfg.baseFontPx).toFixed(2)}px`,
      gridRem: `${(cfg.gridRatio * step).toFixed(4)}rem`,
    }
  })
})

const formatRange = (breakpoint: HeliosBreakpointConfig) => {
  if (breakpoint.maxWidth === null) return `${breakpoint.minWidth}px+`
  return `${breakpoint.minWidth}px-${breakpoint.maxWidth}px`
}

const mapBreakpointToDraft = (breakpoint: HeliosBreakpointConfig): BreakpointDraft => {
  return {
    sourceId: breakpoint.id,
    label: breakpoint.label,
    minWidth: String(breakpoint.minWidth),
    maxWidth: breakpoint.maxWidth === null ? '' : String(breakpoint.maxWidth),
  }
}

const openBreakpointManager = () => {
  breakpointDrafts.value = sortedBreakpoints.value.map(mapBreakpointToDraft)
  breakpointDraftError.value = ''
  breakpointManagerOpen.value = true
}

const closeBreakpointManager = () => {
  breakpointManagerOpen.value = false
  breakpointDraftError.value = ''
}

const addBreakpointDraft = () => {
  const last = breakpointDrafts.value[breakpointDrafts.value.length - 1]
  const lastMax = Number(last?.maxWidth)
  const lastMin = Number(last?.minWidth)
  const fallbackMin = Number.isFinite(lastMax)
    ? Math.round(lastMax)
    : Number.isFinite(lastMin)
      ? Math.round(lastMin + 320)
      : 768
  const minWidth = Math.max(1, fallbackMin)
  breakpointDrafts.value.push({
    sourceId: null,
    label: `Breakpoint ${breakpointDrafts.value.length + 1}`,
    minWidth: String(minWidth),
    maxWidth: String(minWidth + 320),
  })
}

const removeBreakpointDraft = (index: number) => {
  if (breakpointDrafts.value.length <= 1) return
  breakpointDrafts.value.splice(index, 1)
}

const saveBreakpointDrafts = () => {
  const parsed = breakpointDrafts.value
    .map((draft, index) => {
      const label = draft.label.trim() || `Breakpoint ${index + 1}`
      const minRaw = Number(draft.minWidth)
      const maxRaw = draft.maxWidth.trim() === '' ? null : Number(draft.maxWidth)

      return {
        sourceId: draft.sourceId,
        label,
        minWidth: Number.isFinite(minRaw) && minRaw >= 0 ? Math.round(minRaw) : index * 320,
        maxWidth: maxRaw === null
          ? null
          : Number.isFinite(maxRaw)
            ? Math.round(maxRaw)
            : null,
      }
    })
    .filter((entry) => entry.label.length > 0)

  if (parsed.length === 0) {
    breakpointDraftError.value = 'Add at least one breakpoint before saving.'
    return
  }

  parsed.sort((a, b) => a.minWidth - b.minWidth)
  if (parsed[0]) parsed[0].minWidth = 0

  for (let index = 1; index < parsed.length; index += 1) {
    const prev = parsed[index - 1]
    const current = parsed[index]
    if (!prev || !current) continue
    const minimumAllowed = prev.minWidth + 1
    if (current.minWidth < minimumAllowed) current.minWidth = minimumAllowed
  }

  for (let index = 0; index < parsed.length; index += 1) {
    const current = parsed[index]
    if (!current) continue
    if (current.maxWidth !== null && current.maxWidth <= current.minWidth) current.maxWidth = null
    const next = parsed[index + 1]
    if (!next) continue
    if (current.maxWidth === null || current.maxWidth > next.minWidth) {
      current.maxWidth = next.minWidth
    }
  }

  const existingConfigMap = new Map(
    breakpoints.value.map((breakpoint) => [breakpoint.id, sanitizeConfig(breakpoint.config, defaultConfig)])
  )

  const active = sanitizeConfig(activeConfig.value, defaultConfig)
  const usedIds = new Set<string>()
  const nextBreakpoints = parsed.map((entry, index) => {
    const fallbackId = entry.sourceId ?? `breakpoint-${index + 1}`
    const seed = sanitizeId(entry.label, fallbackId)
    let id = seed
    let suffix = 2
    while (usedIds.has(id)) {
      id = `${seed}-${suffix}`
      suffix += 1
    }
    usedIds.add(id)

    const sourceConfig = entry.sourceId ? existingConfigMap.get(entry.sourceId) : null

    return {
      id,
      label: entry.label,
      minWidth: entry.minWidth,
      maxWidth: entry.maxWidth,
      config: sanitizeConfig(sourceConfig ?? active, active),
    } satisfies HeliosBreakpointConfig
  })

  const normalized = normalizeBreakpoints(nextBreakpoints, active)
  breakpoints.value = normalized

  if (!normalized.find((entry) => entry.id === activeBreakpointId.value)) {
    activeBreakpointId.value = normalized[0]?.id ?? 'mobile'
  }

  closeBreakpointManager()
}

const hasEnabledSteps = (palette: HeliosColorPalette) => {
  return colorSteps.some((step) => palette.enabledSteps[step])
}

const selectColorCell = (paletteId: string, step: HeliosColorStep) => {
  activeColorCell.value = { paletteId, step }
}

const togglePaletteEnabled = (palette: HeliosColorPalette) => {
  palette.enabled = !palette.enabled
  if (!palette.enabled) {
    for (const step of colorSteps) {
      palette.enabledSteps[step] = false
    }
    return
  }

  if (!hasEnabledSteps(palette)) {
    const fallbackStep = (colorSteps.find((step) => Boolean(palette.steps[step])) ?? '500') as HeliosColorStep
    palette.enabledSteps[fallbackStep] = true
  }
}

const togglePaletteStep = (palette: HeliosColorPalette, step: HeliosColorStep) => {
  if (!palette.enabled) palette.enabled = true
  palette.enabledSteps[step] = !palette.enabledSteps[step]
}

const addCustomPalette = () => {
  const existing = new Set(colorPalettes.value.map((palette) => palette.id))
  let index = colorPalettes.value.filter((palette) => palette.custom).length + 1
  let id = `custom-${index}`
  while (existing.has(id)) {
    index += 1
    id = `custom-${index}`
  }

  const palette: HeliosColorPalette = {
    id,
    label: `Custom ${index}`,
    enabled: true,
    custom: true,
    steps: createEmptyColorSteps(''),
    enabledSteps: createEmptyEnabledSteps(false),
  }

  colorPalettes.value.push(palette)
  activeColorCell.value = { paletteId: palette.id, step: '500' }
}

const removeCustomPalette = (paletteId: string) => {
  const next = colorPalettes.value.filter((palette) => palette.id !== paletteId)
  colorPalettes.value = next
  if (activeColorCell.value?.paletteId === paletteId) {
    const first = next[0]
    activeColorCell.value = first ? { paletteId: first.id, step: '500' } : null
  }
}

const setActiveHexColor = (value: string) => {
  const next = String(value || '').trim()
  if (!/^#([0-9a-fA-F]{6})$/.test(next)) return
  activeColorValue.value = next
}

const setActiveHexColorFromEvent = (event: Event) => {
  const target = event.target as HTMLInputElement | null
  if (!target) return
  setActiveHexColor(target.value)
}

const addTheme = () => {
  const existing = new Set(themeSettings.value.themes.map((theme) => theme.id))
  let index = themeSettings.value.themes.length + 1
  let id = `theme-${index}`
  while (existing.has(id)) {
    index += 1
    id = `theme-${index}`
  }

  const source = activeTheme.value ?? createDefaultThemeSettings().themes[0]!
  const nextTheme: HeliosSemanticTheme = {
    id,
    label: `Theme ${index}`,
    enabled: true,
    tokens: {
      bg: { ...source.tokens.bg },
      text: { ...source.tokens.text },
      border: { ...source.tokens.border },
    },
  }

  themeSettings.value.themes.push(nextTheme)
  themeSettings.value.activeThemeId = nextTheme.id
}

const removeTheme = (id: string) => {
  if (themeSettings.value.themes.length <= 1) return
  const next = themeSettings.value.themes.filter((theme) => theme.id !== id)
  themeSettings.value.themes = next
  if (!next.find((theme) => theme.id === themeSettings.value.activeThemeId)) {
    themeSettings.value.activeThemeId = next[0]?.id ?? 'default'
  }
}

const resolvePaletteColorValue = (token: string) => {
  const paletteRef = token.match(/^palette:([a-z0-9-]+):(50|100|200|300|400|500|600|700|800|900|950)$/i)
  if (!paletteRef?.[1] || !paletteRef?.[2]) return ''
  const palette = colorPalettes.value.find((entry) => entry.id === sanitizeId(paletteRef[1], paletteRef[1]))
  if (!palette) return ''
  return palette.steps[paletteRef[2] as HeliosColorStep] ?? ''
}

const resolveThemePreviewColor = (token: string) => {
  const resolvedPalette = resolvePaletteColorValue(token)
  if (resolvedPalette) return resolvedPalette
  const cleaned = sanitizeColorValue(token)
  if (!cleaned) return '#ffffff'
  return cleaned
}

const setThemeTokenFromPreset = (
  channel: 'bg' | 'text' | 'border',
  token: HeliosThemeBgToken | HeliosThemeTextToken | HeliosThemeBorderToken,
  value: string,
) => {
  const theme = activeTheme.value
  if (!theme) return
  if (channel === 'bg') theme.tokens.bg[token as HeliosThemeBgToken] = value
  if (channel === 'text') theme.tokens.text[token as HeliosThemeTextToken] = value
  if (channel === 'border') theme.tokens.border[token as HeliosThemeBorderToken] = value
}

const setThemeTokenFromEvent = (
  channel: 'bg' | 'text' | 'border',
  token: HeliosThemeBgToken | HeliosThemeTextToken | HeliosThemeBorderToken,
  event: Event,
) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  setThemeTokenFromPreset(channel, token, target.value)
}

const applyPreview = () => {
  if (typeof document === 'undefined') return
  const cfg = sanitizeConfig(activeConfig.value, defaultConfig)
  const root = document.documentElement
  root.style.fontSize = `${((cfg.baseFontPx / 16) * 100).toFixed(4)}%`
  root.style.setProperty('--bf', `${cfg.baseFontPx}`)
  root.style.setProperty('--tr', `${cfg.typeRatio}`)
  root.style.setProperty('--gr', `${cfg.gridRatio}`)
  root.style.setProperty('--sr', `${cfg.spaceRatio}`)
  root.style.setProperty('--ds-brand', cfg.brandColor)

  for (const step of scaleSteps.value) {
    const key = formatScaleKey(step)
    const fsRem = Math.pow(cfg.typeRatio, step)
    const gridRem = cfg.gridRatio * step
    const spaceRem = Math.pow(cfg.spaceRatio, step)
    const lineRem = cfg.gridRatio * (step + 1)
    root.style.setProperty(`--fs-${key}`, `${fsRem.toFixed(6)}rem`)
    root.style.setProperty(`--v-${key}`, `${gridRem.toFixed(6)}rem`)
    root.style.setProperty(`--sp-${key}`, `${spaceRem.toFixed(6)}rem`)
    root.style.setProperty(`--lh-${key}`, `${lineRem.toFixed(6)}rem`)
  }

  root.style.setProperty('--lh-0', `${cfg.gridRatio.toFixed(6)}rem`)
  root.style.setProperty('--lh-1', `${(cfg.gridRatio * 2).toFixed(6)}rem`)
}

watch(
  () => [activeBreakpointId.value, breakpoints.value],
  () => {
    applyPreview()
  },
  { deep: true }
)

const load = async () => {
  loading.value = true
  status.value = ''
  try {
    const result = await $fetch<{
      ok: boolean
      config?: Partial<HeliosTypeConfig>
      breakpoints?: unknown
      colors?: unknown
      themes?: unknown
    }>('/api/helios/type/read')

    const base = sanitizeConfig(result.config, defaultConfig)
    const parsedBreakpoints = normalizeBreakpoints(result.breakpoints, base)
    const parsedColors = normalizeColorPalettes(result.colors)
    const parsedThemes = normalizeThemeSettings(result.themes)
    breakpoints.value = parsedBreakpoints
    colorPalettes.value = parsedColors
    themeSettings.value = parsedThemes
    if (parsedColors.length > 0) {
      activeColorCell.value = {
        paletteId: parsedColors[0]!.id,
        step: '500',
      }
    }
    activeBreakpointId.value = parsedBreakpoints[0]?.id ?? 'mobile'
    status.value = result.ok ? 'Loaded saved Helios settings.' : 'Using defaults.'
  }
  catch {
    breakpoints.value = createDefaultBreakpoints(defaultConfig)
    colorPalettes.value = []
    themeSettings.value = createDefaultThemeSettings()
    activeColorCell.value = null
    activeBreakpointId.value = breakpoints.value[0]?.id ?? 'mobile'
    status.value = 'Unable to load saved settings. Using defaults.'
  }
  finally {
    applyPreview()
    loading.value = false
  }
}

const commit = async () => {
  committing.value = true
  status.value = ''
  try {
    const normalized = normalizeBreakpoints(breakpoints.value, sanitizeConfig(activeConfig.value, defaultConfig))
    const normalizedColors = normalizeColorPalettes(colorPalettes.value)
    const normalizedThemes = normalizeThemeSettings(themeSettings.value)
    breakpoints.value = normalized
    colorPalettes.value = normalizedColors
    themeSettings.value = normalizedThemes
    const payload = {
      config: normalized[0]?.config ?? sanitizeConfig(activeConfig.value, defaultConfig),
      breakpoints: normalized,
      colors: normalizedColors,
      themes: normalizedThemes,
    }

    const result = await $fetch<{ ok: boolean; message?: string; files?: string[] }>('/api/helios/type/commit', {
      method: 'POST',
      body: payload,
    })

    if (result.ok) {
      const output = result.files?.join(', ') ?? 'Artifacts updated.'
      status.value = `Committed: ${output}`
    }
    else {
      status.value = result.message ?? 'Commit failed.'
    }
  }
  catch {
    status.value = 'Commit failed.'
  }
  finally {
    committing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="helios-page">
    <header class="scale-toolbar" :class="{ expanded: controlsExpanded }">
      <div class="scale-toolbar__row">
        <div class="scale-toolbar__left">
          <label class="toolbar-control toolbar-control--breakpoint">
            <span>Editing breakpoint</span>
            <select v-model="activeBreakpointId">
              <option v-for="bp in sortedBreakpoints" :key="bp.id" :value="bp.id">
                {{ bp.label }} ({{ formatRange(bp) }})
              </option>
            </select>
          </label>

          <button
            class="icon-btn"
            type="button"
            title="Manage breakpoints"
            :disabled="loading || committing"
            @click="openBreakpointManager"
          >
            +
          </button>
        </div>

        <div class="scale-toolbar__right">
          <button :disabled="loading || committing" @click="load">
            Reload
          </button>
          <button class="primary" :disabled="loading || committing" @click="commit">
            {{ committing ? 'Committing...' : 'Commit' }}
          </button>
          <button
            class="icon-btn"
            type="button"
            :class="{ active: controlsExpanded }"
            :aria-expanded="String(controlsExpanded)"
            title="Toggle advanced controls"
            @click="controlsExpanded = !controlsExpanded"
          >
            {{ controlsExpanded ? '^' : 'v' }}
          </button>
        </div>
      </div>

      <div v-if="controlsExpanded" class="scale-toolbar__expanded">
        <label class="control">
          <span>Base font</span>
          <div class="control__inputs">
            <input v-model.number="activeConfig.baseFontPx" type="range" min="12" max="24" step="0.5" />
            <input v-model.number="activeConfig.baseFontPx" type="number" min="8" step="0.5" />
          </div>
        </label>

        <label class="control">
          <span>Type ratio</span>
          <div class="control__inputs">
            <input v-model.number="activeConfig.typeRatio" type="range" min="1.05" max="1.8" step="0.01" />
            <input v-model.number="activeConfig.typeRatio" type="number" min="1" step="0.01" />
          </div>
        </label>

        <label class="control">
          <span>Grid ratio</span>
          <div class="control__inputs">
            <input v-model.number="activeConfig.gridRatio" type="range" min="0.5" max="2" step="0.01" />
            <input v-model.number="activeConfig.gridRatio" type="number" min="0.5" step="0.01" />
          </div>
        </label>

        <label class="control">
          <span>Space ratio</span>
          <div class="control__inputs">
            <input v-model.number="activeConfig.spaceRatio" type="range" min="1.05" max="1.8" step="0.01" />
            <input v-model.number="activeConfig.spaceRatio" type="number" min="1" step="0.01" />
          </div>
        </label>

        <label class="control">
          <span>Min step</span>
          <input v-model.number="activeConfig.minStep" type="number" step="0.25" />
        </label>

        <label class="control">
          <span>Max step</span>
          <input v-model.number="activeConfig.maxStep" type="number" step="0.25" />
        </label>

        <label class="control">
          <span>Step</span>
          <select v-model.number="activeConfig.step">
            <option :value="1">1</option>
            <option :value="0.5">0.5</option>
            <option :value="0.25">0.25</option>
          </select>
        </label>
      </div>

      <p v-if="status" class="status status--toolbar">
        {{ status }}
      </p>
    </header>

    <div class="scale-body">
      <aside class="scale-sidebar">
        <div class="scale-sidebar__title">Setup</div>
        <button
          v-for="panel in panelItems"
          :key="panel.id"
          class="scale-nav"
          :class="{ active: activePanel === panel.id }"
          @click="activePanel = panel.id"
        >
          {{ panel.label }}
        </button>
      </aside>

      <main class="scale-content">
        <section v-if="activePanel === 'typography'" class="panel">
          <div class="panel-header">
            <h2>Typography</h2>
            <label class="sample">
              <span>Sample</span>
              <input v-model="sample" type="text" />
            </label>
          </div>

          <p class="panel-caption">
            Previewing {{ currentBreakpointLabel }}. Commit writes this as a responsive token profile.
          </p>

          <div class="token-row">
            <code>--bf: {{ activeConfig.baseFontPx }}</code>
            <code>--tr: {{ activeConfig.typeRatio }}</code>
            <code>--gr: {{ activeConfig.gridRatio }}</code>
            <code>--sr: {{ activeConfig.spaceRatio }}</code>
          </div>

          <div class="rows">
            <article v-for="row in rows" :key="row.className" class="row">
              <div class="meta">
                <code>{{ row.className }}</code>
                <span>{{ row.rem }} / {{ row.px }}</span>
              </div>
              <p :style="{ fontSize: row.sizeCss, lineHeight: 'var(--lh-0)' }">
                {{ sample }}
              </p>
            </article>
          </div>
        </section>

        <section v-else-if="activePanel === 'spacing'" class="panel">
          <div class="panel-header">
            <h2>Spacing</h2>
            <p>Grid + spacing utilities for {{ currentBreakpointLabel }}.</p>
          </div>
          <div class="rows">
            <article v-for="row in spacingRows" :key="row.className" class="row">
              <div class="meta">
                <code>{{ row.className }}</code>
                <span>{{ row.rem }} / {{ row.px }}</span>
              </div>
              <div class="meta mini">
                <span>grid unit: {{ row.gridRem }}</span>
                <span>step: {{ row.step }}</span>
              </div>
              <div class="space-preview" :style="{ gap: `var(--sp-${row.key})` }">
                <span class="space-box">A</span>
                <span class="space-box">B</span>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activePanel === 'colors'" class="panel">
          <div class="panel-header panel-header--colors">
            <div>
              <h2>Colors</h2>
              <p>Tailwind v4 palette defaults. Toggle rows and steps to control what gets committed.</p>
            </div>
            <button type="button" @click="addCustomPalette">
              Add palette
            </button>
          </div>

          <div v-if="activeColorPalette" class="palette-editor">
            <div class="palette-editor__meta">
              <strong>{{ activeColorPalette.label }}</strong>
              <span>{{ activeColorCell?.step }}</span>
            </div>
            <div class="palette-editor__controls">
              <label class="control control--stack">
                <span>Color value</span>
                <input
                  v-model="activeColorValue"
                  type="text"
                  placeholder="oklch(...) or #hex"
                />
              </label>
              <label class="control control--stack">
                <span>Hex picker</span>
                <input
                  :value="activeColorHex"
                  type="color"
                  @input="setActiveHexColorFromEvent"
                />
              </label>
            </div>
          </div>

          <div class="palette-list">
            <article
              v-for="palette in colorPalettes"
              :key="palette.id"
              class="palette-row"
              :class="{ off: !palette.enabled }"
            >
              <div class="palette-row__meta">
                <input
                  :checked="palette.enabled"
                  type="checkbox"
                  @change="togglePaletteEnabled(palette)"
                />
                <input
                  v-if="palette.custom"
                  v-model="palette.label"
                  type="text"
                  class="palette-row__label-input"
                  placeholder="Palette name"
                />
                <strong v-else>{{ palette.label }}</strong>
                <button
                  v-if="palette.custom"
                  class="btn-remove"
                  type="button"
                  @click="removeCustomPalette(palette.id)"
                >
                  Remove
                </button>
              </div>

              <div class="palette-row__swatches">
                <div
                  v-for="step in colorSteps"
                  :key="`${palette.id}-${step}`"
                  class="palette-swatch"
                  :class="{ selected: activeColorCell?.paletteId === palette.id && activeColorCell?.step === step }"
                  @click="selectColorCell(palette.id, step)"
                >
                  <button
                    class="palette-swatch__chip"
                    type="button"
                    :title="palette.steps[step] || `Set ${palette.label} ${step}`"
                    :style="{ background: palette.steps[step] || '#ffffff' }"
                    @click.stop="selectColorCell(palette.id, step)"
                  />
                  <button
                    class="palette-swatch__toggle"
                    type="button"
                    :class="{ on: palette.enabledSteps[step] }"
                    @click.stop="togglePaletteStep(palette, step)"
                  >
                    {{ palette.enabledSteps[step] ? 'On' : 'Off' }}
                  </button>
                  <span>{{ step }}</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activePanel === 'themes'" class="panel">
          <div class="panel-header panel-header--colors">
            <div>
              <h2>Themes</h2>
              <p>Semantic tokens map to palettes and generate utilities like <code>bg-primary</code> and <code>text-secondary</code>.</p>
            </div>
            <button type="button" @click="addTheme">
              Add theme
            </button>
          </div>

          <div class="theme-toolbar">
            <label class="control">
              <span>Active theme</span>
              <select v-model="themeSettings.activeThemeId">
                <option v-for="theme in themeSettings.themes" :key="theme.id" :value="theme.id">
                  {{ theme.label }}
                </option>
              </select>
            </label>

            <label v-if="activeTheme" class="control">
              <span>Theme label</span>
              <input v-model="activeTheme.label" type="text" />
            </label>

            <button
              v-if="activeTheme"
              class="btn-remove"
              type="button"
              :disabled="themeSettings.themes.length <= 1"
              @click="removeTheme(activeTheme.id)"
            >
              Remove theme
            </button>
          </div>

          <div v-if="activeTheme" class="semantic-grid">
            <article class="semantic-column">
              <h3>Background</h3>
              <div v-for="token in bgThemeTokens" :key="`bg-${token}`" class="semantic-row">
                <div class="semantic-row__title">
                  <span>{{ token }}</span>
                  <i class="semantic-preview" :style="{ background: resolveThemePreviewColor(activeTheme.tokens.bg[token]) }" />
                </div>
                <input v-model="activeTheme.tokens.bg[token]" type="text" placeholder="palette:blue:600 or #hex" />
                <select
                  :value="activeTheme.tokens.bg[token]"
                  @change="setThemeTokenFromEvent('bg', token, $event)"
                >
                  <option :value="activeTheme.tokens.bg[token]">Keep current</option>
                  <option v-for="option in paletteOptionItems" :key="`bg-${token}-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </article>

            <article class="semantic-column">
              <h3>Text</h3>
              <div v-for="token in textThemeTokens" :key="`text-${token}`" class="semantic-row">
                <div class="semantic-row__title">
                  <span>{{ token }}</span>
                  <i class="semantic-preview" :style="{ background: resolveThemePreviewColor(activeTheme.tokens.text[token]) }" />
                </div>
                <input v-model="activeTheme.tokens.text[token]" type="text" placeholder="palette:slate:900 or #hex" />
                <select
                  :value="activeTheme.tokens.text[token]"
                  @change="setThemeTokenFromEvent('text', token, $event)"
                >
                  <option :value="activeTheme.tokens.text[token]">Keep current</option>
                  <option v-for="option in paletteOptionItems" :key="`text-${token}-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </article>

            <article class="semantic-column">
              <h3>Border</h3>
              <div v-for="token in borderThemeTokens" :key="`border-${token}`" class="semantic-row">
                <div class="semantic-row__title">
                  <span>{{ token }}</span>
                  <i class="semantic-preview" :style="{ background: resolveThemePreviewColor(activeTheme.tokens.border[token]) }" />
                </div>
                <input v-model="activeTheme.tokens.border[token]" type="text" placeholder="palette:slate:200 or #hex" />
                <select
                  :value="activeTheme.tokens.border[token]"
                  @change="setThemeTokenFromEvent('border', token, $event)"
                >
                  <option :value="activeTheme.tokens.border[token]">Keep current</option>
                  <option v-for="option in paletteOptionItems" :key="`border-${token}-${option.value}`" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </div>
            </article>
          </div>
        </section>

        <section v-else-if="activePanel === 'design'" class="panel">
          <div class="panel-header">
            <h2>Design System</h2>
            <p>Brand token can be tuned per breakpoint profile.</p>
          </div>
          <label class="control control--stack">
            <span>Brand color</span>
            <input v-model="activeConfig.brandColor" type="text" placeholder="#2858ff" />
          </label>
          <div class="color-test">
            <span class="chip">Token preview</span>
            <span class="chip-brand">bg-brand</span>
          </div>
        </section>

        <section v-else-if="activePanel === 'breakpoints'" class="panel">
          <div class="panel-header panel-header--breakpoints">
            <div>
              <h2>Breakpoints</h2>
              <p>Manage breakpoint ranges in the modal. The first range always starts at 0px.</p>
            </div>
            <button class="btn-edit" type="button" @click="openBreakpointManager">
              Manage
            </button>
          </div>

          <div class="breakpoint-list">
            <article
              v-for="bp in sortedBreakpoints"
              :key="bp.id"
              class="breakpoint-card"
              :class="{ active: bp.id === activeBreakpointId }"
            >
              <div class="breakpoint-card__header">
                <strong>{{ bp.label }}</strong>
                <button class="btn-edit" type="button" @click="activeBreakpointId = bp.id">
                  {{ bp.id === activeBreakpointId ? 'Editing' : 'Edit' }}
                </button>
              </div>
              <p class="breakpoint-meta">{{ formatRange(bp) }}</p>
            </article>
          </div>
        </section>

        <section v-else class="panel panel-placeholder">
          <h2>{{ panelItems.find((item) => item.id === activePanel)?.label }}</h2>
          <p>
            Panel shell restored. Wiring for this section is intentionally deferred so current config sync remains
            unchanged.
          </p>
        </section>
      </main>
    </div>

    <Teleport to="body">
      <Dialog :open="breakpointManagerOpen" class="breakpoint-dialog" @close="closeBreakpointManager">
        <div class="breakpoint-dialog__backdrop" aria-hidden="true" />

        <div class="breakpoint-dialog__positioner">
          <DialogPanel class="breakpoint-dialog__panel">
            <div class="breakpoint-dialog__header">
              <DialogTitle as="h2">Responsive Breakpoints</DialogTitle>
              <button class="icon-btn icon-btn--small" type="button" @click="closeBreakpointManager">
                x
              </button>
            </div>

            <p class="breakpoint-dialog__intro">
              Define min and max widths for each profile. The first breakpoint automatically starts at 0px.
            </p>

            <div class="breakpoint-dialog__list">
              <article v-for="(draft, index) in breakpointDrafts" :key="`${draft.sourceId ?? 'new'}-${index}`" class="draft-card">
                <label class="control">
                  <span>Label</span>
                  <input v-model="draft.label" type="text" placeholder="Mobile" />
                </label>

                <div class="draft-card__range">
                  <label class="control">
                    <span>From</span>
                    <input v-model="draft.minWidth" type="number" min="0" step="1" />
                  </label>

                  <label class="control">
                    <span>To</span>
                    <input v-model="draft.maxWidth" type="number" min="0" step="1" placeholder="none" />
                  </label>
                </div>

                <button
                  class="btn-remove"
                  type="button"
                  :disabled="breakpointDrafts.length <= 1"
                  @click="removeBreakpointDraft(index)"
                >
                  Remove
                </button>
              </article>
            </div>

            <p v-if="breakpointDraftError" class="status status--error">
              {{ breakpointDraftError }}
            </p>

            <div class="breakpoint-dialog__footer">
              <button type="button" @click="addBreakpointDraft">
                Add breakpoint
              </button>
              <div class="breakpoint-dialog__actions">
                <button type="button" @click="closeBreakpointManager">
                  Cancel
                </button>
                <button class="primary" type="button" @click="saveBreakpointDrafts">
                  Save breakpoints
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.helios-page {
  --toolbar-height: 70px;
  min-height: 100vh;
  background: #f5f6fb;
  color: #0f172a;
}

.scale-toolbar {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
  background: rgba(245, 246, 251, 0.95);
  backdrop-filter: blur(10px);
}

.scale-toolbar__row {
  height: var(--toolbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0 1rem;
}

.scale-toolbar__left,
.scale-toolbar__right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.scale-toolbar__right {
  flex-shrink: 0;
}

.toolbar-control {
  display: grid;
  gap: 0.25rem;
  min-width: 280px;
  font-size: 0.74rem;
  color: #64748b;
}

.toolbar-control span {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.toolbar-control select {
  min-width: 250px;
}

.icon-btn {
  width: 2.1rem;
  height: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1rem;
  font-weight: 700;
}

.icon-btn.active {
  border-color: rgba(40, 88, 255, 0.35);
  background: #e7ecff;
  color: #2047d6;
}

.scale-toolbar__expanded {
  border-top: 1px solid rgba(226, 232, 240, 0.95);
  display: grid;
  gap: 0.7rem;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  padding: 0.8rem 1rem;
}

.status {
  margin: 0;
  color: #334155;
  font-size: 0.8rem;
}

.status--toolbar {
  padding: 0 1rem 0.75rem;
}

.status--error {
  color: #b42318;
}

.control {
  display: grid;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #64748b;
}

.control span {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.control__inputs {
  display: grid;
  grid-template-columns: 1fr 4rem;
  gap: 0.45rem;
  align-items: center;
}

.control--stack input {
  max-width: 240px;
}

.scale-body {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
}

.scale-sidebar {
  position: sticky;
  top: calc(var(--toolbar-height) + 12px);
  align-self: start;
  max-height: calc(100vh - var(--toolbar-height) - 18px);
  overflow: auto;
  padding: 1.2rem 0.8rem;
  border-right: 1px solid rgba(226, 232, 240, 0.9);
  background: #f5f6fb;
}

.scale-sidebar__title {
  margin: 0 0 0.7rem;
  padding: 0 0.35rem;
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.scale-nav {
  width: 100%;
  margin: 0 0 0.45rem;
  text-align: left;
  border: 1px solid transparent;
  border-radius: 0.6rem;
  background: transparent;
  color: #334155;
  font-weight: 600;
  padding: 0.55rem 0.65rem;
  cursor: pointer;
}

.scale-nav.active {
  border-color: rgba(40, 88, 255, 0.25);
  background: #e7ecff;
  color: #2047d6;
}

.scale-content {
  padding: 1.2rem 1.6rem 2rem;
}

.panel {
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 0.85rem;
  padding: 1rem 1.1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.panel-header p {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
}

.panel-header--breakpoints {
  align-items: center;
}

.panel-header--colors {
  align-items: center;
}

.palette-editor {
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 0.75rem;
  padding: 0.8rem;
  background: #f8faff;
  margin-bottom: 0.9rem;
}

.palette-editor__meta {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.6rem;
}

.palette-editor__meta span {
  font-size: 0.78rem;
  color: #64748b;
  background: #eef2ff;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
}

.palette-editor__controls {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 0.6rem;
}

.palette-list {
  display: grid;
  gap: 0.75rem;
}

.palette-row {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.75rem;
  padding: 0.75rem;
  background: #fff;
}

.palette-row.off {
  opacity: 0.6;
}

.palette-row__meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.65rem;
}

.palette-row__label-input {
  max-width: 220px;
}

.palette-row__swatches {
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 0.45rem;
}

.palette-swatch {
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 0.65rem;
  padding: 0.34rem;
  display: grid;
  gap: 0.28rem;
  justify-items: center;
  cursor: pointer;
}

.palette-swatch.selected {
  border-color: rgba(40, 88, 255, 0.45);
  background: #f8faff;
}

.palette-swatch__chip {
  width: 100%;
  min-height: 36px;
  border-radius: 0.45rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0;
}

.palette-swatch__toggle {
  min-width: 3.2rem;
  border-radius: 999px;
  font-size: 0.68rem;
  padding: 0.16rem 0.4rem;
  border-color: rgba(148, 163, 184, 0.4);
}

.palette-swatch__toggle.on {
  border-color: rgba(40, 88, 255, 0.32);
  background: #e7ecff;
  color: #2047d6;
}

.palette-swatch span {
  font-size: 0.66rem;
  color: #64748b;
}

.theme-toolbar {
  display: grid;
  grid-template-columns: 220px 1fr auto;
  gap: 0.65rem;
  align-items: end;
  margin-bottom: 0.9rem;
}

.semantic-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.semantic-column {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.75rem;
  padding: 0.7rem;
  background: #fff;
}

.semantic-column h3 {
  margin: 0 0 0.65rem;
  font-size: 0.9rem;
}

.semantic-row {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.semantic-row:last-child {
  margin-bottom: 0;
}

.semantic-row__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  font-size: 0.76rem;
  color: #475569;
  text-transform: lowercase;
}

.semantic-preview {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(148, 163, 184, 0.45);
  display: inline-block;
}

.panel-caption {
  margin: 0 0 0.8rem;
  color: #64748b;
  font-size: 0.8rem;
}

.sample {
  min-width: 240px;
  display: grid;
  gap: 0.2rem;
}

.sample span {
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 600;
}

.token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-bottom: 0.8rem;
}

.token-row code {
  padding: 0.3rem 0.5rem;
  border-radius: 0.45rem;
  background: #eef2ff;
  color: #334155;
  font-size: 0.72rem;
}

.rows {
  display: grid;
  gap: 0.65rem;
}

.row {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: #fff;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 0.4rem;
  color: #475569;
  font-size: 0.74rem;
}

.meta code {
  font-size: 0.72rem;
  color: #1e293b;
}

.meta.mini {
  margin-top: -0.15rem;
  margin-bottom: 0.45rem;
}

.row p {
  margin: 0;
}

.space-preview {
  display: flex;
  align-items: center;
  border: 1px dashed rgba(148, 163, 184, 0.8);
  border-radius: 0.6rem;
  padding: 0.5rem;
}

.space-box {
  width: 2.1rem;
  height: 2.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  background: #e0e7ff;
  color: #1e3a8a;
  font-weight: 700;
}

.color-test {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.chip,
.chip-brand {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.26rem 0.65rem;
  font-size: 0.76rem;
  font-weight: 600;
}

.chip {
  background: #f1f5f9;
  color: #475569;
}

.chip-brand {
  background: var(--ds-brand, #2858ff);
  color: #fff;
}

.breakpoint-list {
  display: grid;
  gap: 0.7rem;
}

.breakpoint-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.75rem;
  padding: 0.7rem;
  background: #fff;
}

.breakpoint-card.active {
  border-color: rgba(40, 88, 255, 0.4);
  background: #f8faff;
}

.breakpoint-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.btn-edit,
.btn-remove {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0.55rem;
  background: #fff;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.btn-remove {
  color: #991b1b;
}

.breakpoint-meta {
  margin: 0.65rem 0 0;
  color: #64748b;
  font-size: 0.78rem;
}

.panel-placeholder p {
  margin: 0.5rem 0 0;
  color: #64748b;
}

.breakpoint-dialog {
  position: fixed;
  inset: 0;
  z-index: 2200;
}

.breakpoint-dialog__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.breakpoint-dialog__positioner {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.breakpoint-dialog__panel {
  width: min(860px, 100%);
  max-height: min(86vh, 920px);
  overflow: auto;
  border-radius: 0.9rem;
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
  padding: 1rem;
}

.breakpoint-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.breakpoint-dialog__header h2 {
  margin: 0;
  font-size: 1rem;
}

.icon-btn--small {
  width: 1.9rem;
  height: 1.9rem;
  font-size: 0.85rem;
}

.breakpoint-dialog__intro {
  margin: 0.45rem 0 0.95rem;
  color: #64748b;
  font-size: 0.84rem;
}

.breakpoint-dialog__list {
  display: grid;
  gap: 0.7rem;
}

.draft-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 0.75rem;
  padding: 0.7rem;
  display: grid;
  gap: 0.7rem;
}

.draft-card__range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.breakpoint-dialog__footer {
  margin-top: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
}

.breakpoint-dialog__actions {
  display: flex;
  gap: 0.5rem;
}

input,
select,
button {
  font: inherit;
}

input,
select {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 0.55rem;
  padding: 0.4rem 0.55rem;
  background: #fff;
  color: #0f172a;
}

input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  padding: 0;
}

input[type='color'] {
  min-height: 2.2rem;
  padding: 0.15rem;
}

button {
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 0.55rem;
  padding: 0.42rem 0.8rem;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}

button.primary {
  border-color: transparent;
  background: #2858ff;
  color: #fff;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .scale-toolbar__row {
    height: auto;
    padding: 0.7rem 0.8rem;
    flex-wrap: wrap;
  }

  .scale-toolbar__left,
  .scale-toolbar__right {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar-control,
  .toolbar-control select {
    min-width: 0;
    width: 100%;
  }

  .palette-row__swatches {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .theme-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .semantic-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 980px) {
  .scale-body {
    grid-template-columns: 1fr;
  }

  .scale-sidebar {
    position: static;
    max-height: none;
    border-right: 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.9);
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.45rem;
  }

  .scale-sidebar__title {
    grid-column: 1 / -1;
    margin-bottom: 0.25rem;
  }

  .scale-nav {
    margin: 0;
  }

  .scale-content {
    padding: 1rem;
  }

  .breakpoint-dialog__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .breakpoint-dialog__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .palette-editor__controls {
    grid-template-columns: 1fr;
  }

  .palette-row__swatches {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .semantic-grid {
    grid-template-columns: 1fr;
  }
}
</style>
