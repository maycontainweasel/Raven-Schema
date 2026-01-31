import scaleTokens from './scale.tokens.json'

export default defineNuxtConfig({
  $meta: {
    name: 'helios',
  },
  runtimeConfig: {
    public: {
      scaleKit: {
        levels: 10,
        minLevel: -5,
        storageKey: 'scale-kit',
        enableOverlay: true,
        tokens: scaleTokens,
      },
    },
  },
})
