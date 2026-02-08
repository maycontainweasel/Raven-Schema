import { ref } from 'vue'
import { defineStore } from 'pinia'

export type HeliosThemeSettingsState = {
  activeThemeId: string
  themes: any[]
}

export const useHeliosManagerStore = defineStore('helios-manager', () => {
  const loading = ref(false)
  const committing = ref(false)
  const status = ref('')

  const breakpoints = ref<any[]>([])
  const colorPalettes = ref<any[]>([])
  const themeSettings = ref<HeliosThemeSettingsState>({
    activeThemeId: 'default',
    themes: [],
  })

  const resetState = () => {
    loading.value = false
    committing.value = false
    status.value = ''
    breakpoints.value = []
    colorPalettes.value = []
    themeSettings.value = {
      activeThemeId: 'default',
      themes: [],
    }
  }

  return {
    loading,
    committing,
    status,
    breakpoints,
    colorPalettes,
    themeSettings,
    resetState,
  }
})
