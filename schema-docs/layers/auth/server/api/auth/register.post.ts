import { createRegisterHandler } from '../../auth/handlers'
import { setSessionCookie, readSession } from '../../auth/session'
import { getSurrealDb } from '../../auth/surreal-auth.service'
import { getSurrealClient } from '@schema/server/plugins/surrealdb.server'
import { LRS } from '@schema/utils/lrs'

export default createRegisterHandler({
  setSessionCookie,
  clearSessionCookie: () => {}, // Not used in register handler
  readSession,
  getSurrealDb,
  getSurrealClient,
  LRS,
})
