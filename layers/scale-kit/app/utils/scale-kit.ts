import { reactive } from 'vue'

export interface ScaleKitBaseTokens {
  fontSize: number
  ratio: number
  gridRatio: number
  spaceSync?: boolean
  spaceMode: 'grid' | 'ratio'
  spaceBase: number
  spaceRatio: number
}

export interface ScaleKitTokens {
  base: ScaleKitBaseTokens
  breakpoints: Record<number, Partial<ScaleKitBaseTokens>>
}

type ScaleKitConfig = {
  levels: number
  minLevel: number
  storageKey: string
  enableOverlay: boolean
  tokens: ScaleKitTokens
}

export interface ScaleKitInstance {
  config: ScaleKitConfig
  tokens: ScaleKitTokens
  effective: ScaleKitBaseTokens
  activeBreakpoint: string
  overlayOpen: boolean
  apply: () => void
  save: () => void
  reset: () => void
  toggleOverlay: () => void
  updateViewport: (width: number) => void
}

const formatIndexString = (index: number) => {
  if (index < 0) {
    const absoluteValue = Math.abs(index)
    if (absoluteValue % 1 === 0) return `-${absoluteValue}`
    return `-${(absoluteValue * 10).toFixed(0).padStart(2, '0')}`
  }
  if (index > 0 && index % 1 !== 0)
    return `${(index * 10).toFixed(0).padStart(2, '0')}`
  return index.toString()
}

const resolveTokens = (tokens: ScaleKitTokens, width: number) => {
  const base = { ...tokens.base }
  const breakpoints = Object.keys(tokens.breakpoints)
    .map(Number)
    .sort((a, b) => a - b)
  let applied: number | null = null
  for (const bp of breakpoints) {
    if (width <= bp) {
      Object.assign(base, tokens.breakpoints[bp])
      applied = bp
      break
    }
  }
  return { base, applied }
}

const loadTokens = (config: ScaleKitConfig): ScaleKitTokens => {
  if (typeof window === 'undefined') return config.tokens
  const raw = window.localStorage.getItem(config.storageKey)
  if (!raw) return config.tokens
  try {
    return JSON.parse(raw) as ScaleKitTokens
  }
  catch {
    return config.tokens
  }
}

export const createScaleKit = (config: ScaleKitConfig): ScaleKitInstance => {
  const initialTokens = loadTokens(config)
  const state = reactive({
    config,
    tokens: initialTokens,
    effective: initialTokens.base,
    activeBreakpoint: 'base',
    overlayOpen: config.enableOverlay,
  })

  const apply = () => {
    if (typeof document === 'undefined') return
    const width = window.innerWidth || 0
    const { base, applied } = resolveTokens(state.tokens, width)
    state.effective = base
    state.activeBreakpoint = applied ? `${applied}` : 'base'

    const html = document.documentElement
    const fontSizePercentage = (base.fontSize / 16) * 100
    html.style.fontSize = `${fontSizePercentage}%`
    html.style.setProperty('--lh', base.gridRatio.toString())
    html.style.setProperty('--s', base.ratio.toString())
    html.style.setProperty('--space-mode', base.spaceMode)

    const levels = config.levels
    const minLevel = config.minLevel

    for (let i = minLevel; i <= levels; i += 0.5) {
      const index = Number(i.toFixed(2))
      const key = formatIndexString(index)
      const size = Math.pow(base.ratio, index)
      html.style.setProperty(`--fs-${key}`, `${size}rem`)

      const gridUnit = base.gridRatio * index
      html.style.setProperty(`--v-${key}`, `${gridUnit}rem`)
      const lineHeightUnit = base.gridRatio * (index + 1)
      html.style.setProperty(`--lh-${key}`, `${lineHeightUnit}rem`)

      let space = 0
      if (base.spaceSync !== false) {
        space = gridUnit
      }
      else if (index !== 0) {
        space = base.spaceMode === 'grid'
          ? base.spaceBase * index
          : base.spaceBase * Math.pow(base.spaceRatio, index)
      }
      html.style.setProperty(`--sp-${key}`, `${space}rem`)
    }
  }

  const save = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(config.storageKey, JSON.stringify(state.tokens))
    apply()
  }

  const reset = () => {
    state.tokens = JSON.parse(JSON.stringify(config.tokens))
    save()
  }

  const toggleOverlay = () => {
    state.overlayOpen = !state.overlayOpen
  }

  const updateViewport = (width: number) => {
    const { base, applied } = resolveTokens(state.tokens, width)
    state.effective = base
    state.activeBreakpoint = applied ? `${applied}` : 'base'
    apply()
  }

  return {
    get config() {
      return state.config
    },
    get tokens() {
      return state.tokens
    },
    set tokens(value: ScaleKitTokens) {
      state.tokens = value
    },
    get effective() {
      return state.effective
    },
    get activeBreakpoint() {
      return state.activeBreakpoint
    },
    get overlayOpen() {
      return state.overlayOpen
    },
    set overlayOpen(value: boolean) {
      state.overlayOpen = value
    },
    apply,
    save,
    reset,
    toggleOverlay,
    updateViewport,
  }
}
