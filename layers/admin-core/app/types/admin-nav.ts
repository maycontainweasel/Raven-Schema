export type AdminNavItem = {
  id: string
  label: string
  to?: string
  icon?: string
  badge?: string
  defaultOpen?: boolean
  children?: AdminNavItem[]
}

export type AdminNavSection = {
  id: string
  label?: string
  items: AdminNavItem[]
}

export type AdminNavConfig = {
  sections: AdminNavSection[]
}
