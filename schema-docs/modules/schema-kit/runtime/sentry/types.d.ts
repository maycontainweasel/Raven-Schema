// packages/pmv2shared/pmv2shared/sentry/types.d.ts
export {}

declare global {
  // server/global
  // eslint-disable-next-line no-var
  var $SE: (errorOrMsg: unknown, extras?: Record<string, any>) => void
}

declare module 'h3' {
  interface H3EventContext {
    SE: (errorOrMsg: unknown, extras?: Record<string, any>) => void
  }
}

declare module '#app' {
  interface NuxtApp {
    $SE: (errorOrMsg: unknown, extras?: Record<string, any>) => void
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $SE: (errorOrMsg: unknown, extras?: Record<string, any>) => void
  }
}