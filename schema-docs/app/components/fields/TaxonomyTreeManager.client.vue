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
  <div class="taxonomy-tree">
    <BaseTree
      v-model="treeData"
      ref="treeRef"
      children-key="children"
      text-key="label"
      class="he-tree"
      @check:node="handleCheck"
    >
      <template #default="{ node, stat }">
        <div class="taxonomy-node">
          <button
            v-if="stat.children.length"
            type="button"
            class="btn ghost small taxonomy-node-toggle"
            @click="stat.open = !stat.open"
          >
            <OpenIcon :open="stat.open" />
          </button>
          <input
            type="checkbox"
            class="taxonomy-node-checkbox"
            v-model="stat.checked"
            :disabled="disabled"
          />
          <span class="taxonomy-node-label">{{ node.label }}</span>
        </div>
      </template>
    </BaseTree>
  </div>
</template>

<style scoped>
.taxonomy-tree :deep(.tree-node) {
  margin-bottom: 6px;
}

.taxonomy-node {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0;
}

.taxonomy-node-toggle {
  padding: 0.15rem 0.35rem;
  box-shadow: none;
}

.taxonomy-node-checkbox {
  width: 0.95rem;
  height: 0.95rem;
}

.taxonomy-node-label {
  font-size: 0.9rem;
}
</style>
