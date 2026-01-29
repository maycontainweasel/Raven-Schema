import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '~~/server/trpc/routers/_app'
import superjson from 'superjson'

superjson.registerCustom<any, { tb: string; id: any }>(
  {
    isApplicable: (v: any) =>
      v && typeof v === 'object' &&
      ('tb' in v) && ('id' in v) &&
      // also catch the class instance
      (v.constructor?.name === '_RecordId' || true),
    serialize: (v: any) => ({
      tb: String(v.tb),
      // Keep the id as-is to preserve complex types (arrays, nested objects, etc.)
      id: v.id,
    }),
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
