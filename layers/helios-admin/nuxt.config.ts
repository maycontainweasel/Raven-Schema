import { fileURLToPath } from 'node:url'

const layerRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'helios-admin',
  },
  alias: {
    '#helios-admin': layerRoot,
  },
  runtimeConfig: {
    public: {
      heliosAdmin: {
        fragmentsDir: 'app/helios/fragments/admin',
        generatedDir: 'app/helios/generated/admin',
        modelFragmentsDir: 'app/helios/fragments/models',
        modelGeneratedDir: 'app/helios/generated/models',
      },
    },
  },
})
