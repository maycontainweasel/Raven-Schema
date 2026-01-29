export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const nuxtApp = useNuxtApp()
  const $auth: any = (nuxtApp as any).$auth
  if (!$auth || typeof $auth.refresh !== 'function') return

  const REFRESH_MS = 10 * 60 * 1000 // 10 minutes
  let timer: number | null = null

  const tick = async () => {
    try {
      await $auth.refresh()
    } catch {
      // Auth refresh errors are handled by the store; no-op here.
    }
  }

  const start = () => {
    if (timer) return
    tick()
    timer = window.setInterval(tick, REFRESH_MS)
  }

  const stop = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  const onVis = () => (document.visibilityState === 'visible' ? start() : stop())
  const onOnline = () => start()
  const onOffline = () => stop()

  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  if (document.visibilityState === 'visible') start()

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    })
  }
})
