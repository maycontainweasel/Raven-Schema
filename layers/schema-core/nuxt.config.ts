export default defineNuxtConfig({
  modules: ['./modules/schema-kit'],
  build: {
    transpile: ['trpc-nuxt'],
  },
})
