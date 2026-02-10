import { toast as sonnerToast } from 'vue-sonner'
import type { ExternalToast } from 'vue-sonner'
import type { AppToast } from '~/app/types/toast'

const createSonnerToast = (): AppToast => ({
  toast: (message: string, options?: ExternalToast) => sonnerToast(message, options),
  show: (message: string, options?: ExternalToast) => sonnerToast(message, options),
  success: (message: string, options?: ExternalToast) => sonnerToast.success(message, options),
  error: (message: string, options?: ExternalToast) => sonnerToast.error(message, options),
  info: (message: string, options?: ExternalToast) => sonnerToast.info(message, options),
  warning: (message: string, options?: ExternalToast) => sonnerToast.warning(message, options),
  loading: (message: string, options?: ExternalToast) => sonnerToast.loading(message, options),
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages?: Parameters<typeof sonnerToast.promise<T>>[1],
  ) => sonnerToast.promise<T>(promise, messages),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
})

export default defineNuxtPlugin((nuxtApp) => {
  const anyApp = nuxtApp as any
  const upstream = anyApp.$notify || anyApp.$sonner
  const toast = (upstream ?? createSonnerToast()) as AppToast

  return {
    provide: {
      toast,
    },
  }
})
