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
}

export type HeliosBreakpoint = {
  key: string
  value: string
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
    },
    saveDraft() {
      if (typeof window === 'undefined') return
      if (!this.tokens) return
      const payload = {
        tokens: this.tokens,
        ranges: this.ranges,
        activeScope: this.activeScope,
        settings: this.settings,
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
