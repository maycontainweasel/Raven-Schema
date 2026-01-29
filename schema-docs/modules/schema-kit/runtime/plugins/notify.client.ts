import { toast } from 'vue-sonner'

export default defineNuxtPlugin(() => {
  const notify = {
    toast: (message: string, options?: any) => toast(message, options),
    success: (message: string, options?: any) => toast.success(message, options),
    error: (message: string, options?: any) => toast.error(message, options),
    info: (message: string, options?: any) => toast.info(message, options),
    warning: (message: string, options?: any) => toast.warning(message, options),
    loading: (message: string, options?: any) => toast.loading(message, options),
    custom: (message: string, description?: string, action?: { label: string; onClick: () => void }) =>
      toast(message, {
        description,
        action,
      }),
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading?: string
        success?: string | ((data: T) => string)
        error?: string | ((error: any) => string)
      }
    ) => toast.promise(promise, messages),
    dismiss: () => toast.dismiss(),
    dismissById: (id: string | number) => toast.dismiss(id),
  }

  return {
    provide: {
      notify,
    },
  }
})
