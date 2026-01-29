<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import CreateDialogDefault from './CreateDialogDefault.vue'

const props = withDefaults(
  defineProps<{
    model: string
    open: boolean
    form: Record<string, any>
    title: string
    subtitle?: string
    fields: Array<{
      key: string
      label: string
      type?: 'text' | 'number' | 'textarea' | 'select' | 'instances'
      placeholder?: string
      rows?: number
      multiple?: boolean
      autoFrom?: string
      format?: 'slug'
      message?: string
      options?: Array<{ label: string; value: string | number }>
    }>
    loading?: boolean
    submitLabel?: string
    cancelLabel?: string
  }>(),
  {
    loading: false,
    submitLabel: 'Create',
    cancelLabel: 'Cancel'
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:form', value: Record<string, any>): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()

const overrideModules = import.meta.glob('@/components/admin/overrides/**/CreateDialog.vue')

const resolveOverride = (suffix: string) => {
  const match = Object.keys(overrideModules).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(overrideModules[match] as any)
}

const resolvedComponent = computed(() => {
  const modelKey = props.model?.toLowerCase()
  if (!modelKey) return CreateDialogDefault
  const override = resolveOverride(`components/admin/overrides/${modelKey}/CreateDialog.vue`)
  return override ?? CreateDialogDefault
})

const forward = {
  'update:open': (value: boolean) => emit('update:open', value),
  'update:form': (value: Record<string, any>) => emit('update:form', value),
  submit: () => emit('submit'),
  cancel: () => emit('cancel')
}
</script>

<template>
  <component
    :is="resolvedComponent"
    :model="model"
    :open="open"
    :form="form"
    :title="title"
    :subtitle="subtitle"
    :fields="fields"
    :loading="loading"
    :submit-label="submitLabel"
    :cancel-label="cancelLabel"
    @update:open="forward['update:open']"
    @update:form="forward['update:form']"
    @submit="forward.submit"
    @cancel="forward.cancel"
  />
</template>
