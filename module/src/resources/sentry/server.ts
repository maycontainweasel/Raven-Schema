// packages/pmv2shared/sentry/server.ts

export interface SentryServerConfig {
  dsn: string
  environment: string
  tracesSampleRate: number
  profilesSampleRate: number
  debug?: boolean
  enabled?: boolean
}

/**
 * Build a consistent server-side Sentry config.
 * Dev: higher sampling + debug. Prod: conservative defaults.
 */
export function getServerSentryConfig(
  config: Partial<SentryServerConfig> & Pick<SentryServerConfig, 'dsn' | 'environment'>
): SentryServerConfig {
  const isDev = config.environment === 'development'
  return {
    tracesSampleRate: isDev ? 1.0 : 0.1,
    profilesSampleRate: isDev ? 1.0 : 0.1,
    debug: isDev,
    enabled: Boolean(config.dsn),
    ...config,
  }
}

/**
 * Initialise @sentry/node once for the process.
 * Returns true if initialised, false if skipped/failed.
 */
export async function initServerSentry(config: SentryServerConfig): Promise<boolean> {
  if (!config.enabled || !config.dsn) {
    console.warn('[Sentry] Server init skipped — DSN missing/disabled')
    return false
  }

  try {
    const Sentry: any = await import('@sentry/node')

    // v8: Sentry.getClient(), v7: Sentry.getCurrentHub().getClient()
    const getClient =
      typeof Sentry.getClient === 'function'
        ? Sentry.getClient
        : () => Sentry.getCurrentHub?.()?.getClient?.()

    const already = !!getClient?.()
    if (!already) {
      Sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        tracesSampleRate: config.tracesSampleRate,
        debug: config.debug,
        beforeSend(event: any) {
          return event
        },
      })
    }

    // sanity re-check after init
    if (!getClient?.()) {
      console.error('[Sentry] Server init did not attach a client')
      return false
    }

    console.log(`[Sentry] Server initialised (${config.environment})`)
    return true
  } catch (err) {
    console.error('[Sentry] Server init failed:', err)
    return false
  }
}

/**
 * Capture an error/message on the server. Safe to call anywhere.
 * Strings go as captureMessage (optionally honouring tags.level).
 */
export async function trackServerError(
  error: Error | string,
  context?: Record<string, any>,
  tags?: Record<string, string>
) {
  try {
    const Sentry = await import('@sentry/node')

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
      console.error('[Sentry Error]:', error, context)
    }
  } catch (sentryError) {
    // Never let Sentry failures crash your app
    console.error('[Sentry] Failed to track error:', sentryError)
    console.error('[Original Error]:', error)
  }
}