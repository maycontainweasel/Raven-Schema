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
  const flag = '__HELIOS_DEPS_CHECKED__'
  if ((globalThis as any)[flag]) return
  ;(globalThis as any)[flag] = true

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

  try {
    await import('@unocss/nuxt')
    deps.push({ name: '@unocss/nuxt', ok: true })
  }
  catch {
    deps.push({ name: '@unocss/nuxt', ok: false })
  }

  try {
    await import('unocss')
    deps.push({ name: 'unocss', ok: true })
  }
  catch {
    deps.push({ name: 'unocss', ok: false })
  }

  const missing = deps.filter((dep) => !dep.ok).map((dep) => dep.name)
  warnMissing(missing)
})
