import { useApiConsoleStore } from '#helios-admin/app/stores/apiConsole.ts'
import { storeToRefs } from 'pinia'

export function useApiConsole() {
  const consoleStore = useApiConsoleStore()
  const { entries, autoClear, autoScroll } = storeToRefs(consoleStore)

  return {
    entries,
    autoClear,
    autoScroll,
    setAutoClear: (value: boolean) => {
      autoClear.value = value
    },
    setAutoScroll: (value: boolean) => {
      autoScroll.value = value
    },
    add: (message: string | unknown) => {
      if (typeof message === 'string') {
        consoleStore.addMessage(message)
        return
      }

      consoleStore.addResponse(message)
    },
    message: (message: string) => {
      consoleStore.addMessage(message)
    },
    response: (payload: unknown, message?: string) => {
      consoleStore.addResponse(payload, message)
    },
    success: (payload: unknown, message?: string) => {
      consoleStore.success(payload, message)
    },
    error: (payload: unknown, message?: string) => {
      consoleStore.error(payload, message)
    },
    warning: (payload: unknown, message?: string) => {
      consoleStore.warning(payload, message)
    },
    info: (payload: unknown, message?: string) => {
      consoleStore.info(payload, message)
    },
    clear: () => {
      consoleStore.clear()
    },
    maybeClearBeforeRun: () => {
      consoleStore.maybeClearBeforeRun()
    },
  }
}
