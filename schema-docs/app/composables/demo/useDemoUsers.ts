export type DemoUser = {
  id: string
  email?: string
  firstName?: string
  surname?: string
  role?: any
  instances?: string[]
  post?: { status?: string; createdAt?: string; updatedAt?: string }
}

export type DemoUserCreate = {
  email: string
  password?: string
  firstName: string
  surname: string
  role?: string
  instances?: string[]
}

export type DemoUserUpdate = {
  firstName?: string
  surname?: string
  role?: string
}

type ListOptions = {
  instance?: string
  limit?: number
  start?: number
}

const resolveResult = <T>(input: any): T | null => {
  if (Array.isArray(input)) {
    return (input[0] as T) ?? null
  }
  return (input as T) ?? null
}

const resolveList = <T>(input: any): T[] => {
  if (Array.isArray(input)) return input as T[]
  if (input && Array.isArray((input as any).result)) return (input as any).result as T[]
  return []
}

export const useDemoUsers = () => {
  const { $api } = useNuxtApp()

  const mockUsers = useState<DemoUser[]>('demo-users', () => [
    {
      id: 'demo@example.com',
      email: 'demo@example.com',
      firstName: 'Demo',
      surname: 'User',
      role: 'student',
      instances: ['pm'],
      post: { status: 'publish' },
    },
  ])

  const listUsers = async (options: ListOptions = {}): Promise<DemoUser[]> => {
    if ($api?.user?.typesense?.list) {
      const result = await $api.user.typesense.list.query({
        data: {
          limit: options.limit ?? 100,
          start: options.start ?? 0,
        },
        instance: options.instance,
      })
      return resolveList<DemoUser>(result)
    }

    return mockUsers.value
  }

  const refreshUsers = async (options: ListOptions = {}) => {
    if ($api?.user?.typesense?.refresh) {
      return $api.user.typesense.refresh.query({
        data: {
          limit: options.limit ?? -1,
          start: options.start ?? -1,
        },
        instance: options.instance,
      })
    }

    return mockUsers.value
  }

  const getUser = async (id: string, instance?: string): Promise<DemoUser | null> => {
    if ($api?.user?.resource) {
      const result = await $api.user.resource.query({
        data: { id, key: 'Admin' },
        instance,
      })
      return resolveResult<DemoUser>(result)
    }

    return mockUsers.value.find(user => user.id === id) ?? null
  }

  const createUser = async (payload: DemoUserCreate, instance?: string) => {
    if ($api?.user?.create) {
      return $api.user.create.mutate({
        data: payload,
        instance,
      })
    }

    const record: DemoUser = {
      id: payload.email,
      email: payload.email,
      firstName: payload.firstName,
      surname: payload.surname,
      role: payload.role ?? 'student',
      instances: payload.instances ?? (instance ? [instance] : []),
      post: { status: 'publish' },
    }
    mockUsers.value = [record, ...mockUsers.value]
    return { record }
  }

  const updateUser = async (id: string, payload: DemoUserUpdate, instance?: string) => {
    if ($api?.user?.update) {
      return $api.user.update.mutate({
        data: { id, payload },
        instance,
      })
    }

    mockUsers.value = mockUsers.value.map(user => (user.id === id ? { ...user, ...payload } : user))
    return { record: mockUsers.value.find(user => user.id === id) }
  }

  const deleteUser = async (id: string, instance?: string) => {
    if ($api?.user?.delete) {
      return $api.user.delete.mutate({
        data: { id },
        instance,
      })
    }

    mockUsers.value = mockUsers.value.filter(user => user.id !== id)
    return { ok: true }
  }

  return {
    listUsers,
    refreshUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  }
}
