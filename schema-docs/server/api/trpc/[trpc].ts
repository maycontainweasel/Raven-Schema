import { toWebRequest } from 'h3'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '~~/server/trpc/routers/_app'
import { createContext } from '~~/server/trpc/context'

export default eventHandler(async (event) => {
  const req = toWebRequest(event)
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(event),
  })
})
