import * as HeliosFields from '#layers/helios-ui/app/components/fields'

const isVueComponent = (value: unknown) => {
  if (!value) return false
  if (typeof value === 'function') return true
  if (typeof value === 'object') return true
  return false
}

export default defineNuxtPlugin((nuxtApp) => {
  const app = nuxtApp.vueApp

  for (const [name, component] of Object.entries(HeliosFields)) {
    if (!isVueComponent(component)) continue
    app.component(name, component as any)
  }
})
