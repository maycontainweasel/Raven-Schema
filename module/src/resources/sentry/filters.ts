// packages/pmv2shared/sentry/filters.ts

/**
 * Comprehensive error filtering system for PMV2 applications
 * Filters out expected user errors and focuses on system failures
 */

export interface ErrorContext {
  failureType?: string
  developerActions?: string[]
  criticalityLevel?: 'low' | 'medium' | 'high' | 'critical'
  component?: string
  userId?: string
  sessionId?: string
}

/**
 * Determines if an error should be sent to Sentry
 * Returns true if error should be tracked, false if filtered out
 */
export function sentryErrorFilter(error: Error | string, context?: ErrorContext): boolean {
  const errorMessage = typeof error === 'string' ? error : error.message
  const errorName = typeof error === 'string' ? 'Error' : error.name
  
  // Always filter out ResizeObserver errors (browser noise)
  if (errorMessage.includes('ResizeObserver')) {
    return false
  }
  
  // Filter out common browser noise
  const browserNoise = [
    'Non-Error promise rejection captured',
    'Script error',
    'Network Error',
    'NetworkError',
    'Failed to fetch',
    'Load failed',
    'Loading chunk',
    'ChunkLoadError'
  ]
  
  if (browserNoise.some(noise => errorMessage.includes(noise))) {
    return false
  }
  
  // Filter out expected user errors (business logic errors)
  const expectedUserErrors = [
    // Authentication errors
    'Invalid credentials',
    'Token expired',
    'Unauthorized',
    'Authentication failed',
    'Login required',
    
    // Validation errors
    'Validation failed',
    'Invalid input',
    'Required field',
    'Field is required',
    'Invalid format',
    
    // Business logic errors
    'Trial expired',
    'Subscription required',
    'Exam not available',
    'Session not found',
    'User not found',
    'Access denied',
    'Permission denied',
    
    // Client-side navigation
    'Navigation cancelled',
    'Route not found',
    'Page not found'
  ]
  
  if (expectedUserErrors.some(expected => errorMessage.toLowerCase().includes(expected.toLowerCase()))) {
    return false
  }
  
  // Always track system failures (these are the errors we care about)
  const systemFailures = [
    // Component crashes
    'Cannot read property',
    'Cannot read properties',
    'undefined is not',
    'null is not',
    'TypeError',
    'ReferenceError',
    
    // Infrastructure issues
    'Database connection',
    'Redis connection',
    'API endpoint',
    'Server error',
    'Internal server error',
    '500',
    
    // PassMed-specific system issues
    'Session store failure',
    'Timer synchronization',
    'Dashboard widget crash',
    'Chart rendering error',
    'Payment processing error',
    'Sentry initialization',
    'SurrealDB error'
  ]
  
  const isSystemFailure = systemFailures.some(failure => 
    errorMessage.toLowerCase().includes(failure.toLowerCase()) ||
    errorName.toLowerCase().includes(failure.toLowerCase())
  )
  
  if (isSystemFailure) {
    return true
  }
  
  // Check context for critical errors
  if (context?.criticalityLevel === 'critical' || context?.criticalityLevel === 'high') {
    return true
  }
  
  // Default: track unclassified errors to avoid missing important issues
  return true
}

/**
 * Enhanced error context builder for PMV2 applications
 */
export function buildErrorContext(
  component?: string,
  additionalContext?: Record<string, any>
): ErrorContext {
  const context: ErrorContext = {
    failureType: 'system_error',
    criticalityLevel: 'medium',
    developerActions: [
      'Check error logs',
      'Verify component state',
      'Review recent deployments'
    ],
    ...additionalContext
  }
  
  if (component) {
    context.component = component
  }
  
  // Add PassMed-specific context detection
  if (component?.includes('Dashboard')) {
    context.failureType = 'dashboard_component'
    context.developerActions = [
      'Check dashboard widget state',
      'Verify API connections',
      'Review user permissions'
    ]
  } else if (component?.includes('Session')) {
    context.failureType = 'session_component'
    context.criticalityLevel = 'high'
    context.developerActions = [
      'Check session state',
      'Verify timer synchronization',
      'Review question data'
    ]
  } else if (component?.includes('Payment') || component?.includes('Stripe')) {
    context.failureType = 'payment_system'
    context.criticalityLevel = 'critical'
    context.developerActions = [
      'Check Stripe integration',
      'Verify payment data',
      'Review subscription state'
    ]
  }
  
  return context
}

/**
 * Wrapper for the global error tracking function with filtering
 */
export function trackFilteredError(
  error: Error | string,
  component?: string,
  additionalContext?: Record<string, any>,
  tags?: Record<string, string>
) {
  const context = buildErrorContext(component, additionalContext)
  
  // Apply filtering
  const shouldTrack = sentryErrorFilter(error, context)
  
  if (!shouldTrack) {
    // Log filtered errors in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Sentry] Filtered error:', error, context)
    }
    return false
  }
  
  // If we have a global error tracker, use it
  if (typeof globalThis.$SE === 'function') {
    globalThis.$SE(error, context, tags)
    return true
  }
  
  // Fallback to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry] Error tracking function not available:', error, context)
  }
  
  return false
}