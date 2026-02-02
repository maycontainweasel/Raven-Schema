import { mergeConfigs } from '@unocss/core'
import { existsSync } from 'node:fs'
import base from './.nuxt/uno.config.mjs'

const overridesPath = new URL('./uno.overrides.config.ts', import.meta.url)

let overrides: any = {}
if (existsSync(overridesPath)) {
  try {
    const mod = await import('./uno.overrides.config.ts')
    overrides = mod.default ?? {}
  } catch {
    overrides = {}
  }
}

export default mergeConfigs([base, overrides])
