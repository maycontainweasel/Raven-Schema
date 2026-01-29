import { getClientSentryConfig, initClientSentry, trackClientError } from '@schema/sentry/client'

/**
 * Schema-kit Sentry client plugin (Nuxt)
 * - Uses @sentry/vue
 * - Reads DSN/ENV from runtimeConfig.public first, then env fallbacks
 * - Exposes `SE` via nuxtApp.provide and window.$SE
 */
function createSentryClientPlugin(appName: string) {
  return defineNuxtPlugin(async (nuxtApp) => {
    if (!process.client) return

    if (globalThis.__SENTRY_CLIENT_INITIALIZED__) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Sentry] Client already initialised, skipping for ${appName}`)
      }
      if (!nuxtApp.$SE) {
        const noop = (e: Error | string) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[Sentry] client noop:', e)
        }
        nuxtApp.provide('SE', noop)
        // @ts-ignore
        window.$SE = noop
      }
      return
    }

    try {
      const rc = useRuntimeConfig() as any
      const dsn =
        rc?.public?.sentry?.dsn ||
        process.env.NUXT_PUBLIC_SENTRY_DSN ||
        rc?.public?.NUXT_SENTRY_DSN ||
        rc?.public?.SENTRY_DSN ||
        ''
      const environment =
        rc?.public?.sentry?.env ||
        process.env.NUXT_PUBLIC_SENTRY_ENV ||
        rc?.public?.NUXT_SENTRY_ENV ||
        rc?.public?.SENTRY_ENV ||
        rc?.public?.appEnv ||
        'development'

      if (!dsn) {
        console.warn(`[Sentry] Client DSN not configured for ${appName}, skipping init`)
        const noop = (e: Error | string, ctx?: any) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[Sentry] client disabled:', e, ctx)
        }
        nuxtApp.provide('SE', noop)
        // @ts-ignore
        window.$SE = noop
        return
      }

      const cfg = getClientSentryConfig({ dsn, environment })
      const ok = await initClientSentry(cfg, nuxtApp)
      if (!ok) {
        const noop = (e: Error | string, ctx?: any) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[Sentry] client init failed:', e, ctx)
        }
        nuxtApp.provide('SE', noop)
        // @ts-ignore
        window.$SE = noop
        return
      }

      globalThis.__SENTRY_CLIENT_INITIALIZED__ = true

      const SE = (error: Error | string, context?: Record<string, any>, tags?: Record<string, string>) =>
        trackClientError(error, { app: appName, side: 'client', ...context }, tags)

      nuxtApp.provide('SE', SE)
      // @ts-ignore
      window.$SE = SE

      if (environment === 'development' && cfg.debug) {
        SE('Sentry client initialisation test', { test: true, app: appName }, { event: 'initialization' })
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Sentry] Client plugin loaded for ${appName}`)
      }
    } catch (err) {
      console.error(`[Sentry] Client plugin init failed for ${appName}:`, err)
      const fallback = (e: Error | string, ctx?: any) =>
        console.error(`[${appName}] Sentry client fallback:`, e, ctx)
      nuxtApp.provide('SE', fallback)
      // @ts-ignore
      window.$SE = fallback
    }
  })
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createSentryClientPlugin(appName)(nuxtApp)
})

declare global {
  var __SENTRY_CLIENT_INITIALIZED__: boolean | undefined
}
