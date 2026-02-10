import type { AdminNavConfig } from '../types/admin-nav'

export const adminNavCustom: AdminNavConfig = {
  sections: [
    {
      id: 'core',
      label: 'Core',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: 'dashboard',
          to: '/',
        },
        {
          id: 'admin',
          label: 'Admin',
          icon: 'settings',
          defaultOpen: true,
          children: [
            {
              id: 'admin-models',
              label: 'Models',
              to: '/models',
            },
            {
              id: 'admin-menu-manager',
              label: 'Menu Manager',
              to: '/admin/menu-manager',
            },
          ],
        },
      ],
    },
    {
      id: 'content',
      label: 'Content',
      items: [
        {
          id: 'users',
          label: 'Users',
          icon: 'users',
          defaultOpen: true,
          children: [
            { id: 'users-overview', label: 'Overview', to: '/admin/users' },
            { id: 'users-new', label: 'New User', to: '/admin/users/new-user' },
          ],
        },
        {
          id: 'posts',
          label: 'Posts',
          icon: 'sheet',
          children: [
            { id: 'posts-overview', label: 'Overview', to: '/admin/post' },
            { id: 'posts-new', label: 'New Post', to: '/admin/post/new-post' },
          ],
        },
        {
          id: 'cars',
          label: 'Cars',
          icon: 'database',
          children: [
            { id: 'cars-overview', label: 'Overview', to: '/admin/car' },
            { id: 'cars-new', label: 'New Car', to: '/admin/car/new-car' },
          ],
        },
        {
          id: 'instances',
          label: 'Instances',
          icon: 'layers',
          children: [
            { id: 'instances-overview', label: 'Overview', to: '/admin/instance' },
            { id: 'instances-new', label: 'New Instance', to: '/admin/instance/new-instance' },
          ],
        },
      ],
    },
    {
      id: 'workspace',
      label: 'Workspace',
      items: [
        {
          id: 'fields',
          label: 'Fields',
          icon: 'components',
          defaultOpen: true,
          children: [
            { id: 'fields-overview', label: 'Overview', to: '/fields/test' },
            { id: 'fields-library', label: 'Library', to: '/fields' },
          ],
        },
        {
          id: 'components',
          label: 'Components',
          icon: 'layout',
          to: '/components',
        },
      ],
    },
  ],
}
