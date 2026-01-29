export default defineNuxtRouteMiddleware(async (to) => {
  const rc = useRuntimeConfig()
  const guardConfig = (rc as any)?.auth?.guard || {}
  const { resolveAuthRedirect } = await import('~/auth/redirects')
  const { shouldApplyAuthGuard } = await import('~/auth/guard')

  if (guardConfig.enabled === false) return
  if ((to.meta as any)?.auth === false || (to.meta as any)?.public === true) return

  if (!shouldApplyAuthGuard(to.path, guardConfig)) {
    return
  }

  const authStore = useAuthStore()
  const refresh = guardConfig.refresh !== false

  if (refresh && !authStore.refreshing) {
    try {
      await authStore.refresh()
    } catch {
      // ignore refresh errors here
    }
  }

  if (!authStore.isAuthenticated) {
    const redirectTarget =
      guardConfig.redirectOnFail ||
      (rc as any)?.auth?.redirectOnFail ||
      '/login'
    const resolution = resolveAuthRedirect(redirectTarget, rc, guardConfig)

    if (resolution.target && to.path !== resolution.target) {
      return navigateTo(resolution.target, resolution.external ? { external: true } : undefined)
    }
  }
})
