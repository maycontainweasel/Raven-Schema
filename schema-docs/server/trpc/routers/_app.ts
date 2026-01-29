import { t } from '../context'
import { generatedRouters } from './generated'
import { apiAttemptRouter } from './apiAttempt'
import { apiRouter } from './api'

export const appRouter = t.router({
  ...generatedRouters,
  apiAttempt: apiAttemptRouter,
  api: apiRouter,
})

export type AppRouter = typeof appRouter
