type Method = 'query' | 'mutate'

export const useTrpcEndpoint = () => {
  const { $api } = useNuxtApp()

  const callEndpoint = async (endpoint: string, method: Method, payload: any) => {
    const parts = endpoint.split('.')
    let current: any = $api

    for (let i = 0; i < parts.length - 1; i++) {
      current = current?.[parts[i]]
      if (!current) throw new Error(`Invalid endpoint path: ${endpoint}`)
    }

    const methodName = parts[parts.length - 1]
    if (!current?.[methodName]) throw new Error(`Invalid endpoint: ${endpoint}`)

    if (method === 'mutate') return await current[methodName].mutate(payload)
    return await current[methodName].query(payload)
  }

  return { callEndpoint }
}
