// packages/pmv2shared/sentry/client.ts

export interface SentryClientConfig {
  dsn: string
  environment: string
  tracesSampleRate: number
  debug?: boolean
  enabled?: boolean
}

export function getClientSentryConfig(
  config: Partial<SentryClientConfig> & Pick<SentryClientConfig, 'dsn' | 'environment'>
): SentryClientConfig {
  const isDev = config.environment === 'development'
  return {
    tracesSampleRate: isDev ? 1.0 : 0.1,
    debug: isDev,
    enabled: Boolean(config.dsn),
    ...config,
  }
}

/**
 * Initialise Sentry for Vue (Nuxt client) — must receive the Vue app (and router if you want tracing).
 */
export async function initClientSentry(config: SentryClientConfig, nuxtApp: any) {
  if (!config.enabled || !config.dsn) {
    console.warn('[Sentry] Client init skipped – DSN missing/disabled')
    return false
  }

  try {
    const Sentry: any = await import('@sentry/vue')

    // v8: Sentry.getClient(), v7: Sentry.getCurrentHub()?.getClient()
    const getClient =
      typeof Sentry.getClient === 'function'
        ? Sentry.getClient
        : () => Sentry.getCurrentHub?.()?.getClient?.()

    const router = nuxtApp.$router
    const integrations: any[] = []

    // Browser tracing integration (works in v7/v8). We pass both router and routingInstrumentation when available.
    if (router && typeof Sentry.browserTracingIntegration === 'function') {
      const opts: any = { router } // v8 accepts { router }
      if (typeof Sentry.vueRouterInstrumentation === 'function') {
        // v7/v8 compatible fallback
        opts.routingInstrumentation = Sentry.vueRouterInstrumentation(router)
      }
      integrations.push(Sentry.browserTracingIntegration(opts))
    }

    // Prevent double init
    if (!getClient?.()) {
      Sentry.init({
        app: nuxtApp.vueApp, // REQUIRED for @sentry/vue with Vue 3
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate,
        debug: config.debug,
        integrations,
        beforeSend(event: any) {
          const msg = event?.exception?.values?.[0]?.value || ''
          if (typeof msg === 'string' && msg.includes('ResizeObserver')) return null
          return event
        },
      })
    }

    // Sanity re-check
    if (!getClient?.()) {
      console.error('[Sentry] Client init did not attach a client')
      return false
    }

    console.log(`[Sentry] Client initialised (${config.environment})`)
    return true
  } catch (err) {
    console.error('[Sentry] Client init failed:', err)
    return false
  }
}

/**
 * Global client-side capture wrapper (keeps your signature).
 * Uses @sentry/vue, assumes initClientSentry ran successfully.
 */
export async function trackClientError(
  error: Error | string,
  context?: Record<string, any>,
  tags?: Record<string, string>
) {
  try {
    const Sentry: any = await import('@sentry/vue')

    Sentry.withScope((scope: any) => {
      if (context) Object.keys(context).forEach((k) => scope.setExtra(k, context[k]))
      if (tags) Object.keys(tags).forEach((k) => scope.setTag(k, tags[k]))

      if (typeof error === 'string') {
        const level = (tags?.level as any) || 'error'
        Sentry.captureMessage(error, level)
      } else {
        Sentry.captureException(error)
      }
    })

    if (process.env.NODE_ENV !== 'production') {
      console.error('[Sentry Client Error]:', error, context)
    }
  } catch (e) {
    console.error('[Sentry] Failed to track client error:', e)
    console.error('[Original Error]:', error)
  }
}