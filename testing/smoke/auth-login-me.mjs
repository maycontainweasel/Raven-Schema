/*
  Smoke test for /api/auth/login + /api/auth/me.

  Usage:
    AUTH_BASE_URL=https://example.com \
    AUTH_EMAIL=user@example.com \
    AUTH_PASSWORD=secret \
    node testing/smoke/auth-login-me.mjs

  Optional:
    AUTH_LOGIN_ENDPOINT=/api/auth/login
    AUTH_ME_ENDPOINT=/api/auth/me
    AUTH_SESSION_COOKIE=sid
*/

const baseUrl = process.env.AUTH_BASE_URL
const email = process.env.AUTH_EMAIL
const password = process.env.AUTH_PASSWORD
const loginEndpoint = process.env.AUTH_LOGIN_ENDPOINT || '/api/auth/login'
const meEndpoint = process.env.AUTH_ME_ENDPOINT || '/api/auth/me'
const sessionCookieName =
  process.env.AUTH_SESSION_COOKIE ||
  process.env.NUXT_SESSION_COOKIE ||
  'sid'

if (!baseUrl) {
  console.error('AUTH_BASE_URL is required')
  process.exit(1)
}
if (!email || !password) {
  console.error('AUTH_EMAIL and AUTH_PASSWORD are required')
  process.exit(1)
}

const loginUrl = new URL(loginEndpoint, baseUrl).toString()
const meUrl = new URL(meEndpoint, baseUrl).toString()

const parseSessionCookie = (setCookieHeaders, cookieName) => {
  const headers = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : typeof setCookieHeaders === 'string'
      ? [setCookieHeaders]
      : []

  for (const header of headers) {
    const parts = header.split(';')[0].split('=')
    const name = parts[0]?.trim()
    if (name === cookieName) {
      return `${name}=${parts.slice(1).join('=')}`
    }
  }
  return null
}

const readJson = async (res) => {
  const text = await res.text()
  try {
    return { json: JSON.parse(text), text }
  } catch {
    return { json: null, text }
  }
}

try {
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const { json: loginJson, text: loginText } = await readJson(loginRes)

  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status} ${loginRes.statusText}`)
    if (loginJson) console.error(JSON.stringify(loginJson, null, 2))
    else console.error(loginText)
    process.exit(1)
  }

  const rawSetCookie = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : loginRes.headers.get('set-cookie')

  const sessionCookie = parseSessionCookie(rawSetCookie, sessionCookieName)

  if (!sessionCookie) {
    console.error(`Login succeeded but no ${sessionCookieName} cookie found.`)
    if (loginJson) console.error(JSON.stringify(loginJson, null, 2))
    process.exit(1)
  }

  console.log('Login ok, got session cookie.')

  const meRes = await fetch(meUrl, {
    method: 'GET',
    headers: {
      cookie: sessionCookie,
    },
  })

  const { json: meJson, text: meText } = await readJson(meRes)

  if (!meRes.ok) {
    console.error(`Auth /me failed: ${meRes.status} ${meRes.statusText}`)
    if (meJson) console.error(JSON.stringify(meJson, null, 2))
    else console.error(meText)
    process.exit(1)
  }

  if (meJson) {
    const ok = Boolean(meJson?.id || meJson?.uid)
    console.log('Auth /me response ok:', ok)
    console.log(JSON.stringify(meJson, null, 2))
  } else {
    console.log('Auth /me response:', meText)
  }
} catch (err) {
  console.error('Auth login/me request failed:', err)
  process.exit(1)
}
