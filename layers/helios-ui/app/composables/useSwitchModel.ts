import type { Ref } from 'vue'

export const useSwitchModel = (model: Ref<boolean>) => {
  const onCheckedChange = (details: { checked: boolean }) => {
    model.value = details.checked === true
  }

  return {
    onCheckedChange,
  }
}
