import { defineStore } from 'pinia'

type Exam = any

// Define types for the auth store
interface AuthRootState {
  storeLabel: string
  errorConsoleLogs: boolean
  refreshing: boolean
  loggingOut: boolean
  loggedIn: boolean
  userIsLoggedIn: boolean
  authenticating: boolean
  sessionToken: AuthSessionToken | null
  sessionValidating: boolean
  user: UserRecord | Record<string, any>
  subStatus: SubscriptionStatus
  trial: {
    exam: string
    id: string
    questionsComplete: boolean
    sessionStarted: boolean
    sid: string
    startDate: string
  }
}

type AuthSessionToken = {
  id: string
  token: string
  userId: string
  expiresAt: Date
}

type SubscriptionStatus = 'none' | 'free' | 'trial' | 'subscription'

interface UserRecord {
  id: any
  firstName: string
  surname: string
  title: string
  uniqueID: string
  instance: string
  email: string
  role: any
  access?: {
    access?: SubscriptionStatus
    trial?: any
    subscriptions?: any[]
  }
  profile?: any
  settings?: any
  [key: string]: any
}

const baseUseAuthStore = defineStore('authstore', {
  state: (): AuthRootState => ({
    storeLabel: 'Auth',
    errorConsoleLogs: true,

    refreshing: false,
    loggingOut: false,

    loggedIn: false,
    userIsLoggedIn: false,
    authenticating: false,

    // Secure session
    sessionToken: null,
    sessionValidating: false,

    user: {
      id: "",
      firstName: "",
      surname: "",
      title: "",
      uniqueID: "",
      instance: "",
      email: "",
      role: "",
    },

    subStatus: 'none',

    trial: {
      exam: "",
      id: "",
      questionsComplete: false,
      sessionStarted: false,
      sid: "",
      startDate: ""
    }
  }),

  actions: {
    // Error logging helper
    logError(error: any, method: string, context?: any) {
      const errorMessage = `Auth Store Error in ${method}: ${error?.message || error}`
      console.error(errorMessage, { error, context })
      
      // Integrate with Sentry if available
      try {
        // In Nuxt context, Sentry is available via $SE
        if (typeof globalThis !== 'undefined' && globalThis.$nuxt) {
          const { $SE } = globalThis.$nuxt
          if ($SE && typeof $SE === 'function') {
            $SE(error instanceof Error ? error : new Error(String(error)), {
              tags: { 
                component: 'auth-store', 
                method: method,
                store: 'AuthStore'
              },
              extra: { 
                context,
                errorMessage,
                method,
                timestamp: new Date().toISOString()
              }
            })
          }
        }
      } catch (sentryError) {
        // Don't let Sentry errors crash the auth flow
        console.warn('Failed to log to Sentry:', sentryError)
      }
    },

    // Reset store to initial state
    resetStore() {
      try {
        this.$reset()
      } catch (error) {
        this.logError(error, 'resetStore')
        // If reset fails, manually clear critical data
        this.userIsLoggedIn = false
        this.loggedIn = false
        this.sessionToken = null
        throw error
      }
    },

    // Set user authentication state
    setUserLoggedIn(isLoggedIn: boolean) {
      try {
        if (typeof isLoggedIn !== 'boolean') {
          throw new Error(`Invalid isLoggedIn value: ${isLoggedIn}. Must be boolean.`)
        }
        this.userIsLoggedIn = isLoggedIn
        this.loggedIn = isLoggedIn
      } catch (error) {
        this.logError(error, 'setUserLoggedIn', { isLoggedIn })
        // Fail safe: set to false on error
        this.userIsLoggedIn = false
        this.loggedIn = false
        throw error
      }
    },

    // Set user data
    setUser(userData: UserRecord) {
      try {
        // Input validation
        if (!userData) {
          throw new Error('userData is required')
        }
        if (typeof userData !== 'object') {
          throw new Error('userData must be an object')
        }
        if (!userData.id) {
          throw new Error('userData.id is required')
        }

        // Handle role field - can be string or RecordId object
        const roleValue = typeof userData.role === 'string' 
          ? userData.role 
          : (userData.role?.id || userData.role?.value || userData.role?.label || "")

        // Handle id field - can be string or RecordId object  
        const idValue = typeof userData.id === 'string'
          ? userData.id
          : (userData.id?.id || userData.id?.toString() || "")

        // Safely merge user data with fallbacks
        this.user = {
          ...userData, // Spread all properties from userData first
          id: idValue,
          firstName: userData.firstName || "",
          surname: userData.surname || "",
          title: userData.title || "",
          uniqueID: userData.uniqueID || "",
          instance: userData.instance || "",
          email: userData.email || "",
          role: roleValue,
        }
        
        this.userIsLoggedIn = true
        this.loggedIn = true
        this.subStatus = userData.access?.access || 'none'
        
        console.log('✅ [AUTH-STORE] User data set successfully:', {
          id: idValue,
          firstName: userData.firstName,
          surname: userData.surname,
          email: userData.email,
          role: roleValue,
          instance: userData.instance,
          userIsLoggedIn: this.userIsLoggedIn,
          loggedIn: this.loggedIn,
          subStatus: this.subStatus
        })
      } catch (error) {
        this.logError(error, 'setUser', { userData })
        // On error, don't set user as logged in
        this.userIsLoggedIn = false
        this.loggedIn = false
        throw error
      }
    },

    // Set loading states
    setAuthenticating(isAuthenticating: boolean) {
      try {
        if (typeof isAuthenticating !== 'boolean') {
          throw new Error(`Invalid isAuthenticating value: ${isAuthenticating}. Must be boolean.`)
        }
        this.authenticating = isAuthenticating
      } catch (error) {
        this.logError(error, 'setAuthenticating', { isAuthenticating })
        this.authenticating = false
        throw error
      }
    },

    setRefreshing(isRefreshing: boolean) {
      try {
        if (typeof isRefreshing !== 'boolean') {
          throw new Error(`Invalid isRefreshing value: ${isRefreshing}. Must be boolean.`)
        }
        this.refreshing = isRefreshing
      } catch (error) {
        this.logError(error, 'setRefreshing', { isRefreshing })
        this.refreshing = false
        throw error
      }
    },

    setLoggingOut(isLoggingOut: boolean) {
      try {
        if (typeof isLoggingOut !== 'boolean') {
          throw new Error(`Invalid isLoggingOut value: ${isLoggingOut}. Must be boolean.`)
        }
        this.loggingOut = isLoggingOut
      } catch (error) {
        this.logError(error, 'setLoggingOut', { isLoggingOut })
        this.loggingOut = false
        throw error
      }
    },

    // Session token management
    setSessionToken(token: AuthSessionToken | null) {
      try {
        // Validate token structure if provided
        if (token !== null) {
          if (typeof token !== 'object') {
            throw new Error('sessionToken must be an object or null')
          }
          if (!token.id || !token.token || !token.userId) {
            throw new Error('sessionToken missing required fields: id, token, userId')
          }
          if (!token.expiresAt || !(token.expiresAt instanceof Date)) {
            throw new Error('sessionToken.expiresAt must be a valid Date')
          }
        }
        this.sessionToken = token
      } catch (error) {
        this.logError(error, 'setSessionToken', { token })
        // On error, clear token for security
        this.sessionToken = null
        throw error
      }
    },

    setSessionValidating(isValidating: boolean) {
      try {
        if (typeof isValidating !== 'boolean') {
          throw new Error(`Invalid isValidating value: ${isValidating}. Must be boolean.`)
        }
        this.sessionValidating = isValidating
      } catch (error) {
        this.logError(error, 'setSessionValidating', { isValidating })
        this.sessionValidating = false
        throw error
      }
    },

    // Trial management
    setTrial(trialData: {
      exam: string,
      id: string,
      questionsComplete: boolean,
      sessionStarted: boolean,
      sid: string,
      startDate: string
    }) {
      try {
        // Input validation
        if (!trialData) {
          throw new Error('trialData is required')
        }
        if (typeof trialData !== 'object') {
          throw new Error('trialData must be an object')
        }

        // Validate required fields
        const requiredFields = ['exam', 'id', 'sid', 'startDate']
        for (const field of requiredFields) {
          if (!trialData[field] || typeof trialData[field] !== 'string') {
            throw new Error(`trialData.${field} is required and must be a string`)
          }
        }

        if (typeof trialData.questionsComplete !== 'boolean') {
          throw new Error('trialData.questionsComplete must be a boolean')
        }
        if (typeof trialData.sessionStarted !== 'boolean') {
          throw new Error('trialData.sessionStarted must be a boolean')
        }

        this.trial = { ...trialData }
      } catch (error) {
        this.logError(error, 'setTrial', { trialData })
        throw error
      }
    },

    // Update subscription status
    updateSubscriptionStatus(status: SubscriptionStatus) {
      try {
        const validStatuses: SubscriptionStatus[] = ['none', 'free', 'trial', 'subscription']
        if (!validStatuses.includes(status)) {
          throw new Error(`Invalid subscription status: ${status}. Must be one of: ${validStatuses.join(', ')}`)
        }
        this.subStatus = status
      } catch (error) {
        this.logError(error, 'updateSubscriptionStatus', { status })
        this.subStatus = 'none'
        throw error
      }
    },

    // Clear user data on logout
    clearUserData() {
      try {
        this.userIsLoggedIn = false
        this.loggedIn = false
        this.user = {
          id: "",
          firstName: "",
          surname: "",
          title: "",
          uniqueID: "",
          instance: "",
          email: "",
          role: {
            id: "",
            value: "",
            label: "",
          },
          post: {},
          instances: [],
          profile: {
            address: "",
            avatar: "",
            bio: "",
            city: "",
            country: {
              code: "",
              id: "",
              name: "",
            },
            cover: "",
            id: "",
            postalCode: "",
            social: {
              facebook: "",
              instagram: "",
              twitter: "",
            },
            website: "",
            levelOfTraining: "",
            credentials: "",
            position: "",
            primaryAffiliation: "",
            medicalSchool: "",
            yearOfGraduation: "",
          },
          access: {
            access: "none",
          },
          state: {
            onboardingModalAddressed: false,
            currency: "",
            famAvailable: {
              all: 0,
              new: 0,
              incorrect: 0,
              exams: []
            }
          },
          settings: {
            theme: "light",
          },
          examDates: [],
        }
        this.sessionToken = null
        this.subStatus = 'none'
        this.trial = {
          exam: "",
          id: "",
          questionsComplete: false,
          sessionStarted: false,
          sid: "",
          startDate: ""
        }
      } catch (error) {
        this.logError(error, 'clearUserData')
        // Force clear critical auth data even if other clearing fails
        this.userIsLoggedIn = false
        this.loggedIn = false
        this.sessionToken = null
        throw error
      }
    },

    // Session confirmation and validation
    async confirmSession() {
      try {
        // Prevent multiple concurrent refreshes
        if (this.refreshing) {
          console.log('Session refresh already in progress, skipping')
          return
        }

        this.setSessionValidating(true)
        this.setRefreshing(true)

        // Check if we have a session token to validate
        if (this.sessionToken?.token) {
          // TODO: Implement proper token validation with backend
          console.log('Validating existing session token')
          
          // For now, just verify the token exists and isn't expired
          const tokenExpiry = new Date(this.sessionToken.expiresAt)
          const now = new Date()
          
          if (tokenExpiry > now) {
            console.log('Session token is still valid')
            return
          } else {
            console.log('Session token expired, clearing session')
            this.setSessionToken(null)
            this.clearUserData()
            return
          }
        }

        // If no valid session token, check if user needs to be logged out
        if (!this.userIsLoggedIn) {
          console.log('No active session to confirm')
          return
        }

        // TODO: Replace with proper backend session validation
        // For now, we'll consider the session valid if user is marked as logged in
        console.log('Session confirmed for user:', this.user.email)

      } catch (error) {
        console.error('Error during session confirmation:', error)
        
        // On error, clear the session for security
        this.clearUserData()
        this.setSessionToken(null)
        
        // Re-throw the error so calling code can handle it
        throw error
      } finally {
        this.setSessionValidating(false)
        this.setRefreshing(false)
      }
    },

    // Update user account data via TRPC
    async updateUserAccount(accountData: Partial<UserRecord>) {
      try {
        if (!accountData) {
          throw new Error('accountData is required')
        }
        
        if (!this.user?.id) {
          throw new Error('User ID is required for account update')
        }

        // Get the TRPC client using Nuxt's composable system
        const { $api } = useNuxtApp()
          
        if (!$api?.users?.updateUserAccount) {
          throw new Error('TRPC users.updateUserAccount is not available')
        }

        // Call TRPC mutation (userID is now extracted from authenticated context)
        const result = await $api.users.updateUserAccount.mutate({
          data: {
            accountData
          }
        })

        // Update local user state with the new data
        if (accountData.firstName) this.user.firstName = accountData.firstName
        if (accountData.surname) this.user.surname = accountData.surname
        if (accountData.email) this.user.email = accountData.email
        if (accountData.title) this.user.title = accountData.title

        console.log('✅ User account updated successfully')
        return result

      } catch (error) {
        this.logError(error, 'updateUserAccount', { accountData })
        throw error
      }
    },

    // Update user profile data via TRPC
    async updateUserProfile(profileData: Partial<any>) {
      try {
        if (!profileData) {
          throw new Error('profileData is required')
        }
        
        if (!this.user?.id) {
          throw new Error('User ID is required for profile update')
        }

        // Get the TRPC client using Nuxt's composable system
        const { $api } = useNuxtApp()
          
        if (!$api?.users?.updateUserProfile) {
          throw new Error('TRPC users.updateUserProfile is not available')
        }

        // Call TRPC mutation (userID is now extracted from authenticated context)
        const result = await $api.users.updateUserProfile.mutate({
          data: {
            profileData
          }
        })

        // Update local user profile state with the new data
        this.user.profile = { ...this.user.profile, ...profileData }

        console.log('✅ User profile updated successfully')
        return result

      } catch (error) {
        this.logError(error, 'updateUserProfile', { profileData })
        throw error
      }
    },

    // Refresh user authentication state by calling /me endpoint
    async refresh() {
      try {
        if (this.refreshing) {
          console.log('🔄 [AUTH-STORE] Refresh already in progress, skipping')
          return
        }

        this.setRefreshing(true)
        console.log('🔄 [AUTH-STORE] Refreshing user authentication state...')

        // Detect the correct API endpoint based on current path
        const getApiEndpoint = () => {
          if (typeof window === 'undefined') return '/api/auth/me'
          const pathname = window.location.pathname
          
          if (pathname.startsWith('/dashboard')) return '/dashboard/api/auth/me'
          return '/api/auth/me'
        }

        const endpoint = getApiEndpoint()
        console.log('🔄 [AUTH-STORE] Using endpoint:', endpoint)

        // Call the /me endpoint to get fresh user data
        const response = await fetch(endpoint, {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          console.warn('🔄 [AUTH-STORE] Me endpoint failed:', response.status, response.statusText)
          // If unauthorized, logout user
          if (response.status === 401) {
            console.log('🔄 [AUTH-STORE] Session expired, logging out user')
            await this.logout()
            throw new Error('Session expired')
          }
          throw new Error(`Auth refresh failed: ${response.status}`)
        }

        const result = await response.json()
        
        if (result && result.id) {
          // Update user data with fresh information from server
          this.setUser(result)
          console.log('✅ [AUTH-STORE] User auth state refreshed successfully:', {
            id: result.id,
            email: result.email,
            firstName: result.firstName,
            access: result.access?.access
          })
        } else if (result?.uid === null || result?.error) {
          // User is not logged in according to server
          console.log('🔄 [AUTH-STORE] Server says user is not logged in, clearing local state')
          this.clearUserData()
        } else {
          console.warn('🔄 [AUTH-STORE] Unexpected response from /me endpoint:', result)
        }

      } catch (error: any) {
        this.logError(error, 'refresh')
        console.error('🔄 [AUTH-STORE] Error refreshing auth state:', error.message)
        
        // On error, we don't automatically logout unless it's specifically a 401
        // This allows the user to continue using the app with their current local state
        throw error
      } finally {
        this.setRefreshing(false)
      }
    },

    // Logout user and clear all data
    async logout(redirectUrl?: string | null) {
      try {
        this.setLoggingOut(true)
        console.log('🔐 [AUTH-STORE] Starting logout process...')
        console.log('🔐 [AUTH-STORE] Current user state before logout:', {
          hasUser: !!this.user,
          userId: this.user?.id,
          isAuthenticated: this.isAuthenticated
        })
        
        // Call backend logout endpoint to invalidate session
        try {
          // Determine the correct logout endpoint based on current app
          let logoutEndpoint = '/api/auth/logout'
          if (typeof window !== 'undefined') {
            const path = window.location.pathname
            console.log('🔐 [AUTH-STORE] Current pathname:', path)
            if (path.startsWith('/dashboard/')) {
              logoutEndpoint = '/dashboard/api/auth/logout'
            }
            // Default to /api/auth/logout for public app
          }
          
          console.log(`🔐 [AUTH-STORE] Calling logout endpoint: ${logoutEndpoint}`)
          
          const response = await fetch(logoutEndpoint, {
            method: 'POST',
            credentials: 'include'
          })
          
          const result = await response.json()
          
          if (!result.ok) {
            console.warn('Backend logout failed:', result.error)
            // Continue with local cleanup even if backend fails
          }
        } catch (fetchError) {
          console.warn('Failed to call logout endpoint:', fetchError)
          // Continue with local cleanup even if backend call fails
        }
        
        // Clear auth cookies using unified configuration
        if (import.meta.client) {
          const { generateCookieClearCommands } = await import('~/auth/config')
          const hostname = window.location.hostname
          
          // Get all cookie clear commands for this hostname
          const clearCommands = generateCookieClearCommands(hostname)
          
          // Execute all clear commands
          for (const command of clearCommands) {
            document.cookie = command
          }
          
          console.log('🍪 [AUTH-STORE] Cleared session cookies across all domain and path variations using unified config')
        }
        
        // Clear session token
        this.setSessionToken(null)
        console.log('🔐 [AUTH-STORE] Session token cleared')
        
        // Clear user data
        this.clearUserData()
        console.log('🔐 [AUTH-STORE] User data cleared')
        
        console.log('✅ [AUTH-STORE] User logged out successfully - all session data cleared')
        console.log('🔐 [AUTH-STORE] Final state after logout:', {
          hasUser: !!this.user,
          isAuthenticated: this.isAuthenticated,
          hasSessionToken: !!this.sessionToken
        })
        
        // Redirect after logout (null means no redirect)
        if (redirectUrl === undefined) {
          try {
            const rc = useRuntimeConfig()
            const guardConfig = (rc as any)?.auth?.guard || {}
            redirectUrl =
              guardConfig.redirectOnLogout ||
              (rc as any)?.auth?.redirectOnLogout ||
              '/'
            const { resolveAuthRedirect } = await import('~/auth/redirects')
            const resolution = resolveAuthRedirect(redirectUrl || '/', rc, guardConfig)
            redirectUrl = resolution.target
          } catch {
            redirectUrl = '/'
          }
        }

        if (redirectUrl && typeof window !== 'undefined') {
          console.log('🔄 Redirecting after logout')
          window.location.href = redirectUrl
        } else if (redirectUrl === null) {
          console.log('🔄 No redirect requested after logout')
        }
        
      } catch (error) {
        console.error('Error during logout:', error)
        // Even if logout fails, clear local data for security
        this.clearUserData()
        this.setSessionToken(null)
        
        // Still redirect on error if URL provided (null means no redirect)
        if (redirectUrl === undefined) {
          try {
            const rc = useRuntimeConfig()
            const guardConfig = (rc as any)?.auth?.guard || {}
            redirectUrl =
              guardConfig.redirectOnLogout ||
              (rc as any)?.auth?.redirectOnLogout ||
              '/'
            const { resolveAuthRedirect } = await import('~/auth/redirects')
            const resolution = resolveAuthRedirect(redirectUrl || '/', rc, guardConfig)
            redirectUrl = resolution.target
          } catch {
            redirectUrl = '/'
          }
        }
        if (redirectUrl && typeof window !== 'undefined') {
          console.log('🔄 Redirecting after logout error')
          window.location.href = redirectUrl
        } else if (redirectUrl === null) {
          console.log('🔄 No redirect requested after logout error')
        }
        
        throw error
      } finally {
        this.setLoggingOut(false)
      }
    }
  },

  getters: {
    // Minimal, Stripe-safe user payload for PaymentIntents
    paymentIntentUser: (state) => {
      try {
        const user: any = state?.user || {}
        const roleValue = typeof user?.role === 'string'
          ? user.role
          : (user?.role?.value || user?.role?.label || '')

        return {
          id: user?.id || '',
          email: user?.email || '',
          firstName: user?.firstName || '',
          surname: user?.surname || '',
          customerID: user?.customerID || user?.stripeCustomerID || '',
          role: roleValue || ''
        }
      } catch (error) {
        console.error('Auth Store Error in paymentIntentUser getter:', error)
        return null
      }
    },
    // Check if user is authenticated
    isTrialMode: (state) => {
      return state?.user?.access?.access === 'trial'
    },
    isTrialComplete: (state) => {
      return state?.user?.access?.access === 'trial' && state?.trial?.sessionComplete
    },
    trialExamID: (state) => {
      return state?.trial?.exam ?? null
    },

    trialState: (state) => {
      return state?.user?.access?.trial ?? {
        "exam": null,
        "id": "",
        "s": null,
        "sessionComplete": false,
        "sessionCompleteDate": "",
        "sessionStartDate": "",
        "sessionStarted": false,
        "startDate": null,
        "u": null
      }
    },

    isAuthenticated: (state) => {
      try {
        return Boolean(state?.userIsLoggedIn && state?.loggedIn)
      } catch (error) {
        console.error('Auth Store Error in isAuthenticated getter:', error)
        return false
      }
    },
    trialExam: (state) => {
      const { $exams } = useNuxtApp()
      const trialExamID = state?.trial?.exam ?? null
      if (trialExamID) {
        return $exams.exams.find(exam => JSON.stringify(exam.id) === JSON.stringify(trialExamID)) as Exam
      }
      return null
    },
    
    // Get user display name
    userDisplayName: (state) => {
      try {
        if (state?.user?.firstName && state?.user?.surname) {
          return `${state.user.firstName} ${state.user.surname}`.trim()
        }
        if (state?.user?.email) {
          return state.user.email
        }
        return 'User'
      } catch (error) {
        console.error('Auth Store Error in userDisplayName getter:', error)
        return 'User'
      }
    },

    // Get user subscription status
    hasActiveSubscription: (state) => {
      try {
        return state?.subStatus === 'subscription'
      } catch (error) {
        console.error('Auth Store Error in hasActiveSubscription getter:', error)
        return false
      }
    },
    
    // Get user trial status
    hasActiveTrial: (state) => {
      try {
        return state?.subStatus === 'trial'
      } catch (error) {
        console.error('Auth Store Error in hasActiveTrial getter:', error)
        return false
      }
    },
    
    // Check if user has any access
    hasAccess: (state) => {
      try {
        return state?.subStatus !== 'none' && state?.subStatus !== undefined
      } catch (error) {
        console.error('Auth Store Error in hasAccess getter:', error)
        return false
      }
    },

    // Get user initials for avatar
    userInitials: (state) => {
      try {
        // Check if we have both first and last name
        if (state?.user?.firstName && state?.user?.surname) {
          const firstName = String(state.user.firstName).trim()
          const surname = String(state.user.surname).trim()
          if (firstName.length > 0 && surname.length > 0) {
            return `${firstName.charAt(0)}${surname.charAt(0)}`.toUpperCase()
          }
        }
        
        // Fallback to email initial
        if (state?.user?.email) {
          const email = String(state.user.email).trim()
          if (email.length > 0) {
            return email.charAt(0).toUpperCase()
          }
        }
        
        // Final fallback
        return 'U'
      } catch (error) {
        console.error('Auth Store Error in userInitials getter:', error)
        return 'U'
      }
    },
    userSubscriptions: (state) => {
      return state?.user?.access?.subscriptions ?? []
    },

    // Get user first name
    getFirstName: (state) => {
      try {
        return state?.user?.firstName ? String(state.user.firstName).trim() : ''
      } catch (error) {
        console.error('Auth Store Error in getFirstName getter:', error)
        return ''
      }
    },

    // Get full user object
    getUser: (state) => {
      try {
        return state?.user || null
      } catch (error) {
        console.error('Auth Store Error in getUser getter:', error)
        return null
      }
    },

    // Get user ID
    getUserId: (state) => {
      try {
        return state?.user?.id  || null 
      } catch (error) {
        console.error('Auth Store Error in getUserId getter:', error)
        return null
      }
    },

    // Check if trial is available to user
    trialIsAvailableToUser: (state) => {
      try {
        // If user is not logged in, allow trial
        if (!state?.userIsLoggedIn) return true
        
        // If user is logged in, check their access level
        // Users with 'none' or no access can usually start a trial
        const userAccess = state?.user?.access?.access
        return userAccess === 'none' || !userAccess
      } catch (error) {
        console.error('Auth Store Error in trialIsAvailableToUser getter:', error)
        return true // Default to allowing trial on error
      }
    },

    // Check if user is set
    userSet: (state) => {
      try {
        return Boolean(state?.user?.id)
      } catch (error) {
        console.error('Auth Store Error in userSet getter:', error)
        return false
      }
    },

    getUserAvailableExams: (state) => {

      if(!state.loggedIn) {
        return []
      }

      if(state.hasActiveSubscription) {
        // This one is including the exams in the payload for some reason
        return state?.user?.access?.subscriptions?.map((sub: Subscription) => sub.exam) ?? []
      } else if(state.hasActiveTrial) {
        // This one is including just the ExamID as a recordID
        const { $exams } = useNuxtApp()
        const examID = state?.user?.access?.trial?.exam
        if(examID) {
          const exam = $exams.exams.find(exam => exam.id.id === examID.id)
          if(exam) {
            return [exam]
          } else {
            return []
          }
        } else {
          return []
        }
      } else {
        return []
      }
    },

    getDashboardExamOptions: (state) => {
      const { $exams } = useNuxtApp()
      const availableExams: Exam[] = state?.getUserAvailableExams ?? []

      if(Array.isArray(availableExams)) {
      return availableExams.map((exam: Exam) => ({
          label: exam.title,
          value: exam.id
        }))
      } else {
        return []
      }
    }
  }
})

const AUTH_STORE_EXTENDED = Symbol.for('schema-kit.authstore.extended')

const applyAuthStoreOverrides = async (store: any) => {
  try {
    const mod = await import('@schema/custom-stores/auth')
    const extender = mod?.extendAuthStore ?? mod?.default
    if (typeof extender === 'function') {
      await extender(store)
    }
  } catch {
    // No overrides found; ignore.
  }
}

export const useAuthStore = ((...args: any[]) => {
  const store = (baseUseAuthStore as any)(...args)
  if (!(store as any)[AUTH_STORE_EXTENDED]) {
    Object.defineProperty(store, AUTH_STORE_EXTENDED, {
      value: true,
      enumerable: false,
      configurable: false,
    })
    void applyAuthStoreOverrides(store)
  }
  return store
}) as typeof baseUseAuthStore
