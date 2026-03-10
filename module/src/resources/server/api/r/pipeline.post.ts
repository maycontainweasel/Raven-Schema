import { getRedis, ensureRedisReady } from '@schema/server/plugins/redis.server'

type PipelineCommand = {
  command: string
  args?: Array<string | number>
}

function normalizeCommands(input: unknown): PipelineCommand[] {
  if (!Array.isArray(input)) return []
  const normalized: PipelineCommand[] = []

  for (const item of input) {
    if (Array.isArray(item) && typeof item[0] === 'string') {
      normalized.push({
        command: item[0],
        args: Array.isArray(item[1]) ? item[1] : [],
      })
      continue
    }

    if (item && typeof item === 'object' && typeof (item as any).command === 'string') {
      normalized.push({
        command: (item as any).command,
        args: Array.isArray((item as any).args) ? (item as any).args : [],
      })
    }
  }

  return normalized
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rawCommands = Array.isArray(body) ? body : body?.commands
  const commands = normalizeCommands(rawCommands)

  if (!commands.length) {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Invalid pipeline payload. Expected commands as [{ command, args }] or [[command,args]].',
    })
  }

  const redis = (event as any).context.redis ?? getRedis()

  const ready = await ensureRedisReady()
  if (!ready) {
    const msg = 'Redis not ready - check connection/credentials.'
    const appName = (useRuntimeConfig() as any)?.public?.schemaKit?.appName || 'app'
    globalThis.$SE?.(new Error(msg), { route: 'api/r/pipeline', app: appName })
    throw createError({ statusCode: 503, statusMessage: msg })
  }

  try {
    const pipeline = redis.pipeline()

    for (const item of commands) {
      const redisCommand = item.command.toLowerCase()
      const fn = (pipeline as any)[redisCommand]
      if (typeof fn !== 'function') {
        console.warn(`[redis] Unknown pipeline command: ${redisCommand}`)
        continue
      }
      fn.apply(pipeline, item.args ?? [])
    }

    const results = await pipeline.exec()

    if (!Array.isArray(results)) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Invalid pipeline execution result. Expected an array.',
      })
    }

    return results.map(([error, result]) => {
      if (error) {
        return {
          success: false,
          error: error.message || 'Unknown Redis error',
          result: null,
        }
      }
      return { success: true, result }
    })
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Pipeline execution failed',
    }
  }
})
