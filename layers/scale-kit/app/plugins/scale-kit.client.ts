import { defineNuxtPlugin, useRoute, useRouter, useRuntimeConfig } from '#app'
import { createApp, h, watch } from 'vue'
import ScaleKitOverlay from '../components/ScaleKitOverlay.vue'
import { createScaleKit } from '../utils/scale-kit'
import { useHeliosScaleStore } from '../stores/helios'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public.scaleKit as any
  const kit = createScaleKit(config)
  kit.apply()
  const scaleStore = useHeliosScaleStore()
  scaleStore.initFromConfig()
  scaleStore.setKit(kit)

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => kit.apply())
    window.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        kit.toggleOverlay()
      }
    })
    ;(window as any).__SCALE_KIT__ = kit
  }

  if (scaleStore.tokens) {
    kit.tokens = JSON.parse(JSON.stringify(scaleStore.tokens))
    kit.apply()
  }

  const syncState = { fromStore: false, fromKit: false }

  watch(
    () => scaleStore.tokens,
    (value) => {
      if (!value || syncState.fromKit) return
      syncState.fromStore = true
      kit.tokens = JSON.parse(JSON.stringify(value))
      kit.apply()
      scaleStore.saveDraft()
      syncState.fromStore = false
    },
    { deep: true }
  )

  watch(
    () => kit.tokens,
    (value) => {
      if (syncState.fromStore) return
      syncState.fromKit = true
      scaleStore.replaceTokens(JSON.parse(JSON.stringify(value)))
      scaleStore.saveDraft()
      syncState.fromKit = false
    },
    { deep: true }
  )

  if (!config.enableOverlay || typeof document === 'undefined') return

  const route = useRoute()
  const router = useRouter()
  let mounted = false

  const mountOverlay = () => {
    if (mounted || route.path === '/scale') return
    const container = document.createElement('div')
    container.id = 'scale-kit-overlay'
    document.body.appendChild(container)
    const app = createApp({
      render: () => h(ScaleKitOverlay, { kit }),
    })
    app.mount(container)
    mounted = true
  }

  mountOverlay()
  router.afterEach(() => {
    mountOverlay()
  })
})
