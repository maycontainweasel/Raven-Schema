import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    include: ['test/capabilities/**/*.spec.ts'],
    environment: 'node',
    setupFiles: ['test/capabilities/setup.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
  plugins: [
    {
      name: 'schema-custom-controllers-resolver',
      resolveId(source) {
        const prefix = '@schema/custom-controllers/'
        if (source.startsWith(prefix)) {
          const subPath = source.slice(prefix.length)
          return resolve(__dirname, './modules/schema-kit/runtime/controllers/custom', subPath)
        }
        return null
      },
    },
    {
      name: 'schema-imports-stub',
      resolveId(source) {
        if (source === '#imports') {
          return resolve(__dirname, './test/capabilities/nuxt-imports.ts')
        }
        return null
      },
    },
  ],
  resolve: {
    alias: [
      { find: '@schema/custom-controllers', replacement: resolve(__dirname, './modules/schema-kit/runtime/controllers/custom') },
      { find: '@schema/request-schema', replacement: resolve(__dirname, './modules/schema-kit/runtime/generated/request-schema.ts') },
      { find: '@schema/typesense/collections', replacement: resolve(__dirname, './modules/schema-kit/runtime/generated/typesense/collections.ts') },
      { find: '@schema/types', replacement: resolve(__dirname, './app/types/schema/generated') },
      { find: '@schema/db', replacement: resolve(__dirname, './modules/schema-kit/runtime/generated/databases.ts') },
      { find: '@schema/models', replacement: resolve(__dirname, './modules/schema-kit/runtime/generated/models.ts') },
      { find: '@schema', replacement: resolve(__dirname, './modules/schema-kit/runtime') },
      { find: '~', replacement: resolve(__dirname, './') },
      { find: '@', replacement: resolve(__dirname, './app') },
    ],
  },
})
