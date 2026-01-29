import { createMeHandler } from '../../auth/handlers'
import { readSession } from '../../auth/session'
import { getSurrealClient } from '@schema/server/plugins/surrealdb.server'
import { LRS } from '@schema/utils/lrs'

export default createMeHandler({
  setSessionCookie: async () => {}, // Not used in me handler
  clearSessionCookie: () => {}, // Not used in me handler
  readSession,
  getSurrealDb: () => ({ login: async () => ({ uid: null, roles: [] }), register: async () => ({ uid: null, roles: [] }) }), // Not used in me handler
  getSurrealClient,
  LRS,
})
