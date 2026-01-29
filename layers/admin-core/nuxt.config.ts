import tailwindcss from "@tailwindcss/vite";

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

function asset(path: string) {
  const assetPath = join(currentDir, path).replace(/\\/g, "/")
  // console.log('assetPath', assetPath)
  return assetPath
}

export default defineNuxtConfig({
  css: [  
    asset("app/assets/css/tailwind.css"),
    asset("app/assets/scss/main.scss"),
  ],
  vite: {
    plugins: [tailwindcss()],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: [
            `@use "${asset("app/assets/scss/mq.scss")}" as *;`
          ].join('\n'),
        },
      },
    },
  },
})
