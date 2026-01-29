import { useApiToolkitConsoleStore } from '~/stores/apiToolkitConsole'

export function useApiToolkitConsole() {
  const consoleStore = useApiToolkitConsoleStore()

  return {
    add: (message: string | any) => {
      if (typeof message === 'string') {
        consoleStore.addMessage(message)
        return
      }

      if (message?.t === 'm' && message?.m) {
        consoleStore.addMessage(message.m)
        if (message.res) {
          consoleStore.addResponse(message.res)
        }
        return
      }

      consoleStore.addResponse(message)
    },

    res: (response: any) => {
      consoleStore.addResponse(response)
    },

    success: (response: any, message?: string) => {
      consoleStore.success(response, message)
    },

    error: (response: any, message?: string) => {
      consoleStore.error(response, message)
    },

    warning: (response: any, message?: string) => {
      consoleStore.warning(response, message)
    },

    info: (response: any, message?: string) => {
      consoleStore.info(response, message)
    },

    clear: () => {
      consoleStore.clear()
    },
  }
}
