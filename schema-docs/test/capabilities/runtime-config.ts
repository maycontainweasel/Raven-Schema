type RuntimeConfig = {
  public?: Record<string, any>
  [key: string]: any
}

let runtimeConfig: RuntimeConfig | null = null

export const setRuntimeConfig = (config: RuntimeConfig) => {
  runtimeConfig = config
}

export const useRuntimeConfig = (): RuntimeConfig => {
  if (!runtimeConfig) {
    throw new Error('Runtime config not initialised in tests')
  }
  return runtimeConfig
}
