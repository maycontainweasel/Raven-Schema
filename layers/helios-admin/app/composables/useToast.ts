import type { AppToast } from '~/app/types/toast'

export const useToast = (): AppToast => {
  return useNuxtApp().$toast
}
