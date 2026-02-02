import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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
const unoConfigPath = fileURLToPath(new URL('./uno.config.ts', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'helios',
  },
  modules: ['@unocss/nuxt', '@pinia/nuxt'],
  unocss: {
    configFile: unoConfigPath,
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
