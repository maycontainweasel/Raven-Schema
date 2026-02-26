import { fileURLToPath } from 'node:url'

const layerRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'helios-ui',
  },
  alias: {
    '#helios-ui': layerRoot,
  },
  components: {
    dirs: [
      {
        path: fileURLToPath(new URL('./app/components/fields', import.meta.url)),
        pathPrefix: false,
        global: true,
      },
    ],
  },
})
