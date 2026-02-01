import { readFileSync } from 'node:fs'

const loadTokens = () => {
  if (process.env.SCALE_KIT_DISABLE_TOKENS === '1') return {}
  try {
    const raw = readFileSync(new URL('./scale.tokens.json', import.meta.url), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const scaleTokens = loadTokens()

export default defineNuxtConfig({
  $meta: {
    name: 'helios',
  },
  runtimeConfig: {
    public: {
      scaleKit: {
        levels: 10,
        minLevel: -5,
        storageKey: 'scale-kit',
        enableOverlay: true,
        tokens: scaleTokens,
      },
    },
  },
})
