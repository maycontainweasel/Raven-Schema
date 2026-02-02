import { defineStore } from 'pinia'
import { useRuntimeConfig } from '#app'

export type ScaleSettings = {
  fontSize: number
  ratio: number
  gridRatio: number
  spaceSync?: boolean
  spaceMode: 'grid' | 'ratio'
  spaceBase: number
  spaceRatio: number
}

export type ScaleTokens = {
  base: ScaleSettings
  breakpoints: Record<number, Partial<ScaleSettings>>
}

export type ScaleRange = {
  id: string
  label: string
  min: number
  max: number
}

export type HeliosSettings = {
  outputFormat: 'scss' | 'css'
  outputDir: string
  outputEntry: string
  tokensFile: string
  tokensScssFile: string
  typographyFile: string
  breakpointsFile: string
  designFile: string
}

export type HeliosBreakpoint = {
  key: string
  value: string
}

export type HeliosDesignTokens = {
  colors: {
    bg: string
    panel: string
    panelSoft: string
    text: string
    muted: string
    border: string
    accent: string
    accentStrong: string
    accentSoft: string
    success: string
    warning: string
    danger: string
  }
  radius: {
    sm: number
    md: number
    lg: number
    xl: number
  }
  shadows: {
    sm: number
    md: number
    lg: number
  }
  borders: {
    width: number
  }
  buttons: {
    height: number
    padX: number
    radius: number
  }
  cards: {
    radius: number
    border: number
  }
}

type ScaleKitInstance = {
  tokens: ScaleTokens
  apply: () => void
  save: () => void
}

const draftKey = 'helios-scale-draft'

const defaultSettings: HeliosSettings = {
  outputFormat: 'scss',
  outputDir: 'app/assets/scss/helios',
  outputEntry: 'helios.scss',
  tokensFile: 'app/assets/scss/helios/helios.tokens.json',
  tokensScssFile: '_tokens.scss',
  typographyFile: '_typography.scss',
  breakpointsFile: '_breakpoints.scss',
  designFile: '_design-system.scss',
}

const defaultDesignTokens: HeliosDesignTokens = {
  colors: {
    bg: '#f4f6fb',
    panel: '#ffffff',
    panelSoft: '#f8f9fc',
    text: '#0f172a',
    muted: '#667085',
    border: '#e3e7ef',
    accent: '#1c2b4f',
    accentStrong: '#2858ff',
    accentSoft: '#e7ecff',
    success: '#19a974',
    warning: '#f59f00',
    danger: '#e03131',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 28,
  },
  shadows: {
    sm: 0.06,
    md: 0.12,
    lg: 0.2,
  },
  borders: {
    width: 1,
  },
  buttons: {
    height: 44,
    padX: 20,
    radius: 999,
  },
  cards: {
    radius: 20,
    border: 1,
  },
}

const defaultBreakpoints: HeliosBreakpoint[] = [
  { key: 'm', value: '320px' },
  { key: 'mm', value: '380px' },
  { key: 'mmx', value: '381px' },
  { key: 'ml', value: '480px' },
  { key: 'mlx', value: '481px' },
  { key: 'txs', value: '550px' },
  { key: 'ts', value: '600px' },
  { key: 't', value: '767px' },
  { key: 'tx', value: '768px' },
  { key: 'txl', value: '800px' },
  { key: 'tm', value: '991px' },
  { key: 'tmx', value: '992px' },
  { key: 'tl', value: '1024px' },
  { key: 'ds', value: '1024px' },
  { key: 'd', value: '1200px' },
  { key: 'dm', value: '1366px' },
  { key: 'dmx', value: '1440px' },
  { key: 'dmxx', value: '1441px' },
  { key: 'dml', value: '1600px' },
  { key: 'dmlx', value: '1750px' },
  { key: 'dl', value: '1900px' },
  { key: 'dxl', value: '2560px' },
  { key: 'dxxl', value: '3840px' },
]

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

let kitRef: ScaleKitInstance | null = null

export const useHeliosScaleStore = defineStore('heliosScale', {
  state: () => ({
    tokens: null as ScaleTokens | null,
    ranges: [] as ScaleRange[],
    activeScope: 'global',
    settings: { ...defaultSettings },
    designTokens: { ...defaultDesignTokens },
    breakpoints: [...defaultBreakpoints],
    levels: 10,
    minLevel: -5,
    isCommitting: false,
    commitStatus: '',
  }),
  actions: {
    initFromConfig() {
      const config = useRuntimeConfig().public.scaleKit as any
      if (!this.tokens) {
        this.tokens = clone(config.tokens)
      }
      this.levels = config.levels ?? this.levels
      this.minLevel = config.minLevel ?? this.minLevel
      this.loadDraft()
    },
    setKit(kit: ScaleKitInstance) {
      kitRef = kit
    },
    replaceTokens(tokens: ScaleTokens) {
      this.tokens = clone(tokens)
    },
    apply() {
      if (!kitRef || !this.tokens) return
      ;(kitRef as any).__suppressSync = true
      kitRef.tokens = clone(this.tokens)
      kitRef.apply()
      ;(kitRef as any).__suppressSync = false
      this.applyDesignTokens()
    },
    applyDesignTokens() {
      if (typeof document === 'undefined') return
      const root = document.documentElement
      const tokens = this.designTokens
      if (!tokens) return

      const shadowBaseRaw = tokens.colors.text || '#0f172a'
      const shadowBase = shadowBaseRaw.startsWith('#') ? shadowBaseRaw : '#0f172a'

      root.style.setProperty('--ds-bg', tokens.colors.bg)
      root.style.setProperty('--ds-panel', tokens.colors.panel)
      root.style.setProperty('--ds-panel-soft', tokens.colors.panelSoft)
      root.style.setProperty('--ds-text', tokens.colors.text)
      root.style.setProperty('--ds-muted', tokens.colors.muted)
      root.style.setProperty('--ds-border', tokens.colors.border)
      root.style.setProperty('--ds-accent', tokens.colors.accent)
      root.style.setProperty('--ds-accent-strong', tokens.colors.accentStrong)
      root.style.setProperty('--ds-accent-soft', tokens.colors.accentSoft)
      root.style.setProperty('--ds-success', tokens.colors.success)
      root.style.setProperty('--ds-warning', tokens.colors.warning)
      root.style.setProperty('--ds-danger', tokens.colors.danger)

      root.style.setProperty('--ds-radius-sm', `${tokens.radius.sm}px`)
      root.style.setProperty('--ds-radius-md', `${tokens.radius.md}px`)
      root.style.setProperty('--ds-radius-lg', `${tokens.radius.lg}px`)
      root.style.setProperty('--ds-radius-xl', `${tokens.radius.xl}px`)

      root.style.setProperty('--ds-shadow-sm', `0 6px 18px ${shadowBase}${Math.round(tokens.shadows.sm * 255).toString(16).padStart(2, '0')}`)
      root.style.setProperty('--ds-shadow-md', `0 18px 40px ${shadowBase}${Math.round(tokens.shadows.md * 255).toString(16).padStart(2, '0')}`)
      root.style.setProperty('--ds-shadow-lg', `0 30px 70px ${shadowBase}${Math.round(tokens.shadows.lg * 255).toString(16).padStart(2, '0')}`)

      root.style.setProperty('--ds-border-width', `${tokens.borders.width}px`)
      root.style.setProperty('--ds-btn-height', `${tokens.buttons.height}px`)
      root.style.setProperty('--ds-btn-pad-x', `${tokens.buttons.padX}px`)
      root.style.setProperty('--ds-btn-radius', `${tokens.buttons.radius}px`)
      root.style.setProperty('--ds-card-radius', `${tokens.cards.radius}px`)
      root.style.setProperty('--ds-card-border', `${tokens.cards.border}px`)
    },
    saveDraft() {
      if (typeof window === 'undefined') return
      if (!this.tokens) return
      const payload = {
        tokens: this.tokens,
        ranges: this.ranges,
        activeScope: this.activeScope,
        settings: this.settings,
        designTokens: this.designTokens,
        breakpoints: this.breakpoints,
        levels: this.levels,
        minLevel: this.minLevel,
      }
      window.localStorage.setItem(draftKey, JSON.stringify(payload))
    },
    loadDraft() {
      if (typeof window === 'undefined') return
      const raw = window.localStorage.getItem(draftKey)
      if (!raw) return
      try {
        const payload = JSON.parse(raw)
        if (payload.tokens) this.tokens = payload.tokens
        if (payload.ranges) this.ranges = payload.ranges
        if (payload.activeScope) this.activeScope = payload.activeScope
        if (payload.settings) this.settings = { ...defaultSettings, ...payload.settings }
        if (payload.designTokens) this.designTokens = { ...defaultDesignTokens, ...payload.designTokens }
        if (payload.breakpoints) this.breakpoints = payload.breakpoints
        if (payload.levels) this.levels = payload.levels
        if (payload.minLevel) this.minLevel = payload.minLevel
      }
      catch {
        // ignore
      }
    },
    async commit() {
      if (!this.tokens) return
      this.isCommitting = true
      this.commitStatus = ''
      try {
        await $fetch('/api/scale/commit', {
          method: 'POST',
          body: {
            tokens: this.tokens,
            ranges: this.ranges,
            settings: this.settings,
            designTokens: this.designTokens,
            levels: this.levels,
            minLevel: this.minLevel,
            breakpoints: this.breakpoints,
          },
        })
        this.commitStatus = 'Committed'
      }
      catch {
        this.commitStatus = 'Commit failed'
      }
      finally {
        this.isCommitting = false
      }
    },
  },
})
