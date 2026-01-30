import type { AdminNavConfig } from '../types/admin-nav'

// Minimal starter nav. Generators can extend/override this later.
export const adminNavCustom: AdminNavConfig = {
  sections: [
    {
      id: 'core',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          to: '/'
        }
      ]
    }
  ]
}
