import Typesense from 'typesense'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const publicConfig = (config.public as any)?.typesense ?? {}
  const privateConfig = (config as any)?.typesense ?? {}
  const typesense = { ...publicConfig, ...privateConfig }

  const rawHost = String(typesense.host || '')
  let host = rawHost.replace(/^https?:\/\//, '')
  let protocol = rawHost.startsWith('https') ? 'https' : 'http'
  let port = Number(typesense.port || 8108)

  try {
    if (rawHost.startsWith('http')) {
      const url = new URL(rawHost)
      host = url.hostname
      protocol = url.protocol.replace(':', '') || protocol
      if (url.port) port = Number(url.port)
    } else if (host.includes(':')) {
      const [nextHost, nextPort] = host.split(':')
      host = nextHost
      if (nextPort) port = Number(nextPort)
    }
  } catch {
    // fallback to defaults above
  }

  host = host || 'localhost'
  const apiKey = String(typesense.apiKey || '')

  const client = new Typesense.Client({
    nodes: [
      {
        host,
        port,
        protocol,
      },
    ],
    apiKey,
    connectionTimeoutSeconds: 2,
  })

  return {
    provide: {
      typesense: client,
    },
  }
})
