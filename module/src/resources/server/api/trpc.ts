import { toWebRequest, createError } from 'h3'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createContext } from '@schema/server/trpc/context'

async function resolveAppRouter() {
  try {
    const mod = await import('~~/server/trpc/routers/_app')
    if (mod?.appRouter) return mod.appRouter
  } catch {}
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
