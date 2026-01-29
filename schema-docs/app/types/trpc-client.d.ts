import type { AppRouter } from '~~/server/trpc/routers/_app'
import type { createTRPCProxyClient } from '@trpc/client'

type TrpcClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>

declare module '#app' {
  interface NuxtApp {
    $api: TrpcClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: TrpcClient
  }
}

export {}
