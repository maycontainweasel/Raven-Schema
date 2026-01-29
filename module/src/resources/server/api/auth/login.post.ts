import { createLoginHandler } from '@schema/server/auth/handlers'
import { setSessionCookie, clearSessionCookie, readSession } from '@schema/server/auth/session'
import { getSurrealDb } from '@schema/server/auth/surreal-auth.service'
import { getSurrealClient } from '@schema/server/plugins/surrealdb.server'
import { LRS } from '@schema/utils/lrs'

export default createLoginHandler({
  setSessionCookie,
  clearSessionCookie,
  readSession,
  getSurrealDb,
  getSurrealClient,
  LRS,
})
