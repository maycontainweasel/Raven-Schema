<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  model: string
  modelLabel?: string
  record?: Record<string, any> | null
  routeId?: string
  showBack?: boolean
  showInstances?: boolean
  showStatus?: boolean
  showRefresh?: boolean
  showDelete?: boolean
  statusOptions?: Array<{ label: string; value: string }>
}>()

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'refresh'): void
  (event: 'delete'): void
  (event: 'update-status', status: string): void
}>()

const modelLabel = computed(() => props.modelLabel ?? props.model ?? 'Record')

const recordLabel = computed(() => {
  const record = props.record ?? {}
  const lower = (props.model ?? '').toLowerCase()
  if (lower === 'question' || lower === 'questions') {
    return record.qid ?? record.id ?? props.routeId ?? ''
  }
  return (
    record.title ??
    record.name ??
    record.label ??
    record.slug ??
    record.key ??
    record.id ??
    props.routeId ??
    ''
  )
})

const instances = computed(() => {
  const record = props.record ?? {}
  return (
    record.post?.instances ??
    record.instances ??
    []
  )
})

const statusOptions = computed(() =>
  props.statusOptions?.length
    ? props.statusOptions
    : [
        { label: 'Draft', value: 'draft' },
        { label: 'Publish', value: 'publish' },
      ]
)

const statusValue = ref('draft')
const updatingStatus = ref(false)

watch(
  () => props.record,
  (next) => {
    const current = (next as any)?.post?.status
    if (current) statusValue.value = current
  },
  { immediate: true }
)
</script>

<template>
  <div class="card">
    <div class="card-body">
      <div class="flex flex-wrap items-center gap-4 lg:flex-nowrap">
        <div class="flex min-w-0 items-center gap-3">
          <h1 class="text-lg font-semibold whitespace-nowrap">{{ modelLabel }}</h1>
          <span
            v-if="recordLabel"
            class="text-sm uppercase tracking-[0.35em] text-muted"
          >
            #{{ recordLabel }}
          </span>
          <button
            v-if="showBack !== false"
            class="btn btn-outline btn-sm"
            @click="emit('back')"
          >
            Back
          </button>
        </div>

        <span class="hidden lg:block h-6 w-px bg-border"></span>

        <div class="flex items-center gap-3 ml-auto">
          <span class="hidden lg:block h-6 w-px bg-border"></span>

          <div v-if="showInstances !== false" class="flex items-center gap-2">
            <span class="text-xs uppercase tracking-[0.3em] text-muted">Instances</span>
            <div class="flex items-center gap-2">
              <span v-if="instances.length === 0" class="badge badge-outline">—</span>
              <template v-else>
                <img
                  v-for="instance in instances"
                  :key="instance"
                  :src="`/locales/${String(instance).toLowerCase()}.png`"
                  :alt="String(instance)"
                  class="h-6 w-6 rounded-full border border-[var(--color-border)] object-cover"
                />
              </template>
            </div>
          </div>

          <span v-if="showStatus !== false" class="hidden lg:block h-6 w-px bg-border"></span>

          <div v-if="showStatus !== false" class="flex items-center gap-3">
            <div class="min-w-[140px]">
              <UiListbox
                v-model="statusValue"
                :options="statusOptions"
                value-key="value"
                label-key="label"
              />
            </div>
            <button
              class="btn btn-primary btn-sm"
              :disabled="updatingStatus"
              @click="async () => {
                updatingStatus = true
                try {
                  await emit('update-status', statusValue)
                } finally {
                  updatingStatus = false
                }
              }"
            >
              {{ updatingStatus ? 'Updating…' : 'Update' }}
            </button>
          </div>

          <span class="hidden lg:block h-6 w-px bg-border"></span>

          <button
            v-if="showRefresh !== false"
            class="btn btn-ghost btn-sm"
            @click="emit('refresh')"
            title="Refresh"
          >
            <Icon name="refresh" />
          </button>
          <button
            v-if="showDelete !== false"
            class="btn btn-ghost btn-sm text-error"
            @click="emit('delete')"
            title="Delete"
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
