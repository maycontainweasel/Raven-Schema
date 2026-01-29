/*
  Smoke test for /api/auth/me.
  Usage:
    AUTH_BASE_URL=https://example.com AUTH_COOKIE="sid=..." node testing/smoke/auth-me.mjs
*/

const baseUrl = process.env.AUTH_BASE_URL
const cookie = process.env.AUTH_COOKIE
const endpoint = process.env.AUTH_ME_ENDPOINT || '/api/auth/me'

if (!baseUrl) {
  console.error('AUTH_BASE_URL is required')
  process.exit(1)
}
if (!cookie) {
  console.error('AUTH_COOKIE is required (e.g. "sid=...")')
  process.exit(1)
}

const url = new URL(endpoint, baseUrl).toString()

try {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      cookie,
    },
  })

  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // ignore JSON parse errors; keep raw text
  }

  if (!res.ok) {
    console.error(`Auth /me failed: ${res.status} ${res.statusText}`)
    if (json) {
      console.error(JSON.stringify(json, null, 2))
    } else {
      console.error(text)
    }
    process.exit(1)
  }

  if (json) {
    const ok = Boolean(json?.id || json?.uid)
    console.log('Auth /me response ok:', ok)
    console.log(JSON.stringify(json, null, 2))
  } else {
    console.log('Auth /me response:', text)
  }
} catch (err) {
  console.error('Auth /me request failed:', err)
  process.exit(1)
}
