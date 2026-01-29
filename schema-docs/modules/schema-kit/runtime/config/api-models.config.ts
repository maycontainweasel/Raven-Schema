export type ApiProcessDefinition = {
  id: string
  label: string
  description?: string
  enabledByDefault?: boolean
}

export type ApiInstanceOption = {
  key: string
  label: string
  description?: string
  data?: 'local' | 'remote' | 'unknown'
}

export type ApiModelOverride = {
  label?: string
  description?: string
  icon?: string
  processes?: string[]
  data?: 'local' | 'remote' | 'unknown'
}

export const apiProcessCatalog: ApiProcessDefinition[] = []
export const apiInstanceOptions: ApiInstanceOption[] = []
export const apiModelOverrides: Record<string, ApiModelOverride> = {}
