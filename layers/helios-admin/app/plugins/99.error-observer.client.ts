declare global {
  interface Window {
    __heliosAdminErrorObserverAttached__?: boolean
  }
}

const logObservedError = (source: string, payload: unknown) => {
  console.error(`[helios-admin][${source}]`, payload)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, _instance, info) => {
    logObservedError(`vue:${info}`, error)
  })

  if (!window.__heliosAdminErrorObserverAttached__) {
    window.__heliosAdminErrorObserverAttached__ = true

    window.addEventListener('error', (event) => {
      logObservedError('window:error', event.error || event.message || event)
    })

    window.addEventListener('unhandledrejection', (event) => {
      logObservedError('window:unhandledrejection', event.reason || event)
    })
  }
})
