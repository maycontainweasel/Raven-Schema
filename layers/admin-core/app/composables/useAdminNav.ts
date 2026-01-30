import type { AdminNavConfig } from '../types/admin-nav'
import { adminNavCustom } from '../config/admin-nav.custom'
import { adminNavGenerated } from '../config/admin-nav.generated'

export const useAdminNav = (): AdminNavConfig => {
  return {
    sections: [
      ...(adminNavGenerated?.sections ?? []),
      ...(adminNavCustom?.sections ?? [])
    ]
  }
}
