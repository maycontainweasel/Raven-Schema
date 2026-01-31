export default defineNuxtConfig({
  modules: ['~~/modules/schema-kit', '@pinia/nuxt'],
  build: {
    transpile: ['trpc-nuxt'],
  },
})
