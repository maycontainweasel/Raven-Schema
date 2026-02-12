import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '~~/server/trpc/routers/_app'
import superjson from 'superjson'

const isSurrealRecordIdLike = (v: any) => {
  if (!v || typeof v !== 'object') return false
  const ctor = v.constructor?.name
  if (ctor === '_RecordId' || ctor === 'RecordId') return true
  if ('tb' in v && 'id' in v) return true
  if (!('table' in v) || !('id' in v)) return false
  const table = (v as any).table
  return typeof table === 'string' || typeof table?.name === 'string'
}

const recordIdTable = (v: any): string => {
  if ('tb' in v) return String(v.tb)
  const table = (v as any).table
  return String(typeof table === 'string' ? table : table?.name ?? '')
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false
  return Object.getPrototypeOf(value) === Object.prototype
}

const serializeNestedRecordIds = (value: any): any => {
  if (isSurrealRecordIdLike(value)) {
    return {
      tb: recordIdTable(value),
      id: serializeNestedRecordIds(value.id),
    }
  }
  if (Array.isArray(value)) {
    return value.map(item => serializeNestedRecordIds(item))
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializeNestedRecordIds(nested)]),
    )
  }
  return value
}

superjson.registerCustom<any, { tb: string; id: any }>(
  {
    isApplicable: (v: any) => isSurrealRecordIdLike(v),
    serialize: (v: any) => {
      return {
        tb: recordIdTable(v),
        id: serializeNestedRecordIds(v.id),
      }
    },
    // we deliberately keep it a plain object on the client
    deserialize: (v) => v,
  },
  'SurrealRecordId'
)

export default defineNuxtPlugin({
  name: 'trpc-client',
  setup(nuxtApp) {
    const client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `/api/trpc`,
          transformer: superjson,
          fetch: async (url, opts) => {
            console.log('🔗 [TRPC] Fetching:', url)
            const res = await fetch(url, { ...opts, credentials: 'include' })
            if (res.status === 401) {
              // Optional: guard for recursive loops if logout triggers calls
              // try { await $auth.logout() } catch {}
            }
            return res
          },
        }),
      ],
    })

    const hasApi = Boolean((nuxtApp as any)?.$api)
    if (hasApi) {
      console.warn('[schema-kit] $api already exists; exposing TRPC client as $trpc instead')
    }

    return {
      provide: {
        client,
        ...(hasApi ? { trpc: client } : { api: client, trpc: client }),
      },
    }
  },
})
