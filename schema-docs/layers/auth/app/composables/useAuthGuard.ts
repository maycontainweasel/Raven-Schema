import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type AuthGuardOptions = {
  /**
   * When true (default), call authStore.refresh() before checking auth state.
   */
  refresh?: boolean
  /**
   * Override redirect target when auth fails.
   */
  redirectTo?: string
  /**
   * Additional allow check; return false to block.
   */
  allow?: (ctx: { auth: ReturnType<typeof useAuthStore>; route: RouteLocationNormalizedLoaded }) =>
    | boolean
    | Promise<boolean>
  /**
   * Hook executed before redirecting on failure.
   */
  onFail?: (ctx: { auth: ReturnType<typeof useAuthStore>; route: RouteLocationNormalizedLoaded }) =>
    | void
    | Promise<void>
}

export async function useAuthGuard(
  options: AuthGuardOptions = {},
  route?: RouteLocationNormalizedLoaded
) {
  const authStore = useAuthStore()
  const rc = useRuntimeConfig()
  const guardConfig = (rc as any)?.auth?.guard || {}
  const { resolveAuthRedirect } = await import('~/auth/redirects')
  const { shouldApplyAuthGuard } = await import('~/auth/guard')

  const to = route ?? useRoute()
  const refresh = options.refresh ?? guardConfig.refresh ?? true
  if (!shouldApplyAuthGuard(to.path, guardConfig)) {
    return true
  }

  if (refresh && !authStore.refreshing) {
    try {
      await authStore.refresh()
    } catch {
      // ignore refresh errors here
    }
  }

  let allowed = authStore.isAuthenticated

  if (options.allow) {
    try {
      allowed = await options.allow({ auth: authStore, route: to })
    } catch {
      allowed = false
    }
  }

  if (!allowed) {
    if (options.onFail) {
      await options.onFail({ auth: authStore, route: to })
    }

    const redirectTarget =
      options.redirectTo ||
      guardConfig.redirectOnFail ||
      (rc as any)?.auth?.redirectOnFail ||
      '/login'
    const resolution = resolveAuthRedirect(redirectTarget, rc, guardConfig)

    if (resolution.target && to.path !== resolution.target) {
      return navigateTo(resolution.target, resolution.external ? { external: true } : undefined)
    }
  }

  return allowed
}
