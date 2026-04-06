import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { createRequire } from 'module'
import {
  addComponentsDir,
  addImportsDir,
  addPlugin,
  addServerHandler,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'

export interface SchemaKitModuleOptions {
  configFile?: string
}

type SchemaKitConfig = {
  appName?: string
  aliases?: Record<string, string>
  validation?: {
    strict?: boolean
  }
  features?: {
    typesense?: boolean
    trpcClient?: boolean
    trpcServer?: boolean
    auth?: { enabled?: boolean } | boolean
    sentry?: {
      enabled?: boolean
      client?: boolean
      server?: boolean
      sourceMaps?: boolean
    } | boolean
    redis?: { enabled?: boolean } | boolean
    surrealdb?: {
      enabled?: boolean
      reconnectOnAuthLoss?: boolean
      retryFailedRequestsAfterReconnect?: boolean
    } | boolean
    notify?: boolean
  }
}

export default defineNuxtModule<SchemaKitModuleOptions>({
  meta: {
    name: 'schema-kit',
    configKey: 'schemaKit',
  },
  defaults: {
    configFile: 'schema-kit.config.json',
  },
  setup(options, nuxt) {
    const configPath = resolve(nuxt.options.rootDir, options.configFile ?? 'schema-kit.config.json')
    let config: SchemaKitConfig | null = null
    const localRequire = createRequire(import.meta.url)

    try {
      const raw = readFileSync(configPath, 'utf-8')
      config = JSON.parse(raw) as SchemaKitConfig
    } catch {
      config = null
    }

    if (config?.aliases?.['@schema']) {
      const rawAlias = String(config.aliases['@schema'])
      const normalized = rawAlias.replace(/\\/g, '/')
      if (normalized.match(/\/index\.(t|j)sx?$/)) {
        config.aliases['@schema'] = normalized.replace(/\/index\.(t|j)sx?$/, '')
      }
    }

    const resolver = createResolver(import.meta.url)
    const rootDir = nuxt.options.rootDir
    const overridesRoot = resolve(rootDir, 'schema/overrides/schema-kit')
    const overridesRuntime = resolve(overridesRoot, 'runtime')

    const resolvePackageRoot = (name: string) => {
      try {
        const pkgPath = localRequire.resolve(`${name}/package.json`)
        return dirname(pkgPath)
      } catch {
        return null
      }
    }

    const resolveOverride = (relPath: string) => {
      const candidate = resolve(overridesRuntime, relPath)
      return existsSync(candidate) ? candidate : null
    }

    const resolveOverrideFile = (relPathNoExt: string) => {
      const candidates = [
        resolve(overridesRuntime, relPathNoExt),
        resolve(overridesRuntime, `${relPathNoExt}.ts`),
        resolve(overridesRuntime, `${relPathNoExt}.js`),
        resolve(overridesRuntime, `${relPathNoExt}.mjs`),
      ]
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate
      }
      return null
    }

    const resolveCandidate = (candidates: string[]) => {
      for (const candidate of candidates) {
        const resolved = candidate.startsWith('.')
          ? resolve(rootDir, candidate)
          : candidate.startsWith('/')
            ? candidate
            : resolver.resolve(candidate)
        if (existsSync(resolved)) return resolved
      }
      const fallback = candidates[0]
      if (!fallback) return ''
      return fallback.startsWith('.')
        ? resolve(rootDir, fallback)
        : fallback.startsWith('/')
          ? fallback
          : resolver.resolve(fallback)
    }

    const ensurePrecomputedStub = () => {
      const distDir = resolve(rootDir, '.nuxt', 'dist', 'server')
      const stubPath = resolve(distDir, 'client.precomputed.mjs')
      if (existsSync(stubPath)) return
      try {
        mkdirSync(distDir, { recursive: true })
        writeFileSync(stubPath, 'export default undefined\n', 'utf-8')
        console.warn('[schema-kit] created missing client.precomputed.mjs stub')
      } catch (error) {
        console.warn('[schema-kit] failed to create client.precomputed.mjs stub:', error)
      }
    }

    const overrideContextFile = resolveOverrideFile('server/trpc/context')
    const overrideTypesenseFile = resolveOverrideFile('server/typesense')
    const controllerOverridesDir = resolveCandidate([
      './schema/controllers',
      './app/schema/controllers',
      resolver.resolve('runtime/controllers/custom'),
    ])
    const storeOverrideRoot = resolveCandidate([
      './schema/stores',
      './app/schema/stores',
      resolver.resolve('runtime/stores/custom'),
    ])
    let controllerKeys: string[] = []
    try {
      const manifestPath = resolver.resolve('runtime/generated/controller-manifest.json')
      const manifestRaw = readFileSync(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestRaw) as Array<{ key?: string }>
      controllerKeys = manifest.map((entry) => entry.key).filter((key): key is string => Boolean(key))
    } catch {}
    const customControllerAliases = controllerKeys.reduce<Record<string, string>>((aliases, key) => {
      aliases[`@schema/custom-controllers/${key}`] = resolveCandidate([
        `./schema/controllers/${key}.ts`,
        `./schema/controllers/${key}`,
        `./app/schema/controllers/${key}.ts`,
        `./app/schema/controllers/${key}`,
        resolver.resolve(`runtime/controllers/custom/${key}.ts`),
      ])
      return aliases
    }, {})
    const storeKeys = ['auth', 'apiModels']
    const customStoreAliases = storeKeys.reduce<Record<string, string>>((aliases, key) => {
      aliases[`@schema/custom-stores/${key}`] = resolveCandidate([
        `./schema/stores/${key}.ts`,
        `./schema/stores/${key}`,
        `./app/schema/stores/${key}.ts`,
        `./app/schema/stores/${key}`,
        resolver.resolve(`runtime/stores/custom/${key}.ts`),
      ])
      return aliases
    }, {})
    const sharedRoot = resolvePackageRoot('@pmv2/shared')
    const fallbackAliases: Record<string, string> = {
      '@schema': resolver.resolve('runtime'),
      '@schema/plugins': resolver.resolve('runtime/plugins'),
      '@schema/server': resolver.resolve('runtime/server'),
      '@schema/runtime-base': resolver.resolve('runtime'),
      '@schema/runtime-server-base': resolver.resolve('runtime/server'),
      ...(sharedRoot ? { '@schema/shared': sharedRoot } : {}),
      '@schema/server/trpc/context': overrideContextFile ?? resolver.resolve('runtime/server/trpc/context'),
      '@schema/server/typesense': overrideTypesenseFile ?? resolver.resolve('runtime/server/typesense'),
      '@schema/controllers': resolver.resolve('runtime/controllers'),
      '@schema/custom-controllers': controllerOverridesDir,
      '@schema/custom-stores': storeOverrideRoot,
      ...customControllerAliases,
      ...customStoreAliases,
      '@schema/request-schema': resolveCandidate([
        resolver.resolve('runtime/generated/request-schema.ts'),
        './modules/schema-kit/runtime/generated/request-schema.ts',
      ]),
      '@schema/models': resolver.resolve('runtime/models'),
      '@schema/models/generated': resolveCandidate([
        resolver.resolve('runtime/generated/models.ts'),
        './modules/schema-kit/runtime/generated/models.ts',
      ]),
      '@schema/models/overrides': resolveCandidate([
        './schema/models.override.ts',
        './schema/models.override.js',
        './schema/models.override.mjs',
        './schema/models.override.json',
        './app/schema/models.override.ts',
        './app/schema/models.override.js',
        './app/schema/models.override.mjs',
        './app/schema/models.override.json',
        resolver.resolve('runtime/models-overrides.empty.ts'),
      ]),
      '@schema/types': resolveCandidate([
        './app/types/schema/generated',
        resolver.resolve('runtime/generated/types'),
      ]),
      '@schema/typesense/collections': resolveCandidate([
        resolver.resolve('runtime/generated/typesense/collections.ts'),
        './modules/schema-kit/runtime/generated/typesense/collections.ts',
        resolver.resolve('runtime/generated/typesense/collections.empty.ts'),
      ]),
      '@schema/db': resolveCandidate([
        resolver.resolve('runtime/generated/databases.ts'),
        './modules/schema-kit/runtime/generated/databases.ts',
      ]),
      '@schema/controllers/user': resolveCandidate([resolver.resolve('runtime/controllers/user.ts')]),
      '@schema/custom-controllers/user': resolveCandidate([
        './schema/controllers/user.ts',
        './schema/controllers/user',
        './app/schema/controllers/user.ts',
        './app/schema/controllers/user',
        resolver.resolve('runtime/controllers/custom/user.ts'),
      ]),
    }

    const aliasConfig = {
      ...fallbackAliases,
      ...(config?.aliases ?? {}),
    }

    const validationStrict = config?.validation?.strict !== false

    const readPackageDeps = () => {
      try {
        const raw = readFileSync(resolve(rootDir, 'package.json'), 'utf-8')
        const pkg = JSON.parse(raw) as {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
          peerDependencies?: Record<string, string>
        }
        return {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
          ...(pkg.peerDependencies ?? {}),
        }
      } catch {
        return {}
      }
    }

    const hasAnyDep = (deps: Record<string, string>, names: string[]) =>
      names.some((name) => Boolean(deps[name]))

    const resolveRuntimeValue = (path: string) => {
      const parts = path.split('.')
      let current: any = nuxt.options.runtimeConfig
      for (const part of parts) {
        if (current == null) return undefined
        current = current[part]
      }
      return current
    }

    const requireRuntimeValue = (path: string) => {
      const value = resolveRuntimeValue(path)
      return value !== undefined && value !== null && value !== ''
    }

    const envCache: Record<string, string> = {}
    let envLoaded = false

    const parseEnvContent = (content: string) => {
      const lines = content.split(/\r?\n/)
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
        if (!match) continue
        const key = match[1]
        let value = match[2] ?? ''
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        } else if (value.includes(' #')) {
          value = value.split(' #')[0].trim()
        }
        envCache[key] = value
      }
    }

    const loadEnvFiles = () => {
      if (envLoaded) return
      const candidates = ['.env', '.env.local', '.env.staging']
      for (const name of candidates) {
        const filePath = resolve(rootDir, name)
        if (!existsSync(filePath)) continue
        try {
          const content = readFileSync(filePath, 'utf-8')
          parseEnvContent(content)
        } catch {}
      }
      envLoaded = true
    }

    const hasEnvValue = (keys: string[]) => {
      for (const key of keys) {
        const value = process.env[key]
        if (value !== undefined && value !== null && value !== '') return true
      }
      loadEnvFiles()
      for (const key of keys) {
        const value = envCache[key]
        if (value !== undefined && value !== null && value !== '') return true
      }
      return false
    }

    const validateFeatures = () => {
      const deps = readPackageDeps()
      const errors: string[] = []

      const features = config?.features ?? {}

      if (!hasAnyDep(deps, ['sass-embedded'])) {
        errors.push('sass-embedded is required but missing.')
        errors.push('Install: pnpm add -D sass-embedded@^1.80.0')
      }

      const redisEnabled = typeof features.redis === 'boolean'
        ? features.redis
        : features.redis?.enabled
      if (redisEnabled) {
        if (!hasAnyDep(deps, ['ioredis'])) {
          errors.push('Redis enabled but dependency "ioredis" is missing.')
          errors.push('Install: pnpm add ioredis')
        }
        const hasRedisRuntime = requireRuntimeValue('redis.host') && requireRuntimeValue('redis.port')
        const hasRedisEnv = hasEnvValue([
          'NUXT_REDIS_HOST',
          'NUXT_REDIS_PORT',
          'NUXT_REDIS__HOST',
          'NUXT_REDIS__PORT',
          'REDIS_HOST',
          'REDIS_PORT',
        ])
        if (!hasRedisRuntime && !hasRedisEnv) {
          errors.push('Redis enabled but runtimeConfig.redis.host/port are missing.')
          errors.push(
            'Env: NUXT_REDIS_HOST, NUXT_REDIS_PORT (optional: NUXT_REDIS_PASSWORD, NUXT_REDIS_FILE_LOGGING_ENABLED)',
          )
        }
      }

      const sentryEnabled = typeof features.sentry === 'boolean'
        ? features.sentry === true
        : features.sentry?.enabled === true
      if (sentryEnabled) {
        const hasSentryDep = hasAnyDep(deps, [
          '@sentry/node',
          '@sentry/vue',
          '@sentry/nuxt',
          '@sentry/vite-plugin',
        ])
        if (!hasSentryDep) {
          const wantsSourceMaps =
            typeof features.sentry === 'object'
              ? (features.sentry as any).sourceMaps !== false
              : true
          const installCmd = wantsSourceMaps
            ? 'pnpm add @sentry/vue@^10.5.0 @sentry/node@^10.5.0 && pnpm add -D @sentry/vite-plugin@^4.1.1'
            : 'pnpm add @sentry/vue@^10.5.0 @sentry/node@^10.5.0'
          errors.push('Sentry enabled but no @sentry/* dependency found.')
          errors.push(`Install: ${installCmd}`)
        }
        const hasSentryRuntime =
          requireRuntimeValue('sentry.dsn') || requireRuntimeValue('public.sentry.dsn')
        const hasSentryEnv = hasEnvValue([
          'NUXT_SENTRY_DSN',
          'NUXT_SENTRY_ENV',
          'NUXT_PUBLIC_SENTRY_DSN',
          'NUXT_PUBLIC_SENTRY_ENV',
        ])
        if (!hasSentryRuntime && !hasSentryEnv) {
          errors.push('Sentry enabled but runtimeConfig.sentry.dsn is missing.')
          errors.push(
            'Env: NUXT_SENTRY_DSN, NUXT_SENTRY_ENV, NUXT_PUBLIC_SENTRY_DSN, NUXT_PUBLIC_SENTRY_ENV',
          )
        }
      }

      const authEnabled = typeof features.auth === 'boolean'
        ? features.auth === true
        : features.auth?.enabled === true
      if (authEnabled) {
        const hasSecret =
          requireRuntimeValue('auth.sessionSecret') ||
          requireRuntimeValue('sessionSecret')
        const hasCookieDomain =
          requireRuntimeValue('auth.cookieDomain') ||
          requireRuntimeValue('cookieDomain')
        if (!hasSecret) {
          errors.push('Auth enabled but sessionSecret is missing.')
        }
        if (!hasCookieDomain) {
          errors.push('Auth enabled but cookieDomain is missing.')
        }
      }

      if (errors.length) {
        const message =
          `[schema-kit] Missing required feature dependencies/config:\n` +
          errors.map((line) => `- ${line}`).join('\n')
        if (validationStrict) {
          throw new Error(message)
        }
        console.warn(message)
      }
    }

    validateFeatures()

    nuxt.hook('nitro:build:before', () => {
      ensurePrecomputedStub()
    })

    const aliasEntries = Object.entries(aliasConfig)
      .filter(([, target]) => !!target)
      .map(([find, target]) => ({
        find,
        replacement: target.startsWith('.')
          ? resolve(nuxt.options.rootDir, target)
          : target,
      }))
      // Ensure more specific aliases are matched before the base @schema alias.
      .sort((a, b) => b.find.length - a.find.length)

    const toAliasEntries = (alias: unknown) => {
      if (Array.isArray(alias)) {
        return alias
      }
      if (alias && typeof alias === 'object') {
        return Object.entries(alias as Record<string, string>).map(([find, replacement]) => ({
          find,
          replacement,
        }))
      }
      return []
    }

    if (aliasConfig) {
      nuxt.options.alias ||= {}
      nuxt.options.vite ||= {}
      nuxt.options.vite.resolve ||= {}
      nuxt.options.nitro ||= {}
      nuxt.options.nitro.alias ||= {}

      for (const [alias, target] of Object.entries(aliasConfig)) {
        if (!target) continue
        const resolved = target.startsWith('.')
          ? resolve(nuxt.options.rootDir, target)
          : target
        nuxt.options.alias[alias] = resolved
        nuxt.options.nitro.alias[alias] = resolved
      }

      nuxt.options.vite.resolve.alias = [
        ...toAliasEntries(nuxt.options.vite.resolve.alias),
        ...aliasEntries,
      ]
    }

    // Ensure aliases are injected into the final Vite/Nitro configs.
    nuxt.hook('vite:extendConfig', (config) => {
      config.resolve ||= {}
      const entries = [
        ...toAliasEntries(config.resolve.alias),
        ...aliasEntries,
      ]
      config.resolve.alias = entries
    })

    nuxt.hook('nitro:config', (config) => {
      config.alias ||= {}
      for (const [key, target] of Object.entries(aliasConfig)) {
        if (!target) continue
        const resolved = target.startsWith('.')
          ? resolve(nuxt.options.rootDir, target)
          : target
        config.alias[key] = resolved
      }
    })

    // Suppress noisy Rollup warning from @opentelemetry/api (safe to ignore).
    nuxt.options.vite ||= {}
    nuxt.options.vite.build ||= {}
    nuxt.options.vite.build.rollupOptions ||= {}
    const existingOnWarn = nuxt.options.vite.build.rollupOptions.onwarn
    nuxt.options.vite.build.rollupOptions.onwarn = (warning, warn) => {
      if (
        warning.code === 'THIS_IS_UNDEFINED' &&
        typeof warning.id === 'string' &&
        warning.id.includes('@opentelemetry/api')
      ) {
        return
      }
      if (typeof existingOnWarn === 'function') {
        return existingOnWarn(warning, warn)
      }
      return warn(warning)
    }

    const overrideComposables = resolveOverride('composables')
    if (overrideComposables) {
      addImportsDir(overrideComposables)
    }
    addImportsDir(resolver.resolve('runtime/composables'))
    const overrideStores = resolveOverride('stores')
    if (overrideStores) {
      addImportsDir(overrideStores)
    }
    addImportsDir(resolver.resolve('runtime/stores'))

    const overrideComponents = resolveOverride('components')
    if (overrideComponents) {
      addComponentsDir({ path: overrideComponents, pathPrefix: false })
    }
    addComponentsDir({ path: resolver.resolve('runtime/components'), pathPrefix: false })
    const features = config?.features ?? {}
    const sentryEnabled =
      typeof features.sentry === 'boolean'
        ? features.sentry === true
        : (features.sentry as any)?.enabled === true
    const sentryClientEnabled = sentryEnabled && (features.sentry as any)?.client !== false
    const sentryServerEnabled = sentryEnabled && (features.sentry as any)?.server !== false
    const surrealEnabled =
      features.surrealdb === false ? false : (features.surrealdb as any)?.enabled !== false
    const redisEnabled =
      typeof features.redis === 'boolean'
        ? features.redis === true
        : (features.redis as any)?.enabled === true
    const trpcClientEnabled = features.trpcClient !== false
    const authEnabled =
      typeof features.auth === 'boolean'
        ? features.auth === true
        : (features.auth as any)?.enabled === true

    if (features.typesense === true) {
      const overridePlugin = resolveOverrideFile('plugins/typesense.client')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/typesense.client'))
      const overrideServerPlugin = resolveOverrideFile('plugins/typesense.server')
      addPlugin(overrideServerPlugin ?? resolver.resolve('runtime/plugins/typesense.server'))
      addTypeTemplate({
        filename: 'schema-kit-typesense.d.ts',
        getContents: () => `import type Typesense from 'typesense'

type TypesenseClient = Typesense.Client

declare module '#app' {
  interface NuxtApp {
    $typesense: TypesenseClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $typesense: TypesenseClient
  }
}

export {};
`,
      })
    }
    const require = createRequire(import.meta.url)
    const hasPackageUpTree = (packageName: string) => {
      let current = nuxt.options.rootDir
      while (true) {
        const candidate = resolve(current, 'node_modules', packageName, 'package.json')
        if (existsSync(candidate)) return true
        const parent = resolve(current, '..')
        if (parent === current) break
        current = parent
      }
      return false
    }
    const resolvePaths = [
      nuxt.options.rootDir,
      (nuxt.options as any).workspaceDir,
      process.cwd(),
    ].filter(Boolean) as string[]
    const hasVueSonner = (() => {
      try {
        require.resolve('vue-sonner', { paths: resolvePaths })
        return true
      } catch {
        return hasPackageUpTree('vue-sonner')
      }
    })()
    if (features.notify !== false && hasVueSonner) {
      const overridePlugin = resolveOverrideFile('plugins/notify.client')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/notify.client'))
      addTypeTemplate({
        filename: 'schema-kit-notify.d.ts',
        getContents: () => `export interface NotifyPlugin {
  toast: (message: string, options?: any) => string | number
  success: (message: string, options?: any) => string | number
  error: (message: string, options?: any) => string | number
  info: (message: string, options?: any) => string | number
  warning: (message: string, options?: any) => string | number
  loading: (message: string, options?: any) => string | number
  custom: (
    message: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) => string | number
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading?: string
      success?: string | ((data: T) => string)
      error?: string | ((error: any) => string)
    }
  ) => string | number
  dismiss: () => void
  dismissById: (id: string | number) => void
}

declare module '#app' {
  interface NuxtApp {
    $notify: NotifyPlugin
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $notify: NotifyPlugin
  }
}

export {};
`,
      })
    } else if (features.notify !== false && !hasVueSonner) {
      console.warn('[schema-kit] notify plugin skipped (vue-sonner not installed)')
    }
    if (trpcClientEnabled) {
      const overridePlugin = resolveOverrideFile('plugins/trpc-client')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/trpc-client'))
    }
    if (authEnabled) {
      const overridePlugin = resolveOverrideFile('plugins/auth-keepalive.client')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/auth-keepalive.client'))
    }
    if (sentryClientEnabled) {
      const overridePlugin = resolveOverrideFile('plugins/sentry.client')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/sentry.client'))
    }
    {
      const overridePlugin = resolveOverrideFile('plugins/user-controller')
      addPlugin(overridePlugin ?? resolver.resolve('runtime/plugins/user-controller'))
    }

    addTypeTemplate({
      filename: 'schema-kit-controllers.d.ts',
      getContents: () => {
        const manifestPath = resolver.resolve('runtime/generated/controller-manifest.json')
        let entries: Array<{ key: string; typeName: string }> = []
        try {
          const raw = readFileSync(manifestPath, 'utf-8')
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            entries = parsed.filter((item) => item && item.key && item.typeName)
          }
        } catch {
          entries = []
        }
        if (!entries.length) {
          const controllerPath = resolver.resolve('runtime/controllers/user')
          return `import type { UserController } from '${controllerPath}';

declare module '#app' {
  interface NuxtApp {
    $user: UserController;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $user: UserController;
  }
}

export {};
`
        }

        const importLines = entries
          .map((entry) => {
            const controllerPath = resolver.resolve(`runtime/controllers/${entry.key}`)
            return `import type { ${entry.typeName} } from '${controllerPath}';`
          })
          .join('\n')

        const nuxtLines = entries
          .map((entry) => `    $${entry.key}: ${entry.typeName};`)
          .join('\n')

        const vueLines = entries
          .map((entry) => `    $${entry.key}: ${entry.typeName};`)
          .join('\n')

        return `${importLines}

declare module '#app' {
  interface NuxtApp {
${nuxtLines}
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
${vueLines}
  }
}

export {};
`
      },
    })

    if (trpcClientEnabled) {
      addTypeTemplate({
        filename: 'schema-kit-trpc-client.d.ts',
        getContents: () => {
          return `import type { AppRouter } from '~~/server/trpc/routers/_app'
import type { createTRPCProxyClient } from '@trpc/client'

type TrpcClient = ReturnType<typeof createTRPCProxyClient<AppRouter>>

declare module '#app' {
  interface NuxtApp {
    $api: TrpcClient;
    $client: TrpcClient;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: TrpcClient;
    $client: TrpcClient;
  }
}

export {};
`
        },
      })
    }

    nuxt.options.nitro ||= {}
    nuxt.options.nitro.plugins ||= []
    if (sentryServerEnabled) {
      const overridePlugin = resolveOverrideFile('server/plugins/sentry.server')
      nuxt.options.nitro.plugins.push(
        overridePlugin ?? resolver.resolve('runtime/server/plugins/sentry.server')
      )
    }
    if (surrealEnabled) {
      const overridePlugin = resolveOverrideFile('server/plugins/surrealdb.server')
      nuxt.options.nitro.plugins.push(
        overridePlugin ?? resolver.resolve('runtime/server/plugins/surrealdb.server')
      )
    }
    if (redisEnabled) {
      const overridePlugin = resolveOverrideFile('server/plugins/redis.server')
      nuxt.options.nitro.plugins.push(
        overridePlugin ?? resolver.resolve('runtime/server/plugins/redis.server')
      )
    }

    // Expose alias resolution status at runtime for debugging.
    nuxt.options.runtimeConfig ||= {}
    nuxt.options.runtimeConfig.schemaKit ||= {}
    const appName =
      config?.appName ||
      (nuxt.options.app as any)?.name ||
      nuxt.options.runtimeConfig?.public?.appName ||
      nuxt.options.runtimeConfig?.appName ||
      'app'
    nuxt.options.runtimeConfig.schemaKit.appName = appName
    nuxt.options.runtimeConfig.schemaKit.features = features
    nuxt.options.runtimeConfig.public ||= {}
    nuxt.options.runtimeConfig.public.schemaKit ||= {}
    nuxt.options.runtimeConfig.public.schemaKit.appName = appName
    nuxt.options.runtimeConfig.schemaKit.aliasStatus = Object.entries(aliasConfig).map(([alias, target]) => ({
      alias,
      target,
      exists: typeof target === 'string' ? existsSync(target) : false,
    }))

    if (sentryEnabled && features.sentry?.sourceMaps !== false) {
      const authToken = process.env.SENTRY_AUTH_TOKEN
      const org = process.env.SENTRY_ORG
      const project = process.env.SENTRY_PROJECT
      if (!authToken || !org || !project) {
        console.warn(
          '[schema-kit] Sentry source maps skipped: set SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT to enable upload.'
        )
      } else {
        nuxt.hook('vite:extendConfig', async (config) => {
          try {
            const mod = await import('@sentry/vite-plugin')
            const sentryVitePlugin = (mod as any).sentryVitePlugin || (mod as any).default
            if (typeof sentryVitePlugin !== 'function') {
              console.warn('[schema-kit] @sentry/vite-plugin not available; skipping source maps.')
              return
            }
            config.plugins ||= []
            config.plugins.push(
              sentryVitePlugin({
                authToken,
                org,
                project,
                release: process.env.SENTRY_RELEASE || process.env.NUXT_SENTRY_RELEASE,
                sourcemaps: {
                  assets: './.output/public/_nuxt/**',
                },
              })
            )
          } catch (err) {
            console.warn('[schema-kit] Failed to load @sentry/vite-plugin:', err)
          }
        })
      }
    }

    {
      const overrideHandler = resolveOverrideFile('server/api/aliases.get')
      addServerHandler({
        route: '/api/schema-kit/aliases',
        handler: overrideHandler ?? resolver.resolve('runtime/server/api/aliases.get'),
      })
    }

    if (authEnabled) {
      const authHandlers = [
        { name: 'login', method: 'post' },
        { name: 'logout', method: 'post' },
        { name: 'register', method: 'post' },
        { name: 'me', method: 'get' },
      ]
      const extCandidates = ['.ts', '.js', '.mjs']

      for (const handler of authHandlers) {
        const basePath = resolve(rootDir, 'server', 'api', 'auth', `${handler.name}.${handler.method}`)
        const hasAppHandler = extCandidates.some((ext) => existsSync(`${basePath}${ext}`))
        if (hasAppHandler) continue

        const overrideHandler = resolveOverrideFile(`server/api/auth/${handler.name}.${handler.method}`)
        addServerHandler({
          route: `/api/auth/${handler.name}`,
          handler: overrideHandler ?? resolver.resolve(`runtime/server/api/auth/${handler.name}.${handler.method}`),
        })
      }
    }

    if (redisEnabled) {
      const redisHandlers = [
        { name: 'query', method: 'post' },
        { name: 'pipeline', method: 'post' },
      ]
      const extCandidates = ['.ts', '.js', '.mjs']

      for (const handler of redisHandlers) {
        const basePath = resolve(rootDir, 'server', 'api', 'r', `${handler.name}.${handler.method}`)
        const hasAppHandler = extCandidates.some((ext) => existsSync(`${basePath}${ext}`))
        if (hasAppHandler) continue

        const overrideHandler = resolveOverrideFile(`server/api/r/${handler.name}.${handler.method}`)
        addServerHandler({
          route: `/api/r/${handler.name}`,
          handler: overrideHandler ?? resolver.resolve(`runtime/server/api/r/${handler.name}.${handler.method}`),
        })
      }
    }

    if (features.trpcServer !== false) {
      const trpcHandlerCandidates = [
        resolve(rootDir, 'server', 'api', 'trpc', '[trpc].ts'),
        resolve(rootDir, 'server', 'api', 'trpc', '[trpc].js'),
        resolve(rootDir, 'server', 'api', 'trpc', '[trpc].mjs'),
      ]
      const hasAppHandler = trpcHandlerCandidates.some((candidate) => existsSync(candidate))
      if (!hasAppHandler) {
        addServerHandler({
          route: '/api/trpc/:trpc',
          handler: resolver.resolve('runtime/server/api/trpc'),
        })
      }
    }

    const aliasMap = nuxt.options.vite?.resolve?.alias ?? {}
    if (process.env.SCHEMA_KIT_DEBUG_ALIAS === '1') {
      console.info('[schema-kit] alias map', aliasMap)
    }

    const missingAliases: Array<{ alias: string; target: string }> = []
    for (const [alias, target] of Object.entries(aliasMap)) {
      if (typeof target !== 'string') continue
      const exists = existsSync(target)
      if (!exists) {
        missingAliases.push({ alias, target })
        if (process.env.SCHEMA_KIT_DEBUG_ALIAS === '1') {
          console.warn(`[schema-kit] alias target missing for ${alias}: ${target}`)
        }
      }
    }

    if (missingAliases.length && process.env.SCHEMA_KIT_STRICT_ALIAS === '1') {
      const details = missingAliases.map((item) => `${item.alias} -> ${item.target}`).join('\n')
      throw new Error(
        `[schema-kit] Missing alias targets:\n${details}\n` +
          'Ensure schema generate output exists for this app before starting dev/build.'
      )
    }

    if (missingAliases.length && process.env.SCHEMA_KIT_STRICT_ALIAS !== '1') {
      const details = missingAliases.map((item) => `${item.alias} -> ${item.target}`).join('\n')
      console.warn(
        `[schema-kit] Missing alias targets:\n${details}\n` +
          'Run schema:generate for this app to restore generated assets.'
      )
    }
  },
})
