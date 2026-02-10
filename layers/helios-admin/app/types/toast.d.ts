import type { ExternalToast } from 'vue-sonner'

export type AppToast = {
  toast: (message: string, options?: ExternalToast) => string | number
  show: (message: string, options?: ExternalToast) => string | number
  success: (message: string, options?: ExternalToast) => string | number
  error: (message: string, options?: ExternalToast) => string | number
  info: (message: string, options?: ExternalToast) => string | number
  warning: (message: string, options?: ExternalToast) => string | number
  loading: (message: string, options?: ExternalToast) => string | number
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages?: Parameters<typeof import('vue-sonner').toast.promise<T>>[1],
  ) => ReturnType<typeof import('vue-sonner').toast.promise<T>>
  dismiss: (id?: string | number) => string | number | undefined
}

declare module '#app' {
  interface NuxtApp {
    $toast: AppToast
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $toast: AppToast
  }
}

export {}
