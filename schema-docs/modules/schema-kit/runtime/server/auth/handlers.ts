import type { EventHandler } from 'h3'
import { readBody, setResponseStatus, defineEventHandler } from 'h3'

export type AuthHandlerOptions = {
  // Session utilities - these need to be provided by each app
  setSessionCookie: (event: any, sessionData: any) => Promise<void>
  clearSessionCookie: (event: any) => void
  readSession: (event: any) => Promise<any>
  
  // SurrealDB services - these need to be provided by each app
  getSurrealDb: () => { 
    login: (email: string, password: string) => Promise<{ uid: any, roles: any }>
    register: (data: { email: string, password: string, firstName: string, surname: string, role?: string }) => Promise<{ uid: any, roles: any }>
  }
  getSurrealClient: () => any
  LRS: (result: any) => Promise<any>
}

export function createLoginHandler(options: AuthHandlerOptions): EventHandler {
  const { setSessionCookie, readSession, getSurrealDb, getSurrealClient, LRS, clearSessionCookie } = options
  
  return defineEventHandler(async (event) => {
    console.log('🔐 [LOGIN] Starting login attempt...', event)
    
    try {
      const body = await readBody<{ email?: string; password?: string }>(event)
      console.log('🔐 [LOGIN] Request body received:', { 
        email: body?.email, 
        password: body?.password,
        hasPassword: !!body?.password 
      })
      
      if (!body?.email || !body?.password) {
        console.log('🔐 [LOGIN] Missing credentials')
        setResponseStatus(event, 400)
        return { ok: false, error: 'Missing email/password' }
      }

      // Clear any existing session cookies before login
      console.log('🔐 [LOGIN] Clearing any existing session cookies...')
      clearSessionCookie(event)

      console.log('🔐 [LOGIN] Calling SurrealDB login service...')
      const { uid, roles } = await getSurrealDb().login(body.email, body.password)
      const roleKeys = Array.isArray(roles) ? roles : (roles ? [String(roles)] : [])

      console.log('🔐 [LOGIN] SurrealDB login successful:', { uid, roles: roleKeys })
      
      console.log('🔐 [LOGIN] Setting session cookie...')
      const sessionData = { uid, roles: roleKeys, iat: Date.now() }
      await setSessionCookie(event, sessionData)
      console.log('🔐 [LOGIN] Session cookie set successfully:', sessionData)
      
      console.log('🔐 [LOGIN] Getting full UserRecord...')

      console.log('🔐 [LOGIN] here uid', uid)
      
      try {
        // Use role-based initialization
        console.log('🔐 [LOGIN] Getting UserRecord for email:', body.email, 'with role:', user.role.key)
        const db = getSurrealClient()
        
        // Determine which initialization function to call based on role
        let initFunction: string
        if (roleKeys.includes('super')) {
          initFunction = 'fn::initResourceSuper'
          console.log('🔐 [LOGIN] Using super user initialization function')
        } else {
          initFunction = 'fn::initUserResourcePublic'
          console.log('🔐 [LOGIN] Using standard user initialization function')
        }
        
        const query = `return ${initFunction}(type::record("u", $userID));`
        const result = await db.query(query, { userID: body.email })
        const userRecord = await LRS(result)
        
        if (userRecord) {
          console.log('🔐 [LOGIN] UserRecord retrieved successfully:', {
            id: userRecord.id,
            firstName: userRecord.firstName,
            surname: userRecord.surname,
            email: userRecord.email,
            role: roleKeys[0]
          })
          return { ok: true, userRecord }
        } else {
          console.log('🔐 [LOGIN] No UserRecord returned, falling back to basic response')
          return { ok: true }
        }
        
      } catch (userRecordError: any) {
        console.error('🔐 [LOGIN] Error getting UserRecord:', userRecordError.message)
        // Don't fail the login if UserRecord retrieval fails
        return { ok: true }
      }
      
    } catch (error: any) {
      console.error('🔐 [LOGIN] Login error:', {
        message: error.message,
        // REMOVED: stack: error.stack - avoid V8 crash
        statusCode: error.statusCode
      })
      
      // Only clear session on authentication failure
      console.log('🔐 [LOGIN] Authentication failed, clearing any existing session...')
      clearSessionCookie(event)
      
      setResponseStatus(event, error.statusCode || 500)
      return { 
        ok: false, 
        error: error.statusMessage || error.message || 'Login failed'
      }
    }
  })
}

export function createLogoutHandler(options: AuthHandlerOptions): EventHandler {
  const { clearSessionCookie } = options
  
  return defineEventHandler(async (event) => {
    clearSessionCookie(event)
    return { ok: true }
  })
}

export function createMeHandler(options: AuthHandlerOptions): EventHandler {
  const { readSession, getSurrealClient, LRS } = options
  
  return defineEventHandler(async (event) => {
    console.log('🔍 [ME] Starting /me endpoint...')
    
    try {
      const session = await readSession(event)
      
      if (!session || !session.uid) {
        console.log('🔍 [ME] No valid session found')
        return { uid: null }
      }
      
      console.log('🔍 [ME] Session found:', { uid: session.uid, roles: session.roles })
      
      // Get SurrealDB client
      const db = getSurrealClient()
      
      // Handle RecordID format - extract the email for the SurrealDB function
      const UID = session.uid

      if(!UID) {
        console.log('🔍 [ME] No UID found in session')
        return { uid: null }
      }
      
      console.log('🔍 [ME] Using UID for role-based initialization:', UID, 'with roles:', session.roles)
      
      // Determine which initialization function to call based on role
      let initFunction: string
      if (session.roles && session.roles.includes('super')) {
        initFunction = 'fn::initResourceSuper'
        console.log('🔍 [ME] Using super user initialization function')
      } else if (session.roles && session.roles.includes('admin')) {
        initFunction = 'fn::initResourceAdmin'
        console.log('🔍 [ME] Using admin user initialization function')
      } else {
        initFunction = 'fn::initUserResourcePublic'
        console.log('🔍 [ME] Using standard user initialization function')
      }
      
      // Call appropriate function with the email (not user ID)
      const query = `
        return ${initFunction}(<record> $UID);
      `
      
      //console.log('🔍 [ME] SurrealDB Query:', query)
     // console.log('🔍 [ME] Query parameters:', { UID: UID })
      
      const result = await db.query(query, { UID: UID })
      //console.log('🔍 [ME] Raw SurrealDB result:', JSON.stringify(result, null, 2))
      
      // Use LRS to get the last record
      const lrsResult = await LRS(result)
      //console.log('🔍 [ME] LRS processed result:', lrsResult)
      
      // Extract userRecord from array if it's wrapped
      const userRecord = Array.isArray(lrsResult) ? lrsResult[0] : lrsResult
      
      if (!userRecord) {
        console.log(`🔍 [ME] No user record returned from ${initFunction}`)
        return { uid: null, error: 'User record not found' }
      }
      
      console.log('🔍 [ME] Successfully retrieved UserRecord:', {
        id: userRecord.id,
        firstName: userRecord.firstName,
        surname: userRecord.surname,
        email: userRecord.email,
        role: userRecord.role,
        trialStartDate: userRecord.access?.trial?.startDate
      })
      
      return userRecord  // now travels through superjson ↔︎ Date intact
      
    } catch (error: any) {
      console.error('🔍 [ME] Error in /me endpoint:', {
        message: error.message,
        // REMOVED: stack: error.stack - avoid V8 crash
      })
      
      return { 
        uid: null, 
        error: error.message || 'Failed to get user data' 
      }
    }
  })
}

export function createRegisterHandler(options: AuthHandlerOptions): EventHandler {
  const { setSessionCookie, getSurrealDb, getSurrealClient, LRS } = options
  
  return defineEventHandler(async (event) => {
    console.log('📝 [REGISTER] Starting registration attempt...')
    
    try {
      const body = await readBody<{ 
        email?: string
        password?: string
        firstName?: string
        surname?: string
        role?: string
      }>(event)
      
      console.log('📝 [REGISTER] Request body received:', { 
        email: body?.email,
        firstName: body?.firstName,
        surname: body?.surname,
        hasPassword: !!body?.password 
      })
      
      if (!body?.email || !body?.password || !body?.firstName || !body?.surname) {
        console.log('📝 [REGISTER] Missing required fields')
        setResponseStatus(event, 400)
        return { ok: false, error: 'Missing required fields' }
      }

      console.log('📝 [REGISTER] Calling SurrealDB register service...')
      const { uid, roles } = await getSurrealDb().register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        surname: body.surname,
        role: body.role
      })
      
      console.log('📝 [REGISTER] SurrealDB registration successful:', { 
        uid, 
        uidType: typeof uid,
        uidKeys: typeof uid === 'object' ? Object.keys(uid) : 'N/A',
        roles 
      })
      
      console.log('📝 [REGISTER] Setting session cookie...')
      const sessionData = { uid, roles, iat: Date.now() }
      await setSessionCookie(event, sessionData)
      console.log('📝 [REGISTER] Session cookie set successfully:', sessionData)
      
      // Get the full user record after registration
      try {
        console.log('📝 [REGISTER] Getting UserRecord for new user...')
        const db = getSurrealClient()
        
        // Use standard user initialization
        const initFunction = 'fn::initUserResourcePublic'
        const query = `return ${initFunction}(type::record("u", $userEmail));`
        console.log('📝 [REGISTER] SurrealDB Query:', query)
        const result = await db.query(query, { userEmail: body.email })
        const userRecord = await LRS(result)
        
        if (userRecord) {
          console.log('📝 [REGISTER] UserRecord retrieved successfully:', {
            id: userRecord.id,
            firstName: userRecord.firstName,
            surname: userRecord.surname,
            email: userRecord.email
          })
          return { ok: true, userRecord }
        } else {
          console.log('📝 [REGISTER] No UserRecord returned, falling back to basic response')
          return { ok: true }
        }
        
      } catch (userRecordError: any) {
        console.error('📝 [REGISTER] Error getting UserRecord:', userRecordError.message)
        // Don't fail the registration if UserRecord retrieval fails
        return { ok: true }
      }
      
    } catch (error: any) {
      console.error('📝 [REGISTER] Registration error:', {
        message: error.message,
        statusCode: error.statusCode
      })
      
      setResponseStatus(event, error.statusCode || 500)
      return { 
        ok: false, 
        error: error.statusMessage || error.message || 'Registration failed'
      }
    }
  })
}
