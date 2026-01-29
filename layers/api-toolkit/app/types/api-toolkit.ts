export type ApiToolkitNavItem = {
  id: string
  label: string
  description?: string
  icon?: string
}

export type ApiToolkitBadgeVariant = 'success' | 'outline' | 'warning' | 'error' | 'info' | 'ghost'

export type ApiToolkitBadge = {
  label: string
  variant?: ApiToolkitBadgeVariant
}

export type ApiToolkitProcessState = 'idle' | 'success' | 'error' | 'warning'

export type ApiToolkitSelectOption = {
  label: string
  value: string | number
  description?: string
}
