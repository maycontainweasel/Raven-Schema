import { defineNuxtPlugin, useNuxtApp } from '#app'

type DepStatus = { name: string; ok: boolean }

const warnMissing = (missing: string[]) => {
  if (missing.length === 0) return
  const command = `pnpm add ${missing.join(' ')}`
  console.warn(
    `[Helios] Missing dependencies: ${missing.join(', ')}.\n` +
    `Install with: ${command}`
  )
}

export default defineNuxtPlugin(async () => {
  const nuxtApp = useNuxtApp()
  const deps: DepStatus[] = []

  deps.push({ name: '@pinia/nuxt', ok: Boolean(nuxtApp.$pinia) })

  try {
    await import('@headlessui/vue')
    deps.push({ name: '@headlessui/vue', ok: true })
  }
  catch {
    deps.push({ name: '@headlessui/vue', ok: false })
  }

  try {
    await import('@iconify-json/lucide/icons.json')
    deps.push({ name: '@iconify-json/lucide', ok: true })
  }
  catch {
    deps.push({ name: '@iconify-json/lucide', ok: false })
  }

  const unoStyle = document.querySelector(
    'style[id*=\"uno\"], style[data-unocss], style[data-vite-dev-id*=\"uno\"], link[href*=\"uno\"]'
  )
  deps.push({ name: '@unocss/nuxt', ok: Boolean(unoStyle) })
  deps.push({ name: 'unocss', ok: Boolean(unoStyle) })

  const missing = deps.filter((dep) => !dep.ok).map((dep) => dep.name)
  ;(window as any).__HELIOS_DEPS_STATUS__ = deps
  ;(window as any).__HELIOS_MISSING_DEPS__ = missing
  warnMissing(missing)
})
