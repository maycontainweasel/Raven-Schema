import { defineNitroPlugin } from 'nitropack/runtime'
import { ensureHeliosBaselineArtifacts } from '../api/helios/type/setup'

let heliosBaselineReady = false

export default defineNitroPlugin(async () => {
  if (heliosBaselineReady) return
  heliosBaselineReady = true

  const rootDir = process.cwd()
  try {
    const result = await ensureHeliosBaselineArtifacts(rootDir, { ensureConfigBridges: true })
    if (result.created.length > 0 || result.notes.length > 0) {
      console.info(
        `[helios] Baseline setup ready (created: ${result.created.length}, notes: ${result.notes.length}).`,
      )
    }
  }
  catch (error) {
    console.warn('[helios] Baseline setup failed:', error)
  }
})
