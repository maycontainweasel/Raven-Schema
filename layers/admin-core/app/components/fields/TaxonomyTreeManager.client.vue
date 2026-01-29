<script setup lang="ts">
import { ref, watch } from 'vue'
import { BaseTree, OpenIcon } from '@he-tree/vue'
import '@he-tree/vue/style/default.css'

interface TaxonomyNode {
  id: string
  label: string
  children?: TaxonomyNode[]
  $checked?: boolean
}

const props = defineProps<{
  modelValue: TaxonomyNode[]
  selectedIds: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TaxonomyNode[]]
  'update:selectedIds': [value: string[]]
}>()

const treeRef = ref<any>(null)
const treeData = ref<TaxonomyNode[]>([])

const applyChecked = (nodes: TaxonomyNode[], selected: Set<string>) => {
  for (const node of nodes) {
    node.$checked = selected.has(node.id)
    if (node.children?.length) {
      applyChecked(node.children, selected)
    }
  }
}

const syncFromProps = () => {
  treeData.value = props.modelValue ? JSON.parse(JSON.stringify(props.modelValue)) : []
  applyChecked(treeData.value, new Set(props.selectedIds || []))
}

const flattenChecked = () => {
  const raw = treeRef.value?.getChecked?.() || []
  const ids = raw.map((item: any) => item?.data?.id ?? item?.id).filter(Boolean)
  emit('update:selectedIds', ids)
}

watch(
  () => props.modelValue,
  () => syncFromProps(),
  { deep: true, immediate: true }
)

watch(
  () => props.selectedIds,
  () => applyChecked(treeData.value, new Set(props.selectedIds || [])),
  { deep: true }
)

const handleCheck = () => {
  flattenChecked()
  emit('update:modelValue', treeData.value)
}
</script>

<template>
  <div class="space-y-2">
    <BaseTree
      v-model="treeData"
      ref="treeRef"
      children-key="children"
      text-key="label"
      class="he-tree"
      @check:node="handleCheck"
    >
      <template #default="{ node, stat }">
        <div class="flex items-center gap-2 py-1">
          <button
            v-if="stat.children.length"
            type="button"
            class="btn btn-ghost btn-xs"
            @click="stat.open = !stat.open"
          >
            <OpenIcon :open="stat.open" />
          </button>
          <input
            type="checkbox"
            class="h-4 w-4 accent-[var(--color-primary)]"
            v-model="stat.checked"
            :disabled="disabled"
          />
          <span class="text-sm">{{ node.label }}</span>
        </div>
      </template>
    </BaseTree>
  </div>
</template>

<style scoped>
.he-tree :deep(.tree-node) {
  margin-bottom: 6px;
}
</style>
