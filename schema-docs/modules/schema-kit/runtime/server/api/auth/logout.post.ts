import { createLogoutHandler } from '@schema/server/auth/handlers'
import { clearSessionCookie } from '@schema/server/auth/session'

export default createLogoutHandler({
  setSessionCookie: async () => {}, // Not used in logout handler
  clearSessionCookie,
  readSession: async () => null, // Not used in logout handler
  getSurrealDb: () => ({ login: async () => ({ uid: null, roles: [] }), register: async () => ({ uid: null, roles: [] }) }), // Not used in logout handler
  getSurrealClient: () => null, // Not used in logout handler
  LRS: async () => null, // Not used in logout handler
})
