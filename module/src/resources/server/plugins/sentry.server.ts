import { eventHandler } from 'h3'
import { getServerSentryConfig, initServerSentry, trackServerError } from '@schema/sentry/server'

function createSentryServerPlugin(appName: string) {
  return defineNitroPlugin(async (nitroApp) => {
    if (globalThis.__SENTRY_INITIALIZED__) return

    const rc = useRuntimeConfig() as any
    const sentryDsn =
      rc?.sentry?.dsn ||
      process.env.NUXT_SENTRY_DSN ||
      process.env.SENTRY_DSN ||
      ''
    const sentryEnv =
      rc?.sentry?.env ||
      process.env.NUXT_SENTRY_ENV ||
      process.env.SENTRY_ENV ||
      process.env.NODE_ENV ||
      'development'

    const noopSE = (error: Error | string, context?: Record<string, any>, tags?: Record<string, string>) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Sentry disabled:${appName}]`, error, context, tags)
      }
    }

    nitroApp.h3App.use(
      eventHandler((event) => {
        // @ts-expect-error augment context at runtime
        event.context.SE = (globalThis.$SE || noopSE)
      })
    )

    if (!sentryDsn) {
      console.warn(`[Sentry] DSN not configured for ${appName}, skipping init`)
      globalThis.$SE = noopSE
      return
    }

    const cfg = getServerSentryConfig({ dsn: sentryDsn, environment: sentryEnv })
    const ok = await initServerSentry(cfg)
    if (!ok) {
      globalThis.$SE = noopSE
      return
    }

    globalThis.__SENTRY_INITIALIZED__ = true
    globalThis.$SE = (error: Error | string, context?: Record<string, any>, tags?: Record<string, string>) => {
      trackServerError(error, { app: appName, side: 'server', ...context }, tags)
        .catch((err) => console.error('[Sentry] Error tracking failed:', err))
    }

    console.log(`[Sentry] Server plugin loaded successfully for ${appName}`)
  })
}

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createSentryServerPlugin(appName)(nitroApp)
})

declare global {
  var __SENTRY_INITIALIZED__: boolean | undefined
  var $SE: (error: Error | string, context?: Record<string, any>, tags?: Record<string, string>) => void
}
