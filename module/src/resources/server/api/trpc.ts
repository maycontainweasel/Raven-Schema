import { toWebRequest, createError } from 'h3'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createContext } from '@schema/server/trpc/context'

const ROUTER_PATH = join(process.cwd(), 'server', 'trpc', 'routers')
const APP_ROUTER_PATH = join(ROUTER_PATH, '_app.ts')
const API_ROUTER_PATH = join(ROUTER_PATH, 'api.ts')
const GENERATED_INDEX_PATH = join(ROUTER_PATH, 'generated', 'index.ts')

async function ensureRouterScaffold() {
  if (process.env.NODE_ENV === 'production') return
  const hasApp = await stat(APP_ROUTER_PATH).catch(() => null)
  if (hasApp?.isFile()) return
  await mkdir(join(ROUTER_PATH, 'generated'), { recursive: true })
  await writeFile(
    GENERATED_INDEX_PATH,
    `export const generatedRouters = {}\n`,
    'utf-8'
  )
  await writeFile(
    API_ROUTER_PATH,
    `import { t } from '@schema/server/trpc/context'

export const dbRouter = t.router({})
export const apiRouter = t.router({})
`,
    'utf-8'
  )
  await writeFile(
    APP_ROUTER_PATH,
    `import { t } from '@schema/server/trpc/context'
import { generatedRouters } from './generated'
import { apiRouter, dbRouter } from './api'

export const appRouter = t.router({
  ...generatedRouters,
  db: dbRouter,
  api: apiRouter,
})

export type AppRouter = typeof appRouter
`,
    'utf-8'
  )
}

async function resolveAppRouter() {
  try {
    const mod = await import('~~/server/trpc/routers/_app')
    if (mod?.appRouter) return mod.appRouter
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      await ensureRouterScaffold()
      try {
        const mod = await import('~~/server/trpc/routers/_app')
        if (mod?.appRouter) return mod.appRouter
      } catch {}
    }
  }
  return null
}

export default eventHandler(async (event) => {
  const router = await resolveAppRouter()
  if (!router) {
    throw createError({
      statusCode: 500,
      statusMessage: 'tRPC router missing (run site:setup --fix to scaffold server/trpc).',
    })
  }
  const req = toWebRequest(event)
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router,
    createContext: () => createContext(event),
  })
})
