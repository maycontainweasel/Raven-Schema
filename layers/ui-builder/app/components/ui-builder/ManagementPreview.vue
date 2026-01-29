<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCRUD } from '@schema'
import PrimaryContainer, { type PrimaryRow } from '~/components/management/PrimaryContainer.vue'

const props = defineProps<{
  spec: Record<string, any>
  modelKey: string
}>()

const uiSpec = computed(() => props.spec ?? {})
const modelKey = computed(() => props.modelKey ?? '')

const toSlug = (value: string) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const buildPageMap = () => {
  const map = new Map<string, any>()
  const rawPages = (uiSpec.value as any)?.single?.pages ?? []
  if (!Array.isArray(rawPages)) return map
  rawPages.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return
    const keys = Object.keys(entry)
    if (!keys.length) return
    const label = keys[0]
    const payload = (entry as any)[label]
    const slug = payload?.slug ?? toSlug(label)
    map.set(slug, payload?.content ?? payload?.primary ?? payload)
  })
  return map
}

const tabs = computed(() => {
  const rawTabs = (uiSpec.value as any)?.single?.tabs ?? []
  const pageMap = buildPageMap()
  return (rawTabs as any[]).map((tab: any, index: number) => {
    if (typeof tab === 'string') {
      const slug = toSlug(tab)
      return { label: tab, slug, content: pageMap.get(slug) ?? [] }
    }
    if (tab && typeof tab === 'object' && !Array.isArray(tab)) {
      const keys = Object.keys(tab)
      if (!('label' in tab) && !('slug' in tab) && keys.length === 1) {
        const label = keys[0]
        const payload = (tab as any)[label]
        const slug = payload?.slug ?? toSlug(label)
        const content = payload?.content ?? payload?.primary ?? pageMap.get(slug) ?? []
        return { label, slug, content }
      }
      const label = tab.label ?? tab.name ?? tab.slug ?? `Tab ${index + 1}`
      const slug = tab.slug ?? tab.key ?? toSlug(label)
      const content = tab.content ?? tab.primary ?? pageMap.get(slug) ?? []
      return { label: String(label), slug: String(slug), content }
    }
    return { label: `Tab ${index + 1}`, slug: `tab-${index + 1}`, content: [] }
  })
})

const activeTab = ref('')

watch(
  () => tabs.value,
  (next) => {
    if (!next.length) return
    if (!activeTab.value || !next.find((tab) => tab.slug === activeTab.value)) {
      activeTab.value = next[0].slug
    }
  },
  { immediate: true }
)

const activePage = computed(() => tabs.value.find((tab) => tab.slug === activeTab.value))

const recordId = ref('')
const record = ref<any>(null)
const loading = ref(false)
const error = ref('')

const { $api, $notify } = useNuxtApp()
const { $process, resolveRecordSubId } = useCRUD()

const resolvedId = computed(() => resolveRecordSubId(record.value) ?? recordId.value)

const resourceKey = computed(() => uiSpec.value?.single?.store?.resourceKey ?? 'Admin')

const loadRecord = async () => {
  if (!modelKey.value || !recordId.value) {
    record.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    const apiModel = modelKey.value ? ($api as any)[modelKey.value] : null
    const resource = apiModel?.resource?.query
      ? (payload: any) => apiModel.resource.query(payload)
      : null
    if (!resource) {
      error.value = `Resource endpoint missing for ${modelKey.value}`
      return
    }
    const result = await resource({ data: { id: recordId.value, key: resourceKey.value } })
    record.value = Array.isArray(result) ? result[0] ?? null : result ?? null
  } catch (err) {
    console.error('[ui-builder] Failed to load record', err)
    error.value = 'Failed to load record'
    $notify?.error?.('Failed to load record')
  } finally {
    loading.value = false
  }
}

const setByPath = (target: Record<string, any>, path: string, value: any) => {
  if (!path) return
  const parts = path.split('.').filter(Boolean)
  if (!parts.length) return
  let cursor = target
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value
      return
    }
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}
    cursor = cursor[part]
  })
}

const getByPath = (target: Record<string, any> | undefined, path: string) => {
  if (!target || !path) return undefined
  const parts = path.split('.').filter(Boolean)
  let cursor: any = target
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = cursor[part]
  }
  return cursor
}

const resolveFieldKey = (field: { key?: string; field: string }) => field.key ?? field.field

const buildPayload = (
  values: Record<string, any>,
  fields: Array<{ field: string; key?: string; path?: string }>
) => {
  const payload: Record<string, any> = {}
  fields.forEach((field) => {
    const key = resolveFieldKey(field)
    const value = values[key]
    const path = field.path ?? field.field
    if (path && path.includes('.')) {
      setByPath(payload, path, value)
    } else {
      payload[path] = value
    }
  })
  return payload
}

const mapPayload = (mapping: Record<string, string>, basePayload: Record<string, any>, values: Record<string, any>) => {
  const resolved: Record<string, any> = {}
  Object.entries(mapping).forEach(([key, token]) => {
    if (token === '$id') {
      resolved[key] = resolvedId.value
      return
    }
    if (token === '$recordId' || token === '$rid') {
      resolved[key] = record.value?.id ?? resolvedId.value
      return
    }
    if (token === '$payload') {
      resolved[key] = basePayload
      return
    }
    if (token === '$values') {
      resolved[key] = values
      return
    }
    if (token.startsWith('$field:')) {
      const path = token.slice('$field:'.length)
      resolved[key] = getByPath(basePayload, path) ?? values[path]
      return
    }
    resolved[key] = token
  })
  return resolved
}

const resolveEndpoint = (targetKey: string, targets?: Record<string, any>) => {
  const target = targets?.[targetKey]
  if (target?.endpoint) return target.endpoint
  const model = target?.model ?? modelKey.value
  return `${model}.update`
}

const updateGrouped = async (payload: { values: Record<string, any>; fields?: any[] }) => {
  if (!resolvedId.value) return null
  const targets = uiSpec.value?.single?.targets ?? {}
  try {
    const fields = payload.fields ?? []
    const groups: Record<string, { values: Record<string, any>; fields: any[] }> = {}

    if (fields.length) {
      fields.forEach((field: any) => {
        const key = resolveFieldKey(field)
        const targetKey = field.target ?? field.model ?? 'base'
        if (!groups[targetKey]) groups[targetKey] = { values: {}, fields: [] }
        groups[targetKey].values[key] = payload.values[key]
        groups[targetKey].fields.push(field)
      })
    } else {
      groups.base = { values: payload.values, fields: [] }
    }

    let updatedRecord: any = null

    for (const [targetKey, group] of Object.entries(groups)) {
      const targetConfig = targets?.[targetKey]
      const endpoint = resolveEndpoint(targetKey, targets)
      const builtPayload = group.fields.length
        ? buildPayload(group.values, group.fields)
        : group.values
      const requestPayload = targetConfig?.payloadMap
        ? mapPayload(targetConfig.payloadMap, builtPayload, group.values)
        : { id: resolvedId.value, payload: builtPayload }

      const result = await $process(endpoint, requestPayload as any)

      if (result && targetKey === 'base') {
        updatedRecord = result
        record.value = result
      } else if (result && record.value) {
        const next = { ...(record.value as any) }
        Object.entries(builtPayload).forEach(([key, value]) => {
          if (key.includes('.')) {
            setByPath(next, key, value)
          } else {
            next[key] = value
          }
        })
        record.value = next as any
      }
    }

    if (updatedRecord) {
      $notify?.success?.('Record updated')
    }

    return updatedRecord
  } catch (err) {
    console.error('[ui-builder] Failed to update record', err)
    $notify?.error?.('Failed to update record')
    return null
  }
}

const handleSave = async (payload: { id?: string; values: Record<string, any>; fields: any[] }) => {
  await updateGrouped(payload)
}
</script>

<template>
  <div class="space-y-6">
    <div class="card">
      <div class="card-body flex flex-wrap items-end gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-muted">Management Preview</p>
          <h2 class="text-lg font-semibold">{{ modelKey }}</h2>
        </div>
        <div class="ml-auto flex flex-wrap items-end gap-2">
          <label class="text-sm">
            Record ID
            <input v-model="recordId" class="input input-bordered" placeholder="Enter record id" />
          </label>
          <button class="btn btn-sm btn-outline" :disabled="loading" @click="loadRecord">
            Load
          </button>
        </div>
        <p v-if="error" class="text-xs text-error w-full">{{ error }}</p>
      </div>
    </div>

    <div class="grid gap-6" :class="tabs.length > 1 ? 'tm:grid-cols-[240px_minmax(0,1fr)]' : 'tm:grid-cols-1'">
      <aside v-if="tabs.length > 1" class="card">
        <div class="card-body space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Pages</h3>
          <nav class="space-y-2">
            <button
              v-for="tab in tabs"
              :key="tab.slug"
              class="btn btn-sm w-full justify-start"
              :class="tab.slug === activeTab ? 'btn-primary' : 'btn-outline'"
              @click="activeTab = tab.slug"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </aside>

      <section class="space-y-6">
        <PrimaryContainer
          v-if="activePage"
          :model="modelKey"
          :primary="activePage.content as PrimaryRow[]"
          :record="record"
          @save="handleSave"
        />
        <div v-else class="card">
          <div class="card-body">
            <p class="text-sm text-muted">Nothing to render yet. Add content blocks to this tab.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
