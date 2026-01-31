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
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

let kitRef: ScaleKitInstance | null = null

export const useHeliosScaleStore = defineStore('heliosScale', {
  state: () => ({
    tokens: null as ScaleTokens | null,
    ranges: [] as ScaleRange[],
    activeScope: 'global',
    settings: { ...defaultSettings },
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
      kitRef?.apply()
    },
    saveDraft() {
      if (typeof window === 'undefined') return
      if (!this.tokens) return
      const payload = {
        tokens: this.tokens,
        ranges: this.ranges,
        activeScope: this.activeScope,
        settings: this.settings,
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
