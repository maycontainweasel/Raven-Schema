import { createLoginHandler } from '../../auth/handlers'
import { setSessionCookie, clearSessionCookie, readSession } from '../../auth/session'
import { getSurrealDb } from '../../auth/surreal-auth.service'
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
