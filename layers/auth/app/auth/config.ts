/**
 * Unified authentication configuration for all PassMed V2 applications.
 * Shared between client + server usage.
 */

export interface AuthCookieConfig {
  sessionCookie: string
  legacyCookieNames: string[]
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  path: string
  maxAge: number
  domain?: string
}

export interface AuthConfig {
  sessionDuration: number
  cookie: AuthCookieConfig
  appPaths: string[]
  refreshInterval: number
}

export const defaultAuthConfig: AuthConfig = {
  sessionDuration: 7 * 24 * 60 * 60,
  cookie: {
    sessionCookie: 'sid',
    legacyCookieNames: [
      'token',
      'sessionId',
      'refreshToken',
      'surreal_access',
      'surreal_refresh',
    ],
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    domain: undefined,
  },
  appPaths: ['/', '/dashboard/', '/dashboard'],
  refreshInterval: 12 * 60 * 1000,
}

export function resolveAuthConfig(): AuthConfig {
  try {
    // @ts-ignore - available in Nuxt runtime
    const rc = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : null
    const auth = rc?.auth || {}
    const publicAuth = rc?.public?.auth || {}

    const sessionCookie =
      auth.sessionCookie ||
      publicAuth.sessionCookie ||
      rc?.public?.sessionCookie ||
      process.env.NUXT_SESSION_COOKIE ||
      defaultAuthConfig.cookie.sessionCookie

    const sessionDuration =
      typeof auth.sessionDuration === 'number'
        ? auth.sessionDuration
        : defaultAuthConfig.sessionDuration

    const refreshInterval =
      typeof auth.refreshInterval === 'number'
        ? auth.refreshInterval
        : defaultAuthConfig.refreshInterval

    const cookieOverrides = auth.cookie || {}
    const cookieMaxAge =
      typeof cookieOverrides.maxAge === 'number'
        ? cookieOverrides.maxAge
        : sessionDuration

    return {
      ...defaultAuthConfig,
      sessionDuration,
      refreshInterval,
      cookie: {
        ...defaultAuthConfig.cookie,
        ...cookieOverrides,
        sessionCookie,
        maxAge: cookieMaxAge,
      },
      appPaths: Array.isArray(auth.appPaths) && auth.appPaths.length > 0 ? auth.appPaths : defaultAuthConfig.appPaths,
    }
  } catch {
    // fallback to defaults
  }
  return defaultAuthConfig
}

export function getAllCookieNames(config: AuthConfig = defaultAuthConfig): string[] {
  return [config.cookie.sessionCookie, ...config.cookie.legacyCookieNames]
}

export function getCookieOptions(
  isDevelopment: boolean = false,
  domain?: string,
  config: AuthConfig = defaultAuthConfig
): Record<string, any> {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.cookie.maxAge,
    ...(domain ? { domain } : {}),
  }
}

export function getClearCookieOptions(
  isDevelopment: boolean = false,
  domain?: string,
  config: AuthConfig = defaultAuthConfig
): Record<string, any> {
  return {
    ...getCookieOptions(isDevelopment, domain, config),
    maxAge: 0,
  }
}

export function generateCookieClearCommands(
  hostname: string,
  config: AuthConfig = resolveAuthConfig()
): string[] {
  const commands: string[] = []
  const expiredDate = 'Thu, 01 Jan 1970 00:00:00 UTC'
  const cookieNames = getAllCookieNames(config)

  const hostParts = hostname.split('.')
  const rootDomain = hostParts.length > 2 ? hostParts.slice(-2).join('.') : hostname

  const domains = ['', hostname, `.${hostname}`, `.${rootDomain}`]

  for (const cookieName of cookieNames) {
    for (const path of config.appPaths) {
      for (const domain of domains) {
        const domainPart = domain ? `; domain=${domain}` : ''
        commands.push(`${cookieName}=; expires=${expiredDate}; path=${path}${domainPart}`)
      }
    }
  }

  return commands
}
