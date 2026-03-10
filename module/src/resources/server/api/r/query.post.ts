import { getRedis, ensureRedisReady } from '@schema/server/plugins/redis.server'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const command = body?.command
  const args = Array.isArray(body?.args) ? body.args : []

  if (!command || typeof command !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid Redis command',
    })
  }

  const redis = (event as any).context.redis ?? getRedis()

  const ready = await ensureRedisReady()
  if (!ready) {
    const msg = 'Redis not ready - check connection/credentials.'
    const appName = (useRuntimeConfig() as any)?.public?.schemaKit?.appName || 'app'
    globalThis.$SE?.(new Error(msg), { route: 'api/r/query', app: appName })
    throw createError({ statusCode: 503, statusMessage: msg })
  }

  try {
    const result = await redis.call(command, ...args)
    return { success: true, result }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown Redis error',
    }
  }
})
