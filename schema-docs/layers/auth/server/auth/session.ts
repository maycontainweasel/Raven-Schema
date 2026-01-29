// packages/pmv2shared/auth/session.ts
import { seal, unseal, defaults as ironDefaults } from 'iron-webcrypto'
import { webcrypto as crypto } from 'node:crypto'
import { setCookie, getCookie } from 'h3'
import type { H3Event } from 'h3'
import {
  getAllCookieNames,
  getClearCookieOptions,
  getCookieOptions,
  defaultAuthConfig,
  resolveAuthConfig,
} from './config'

/**
 * Shape stored in the cookie
 */
export interface Session {
  uid: string          // e.g. 'u:⟨email@example.com⟩'
  roles: string[]
  iat: number          // issued-at (ms)
}

/**
 * Read auth runtime config with sensible fallbacks to env.
 * You can set these in nuxt.config.ts under runtimeConfig.auth.* or via env:
 *  - NUXT_SESSION_SECRET 
 *  - NUXT_COOKIE_DOMAIN 
 *  - NUXT_SESSION_COOKIE 
 */
function getRuntimeAuth() {
  const rc: any =
    typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}
  const auth = rc?.auth || {}
  const authConfig = resolveAuthConfig()

  // allow both rc.auth.sessionSecret and rc.sessionSecret (top-level) as sources
  const sessionSecret =
    auth.sessionSecret ||
    rc.sessionSecret ||
    process.env.NUXT_SESSION_SECRET ||
    ''

  // allow auth.cookieDomain, rc.public.cookieDomain, env
  const cookieDomain =
    auth.cookieDomain ||
    rc.public?.auth?.cookieDomain ||
    rc.public?.cookieDomain ||
    process.env.NUXT_COOKIE_DOMAIN ||
    undefined

  // prefer explicit auth.sessionCookie; then rc.public.sessionCookie; then env; then default
  const sessionCookie =
    auth.sessionCookie ||
    rc.public?.auth?.sessionCookie ||
    rc.public?.sessionCookie ||
    process.env.NUXT_SESSION_COOKIE ||
    authConfig.cookie.sessionCookie

  const isDev = process.env.NODE_ENV !== 'production'
  return { sessionSecret, cookieDomain, sessionCookie, isDev, authConfig }
}

const buildIronOpts = (ttlSeconds: number) => ({
  ...ironDefaults,
  ttl: ttlSeconds * 1000,
  encryption: ironDefaults.encryption,
  integrity: ironDefaults.integrity,
})

/**
 * Set signed, encrypted session cookie
 */
export async function setSessionCookie(event: H3Event, session: Session) {
  const { sessionSecret, cookieDomain, sessionCookie, isDev, authConfig } = getRuntimeAuth()

  if (!sessionSecret) {
    console.error('🍪 [SESSION] Missing session secret!')
    throw new Error('Session secret is required')
  }

  const sealed = await seal(
    crypto,
    session,
    sessionSecret,
    buildIronOpts(authConfig.sessionDuration || defaultAuthConfig.sessionDuration)
  )

  const opts = getCookieOptions(isDev, cookieDomain, authConfig)
  setCookie(event, sessionCookie, sealed, opts)
}

/**
 * Read + refresh (if needed) session from cookie
 */
export async function readSession(event: H3Event): Promise<Session | null> {
  const { sessionSecret, sessionCookie, authConfig } = getRuntimeAuth()

  try {
    const sealed = getCookie(event, sessionCookie)
    if (!sealed) return null

    const session = (await unseal(
      crypto,
      sealed,
      sessionSecret,
      buildIronOpts(authConfig.sessionDuration || defaultAuthConfig.sessionDuration)
    )) as Session

    // Refresh iat if older than configured refresh interval
    const now = Date.now()
    const sessionAge = now - session.iat
    const refreshThreshold = authConfig.refreshInterval || defaultAuthConfig.refreshInterval // e.g. 12 minutes

    if (sessionAge > refreshThreshold) {
      session.iat = now
      await setSessionCookie(event, session)
    }

    return session
  } catch (error: any) {
    // If token expired, clear cookie set
    if (String(error?.message || '').includes('expired')) {
      clearSessionCookie(event)
    }
    return null
  }
}

/**
 * Clear all auth-related cookies (names provided by defaultAuthConfig)
 */
export function clearSessionCookie(event: H3Event) {
  const { cookieDomain, isDev, sessionCookie, authConfig } = getRuntimeAuth()

  const runtimeConfig = {
    ...authConfig,
    cookie: {
      ...authConfig.cookie,
      sessionCookie,
    },
  }

  const cookieNames = getAllCookieNames(runtimeConfig)
  const opts = getClearCookieOptions(isDev, cookieDomain, runtimeConfig)

  for (const name of cookieNames) setCookie(event, name, '', opts)
  for (const name of cookieNames) {
    for (const path of authConfig.appPaths || defaultAuthConfig.appPaths) {
      setCookie(event, name, '', { ...opts, path })
    }
  }
}
