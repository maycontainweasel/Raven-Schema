export default defineNuxtConfig({
  $meta: {
    name: 'fields',
  },
  runtimeConfig: {
    public: {
      fields: {
        fragmentsDir: 'app/fields/fragments',
        generatedDir: 'app/fields/generated',
        componentsDir: 'app/components/fields',
      },
    },
  },
})
