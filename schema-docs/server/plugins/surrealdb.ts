import { Surreal } from 'surrealdb'
import { dbInstances, defaultDbInstance } from '@schema/db'

declare global {
  // eslint-disable-next-line no-var
  var surrealDb: Surreal | undefined
}

const surrealdbPlugin = defineNitroPlugin(async () => {
  if (globalThis.surrealDb) return

  const defaultKey = (defaultDbInstance || Object.keys(dbInstances)[0]) as keyof typeof dbInstances | undefined
  const defaultConfig = defaultKey ? dbInstances[defaultKey] : null
  const url = defaultConfig?.url
  const namespace = defaultConfig?.namespace
  const database = defaultConfig?.database
  const user = defaultConfig?.username
  const pass = defaultConfig?.password
  if (!url) {
    console.error('🚨 surrealdb.ts: default db instance is not configured')
  }

  if (!url || !namespace || !database || !user || !pass) {
    console.warn('[surrealdb] Missing connection config; plugin did not initialise.')
    return
  }

  const client = new Surreal()

  const signin = async () => {
    await client.connect(`${url}/rpc`)
    await client.signin({ username: user, password: pass })
    await client.use({ namespace, database })
  }

  try {
    await signin()
    console.info('[surrealdb] Connected successfully')
  } catch (e: any) {
    console.error('[surrealdb] Initial connection failed:', e?.message || e)
    throw e
  }

  const originalQuery = client.query.bind(client)
  client.query = (async (...args: any[]) => {
    try {
      return await originalQuery(...args as [any])
    } catch (e: any) {
      const msg = String(e?.message || e).toLowerCase()
      const looksExpired =
        msg.includes('token has expired') ||
        msg.includes('jwt expired') ||
        msg.includes('expired token')

      if (looksExpired) {
        console.warn('[surrealdb] JWT expired; re-signing in and retrying once...')
        try {
          await signin()
          return await originalQuery(...args as [any])
        } catch (e2: any) {
          console.error('[surrealdb] Re-signin + retry failed:', e2?.message || e2)
          throw e2
        }
      }

      throw e
    }
  }) as typeof client.query

  const KEEPALIVE_MS = 45 * 60 * 1000
  setInterval(async () => {
    try {
      await client.query('RETURN 1')
    } catch (err: any) {
      console.warn('[surrealdb] Keepalive error:', err?.message || err)
    }
  }, KEEPALIVE_MS)

  globalThis.surrealDb = client
})

export default surrealdbPlugin

export function getSurrealClient(): Surreal {
  const c = globalThis.surrealDb
  if (!c) throw new Error('SurrealDB not initialised')
  return c
}
