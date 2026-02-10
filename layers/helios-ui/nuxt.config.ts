import { fileURLToPath } from 'node:url'

const layerRoot = fileURLToPath(new URL('./', import.meta.url))

export default defineNuxtConfig({
  $meta: {
    name: 'helios-ui',
  },
  alias: {
    '#helios-ui': layerRoot,
  },
})
