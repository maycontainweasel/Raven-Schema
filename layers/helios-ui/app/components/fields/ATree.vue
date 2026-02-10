<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { BaseTree, Draggable } from '@he-tree/vue'
import { Checkbox } from '@ark-ui/vue/checkbox'
import '@he-tree/vue/style/default.css'

export type ATreeNode = {
  id: string
  label: string
  children?: ATreeNode[]
  [key: string]: unknown
}

type TreeCheckedState = boolean | 'indeterminate'

const props = withDefaults(
  defineProps<{
    modelValue: ATreeNode[]
    checkedIds?: string[]
    draggable?: boolean
    checkable?: boolean
    treeLine?: boolean
    defaultOpen?: boolean
    indent?: number
    disableDrag?: boolean
    disableDrop?: boolean
    childrenKey?: string
    labelKey?: string
    idKey?: string
    maxLevel?: number
    keepPlaceholder?: boolean
    dragOpen?: boolean
  }>(),
  {
    checkedIds: () => [],
    draggable: true,
    checkable: true,
    treeLine: true,
    defaultOpen: true,
    indent: 24,
    disableDrag: false,
    disableDrop: false,
    childrenKey: 'children',
    labelKey: 'label',
    idKey: 'id',
    maxLevel: undefined,
    keepPlaceholder: false,
    dragOpen: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: ATreeNode[]): void
  (event: 'update:checkedIds', value: string[]): void
  (event: 'change', value: ATreeNode[]): void
  (event: 'node-click', payload: { node: ATreeNode; stat: any }): void
  (event: 'node-toggle', payload: { node: ATreeNode; open: boolean }): void
}>()

const isWindowLike = (value: unknown) => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return candidate.window === value && typeof candidate.document === 'object'
}

const safeClone = <T,>(value: T): T => {
  const seen = new WeakMap<object, any>()
  const clone = (input: any): any => {
    if (input === null || typeof input !== 'object') return input
    if (typeof input === 'function') return undefined
    if (isWindowLike(input)) return undefined
    if (seen.has(input)) return seen.get(input)

    if (Array.isArray(input)) {
      const out: any[] = []
      seen.set(input, out)
      for (const entry of input) {
        out.push(clone(entry))
      }
      return out
    }

    const out: Record<string, unknown> = {}
    seen.set(input, out)
    for (const [key, entry] of Object.entries(input)) {
      const next = clone(entry)
      if (next !== undefined) out[key] = next
    }
    return out
  }

  return clone(value) as T
}

const cloneValue = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    }
    catch {
      return safeClone(value)
    }
  }
  return safeClone(value)
}

const treeRef = ref<any>(null)
const treeData = ref<ATreeNode[]>(cloneValue(props.modelValue || []))

const treeComponent = computed(() => (props.draggable ? Draggable : BaseTree))

const toNodeId = (node: Record<string, unknown> | null | undefined) => {
  if (!node) return ''
  const raw = node[props.idKey]
  return String(raw ?? '')
}

const toNodeLabel = (node: Record<string, unknown> | null | undefined) => {
  if (!node) return 'Untitled'
  const raw = node[props.labelKey]
  if (typeof raw === 'string' && raw.trim().length) return raw
  if (typeof node.text === 'string' && node.text.trim().length) return node.text
  return 'Untitled'
}

const walkNodes = (nodes: ATreeNode[], callback: (node: ATreeNode) => void) => {
  for (const node of nodes) {
    callback(node)
    const children = Array.isArray(node[props.childrenKey]) ? node[props.childrenKey] as ATreeNode[] : []
    if (children.length) walkNodes(children, callback)
  }
}

const findNodeById = (
  nodes: ATreeNode[],
  id: string,
): { node: ATreeNode; parent: ATreeNode | null; index: number } | null => {
  const queue: Array<{ node: ATreeNode; parent: ATreeNode | null; index: number }> = []
  nodes.forEach((node, index) => queue.push({ node, parent: null, index }))

  while (queue.length) {
    const current = queue.shift()
    if (!current) continue
    if (toNodeId(current.node) === id) return current
    const children = Array.isArray(current.node[props.childrenKey]) ? current.node[props.childrenKey] as ATreeNode[] : []
    children.forEach((child, index) => queue.push({ node: child, parent: current.node, index }))
  }

  return null
}

const getCheckedIds = () => {
  const checked = treeRef.value?.getChecked?.(false) ?? []
  return checked
    .map((entry: any) => toNodeId(entry?.data))
    .filter((id: string) => id.length > 0)
}

const getCheckedNodes = () => {
  const checked = treeRef.value?.getChecked?.(false) ?? []
  return checked
    .map((entry: any) => entry?.data)
    .filter((entry: unknown): entry is ATreeNode => Boolean(entry))
}

const emitCheckedIds = () => {
  if (!props.checkable) return
  emit('update:checkedIds', getCheckedIds())
}

const syncCheckedFromProps = async () => {
  if (!props.checkable) return
  await nextTick()
  const ids = new Set((props.checkedIds || []).map((entry) => String(entry)))
  const tree = treeRef.value
  if (!tree?.getStat || !tree?.updateCheck) return

  walkNodes(treeData.value, (node) => {
    const stat = tree.getStat(node)
    if (!stat) return
    stat.checked = ids.has(toNodeId(node))
  })
  tree.updateCheck()
  emitCheckedIds()
}

const onUpdateModelValue = (next: ATreeNode[]) => {
  treeData.value = next
  emit('update:modelValue', next)
  emit('change', next)
  nextTick(() => {
    emitCheckedIds()
  })
}

const checkedStateFromStat = (value: boolean | 0): TreeCheckedState => {
  if (value === 0) return 'indeterminate'
  return Boolean(value)
}

const onCheckedStateChange = (stat: any, value: TreeCheckedState) => {
  stat.checked = value === 'indeterminate' ? true : Boolean(value)
  treeRef.value?.updateCheck?.()
  emitCheckedIds()
}

const toggleNode = (stat: any) => {
  stat.open = !stat.open
  emit('node-toggle', {
    node: stat.data as ATreeNode,
    open: Boolean(stat.open),
  })
}

const onCheckNode = () => {
  emitCheckedIds()
}

const onNodeClick = (node: ATreeNode, stat: any) => {
  emit('node-click', { node, stat })
}

const openAll = () => {
  treeRef.value?.openAll?.()
}

const closeAll = () => {
  treeRef.value?.closeAll?.()
}

const setCheckedIds = (ids: string[]) => {
  emit('update:checkedIds', ids)
  nextTick(syncCheckedFromProps)
}

const addNode = (node: ATreeNode, parentId?: string | null) => {
  const next = cloneValue(treeData.value)
  const payload = {
    ...node,
    [props.childrenKey]: Array.isArray(node[props.childrenKey]) ? node[props.childrenKey] : [],
  } as ATreeNode

  if (!parentId) {
    next.push(payload)
    onUpdateModelValue(next)
    return payload
  }

  const found = findNodeById(next, String(parentId))
  if (!found) {
    next.push(payload)
    onUpdateModelValue(next)
    return payload
  }

  if (!Array.isArray(found.node[props.childrenKey])) {
    found.node[props.childrenKey] = []
  }
  ;(found.node[props.childrenKey] as ATreeNode[]).push(payload)
  onUpdateModelValue(next)

  nextTick(() => {
    const stat = treeRef.value?.getStat?.(found.node)
    if (stat) stat.open = true
  })

  return payload
}

const updateNode = (id: string, patch: Partial<ATreeNode>) => {
  const next = cloneValue(treeData.value)
  const found = findNodeById(next, String(id))
  if (!found) return null
  Object.assign(found.node, patch)
  onUpdateModelValue(next)
  return found.node
}

const removeNode = (id: string) => {
  const next = cloneValue(treeData.value)
  const found = findNodeById(next, String(id))
  if (!found) return false

  if (!found.parent) {
    next.splice(found.index, 1)
    onUpdateModelValue(next)
    return true
  }

  const siblings = (found.parent[props.childrenKey] as ATreeNode[]) || []
  siblings.splice(found.index, 1)
  onUpdateModelValue(next)
  return true
}

watch(
  () => props.modelValue,
  (next) => {
    treeData.value = cloneValue(next || [])
    nextTick(syncCheckedFromProps)
  },
  { deep: true },
)

watch(
  () => props.checkedIds,
  () => {
    nextTick(syncCheckedFromProps)
  },
  { deep: true },
)

defineExpose({
  openAll,
  closeAll,
  getCheckedIds,
  getCheckedNodes,
  setCheckedIds,
  addNode,
  updateNode,
  removeNode,
  getTreeInstance: () => treeRef.value,
})
</script>

<template>
  <section class="a-tree">
    <component
      :is="treeComponent"
      ref="treeRef"
      :model-value="treeData"
      :children-key="childrenKey"
      :text-key="labelKey"
      :default-open="defaultOpen"
      :indent="indent"
      :tree-line="treeLine"
      :disable-drag="disableDrag"
      :disable-drop="disableDrop"
      :max-level="maxLevel"
      :keep-placeholder="keepPlaceholder"
      :drag-open="dragOpen"
      update-behavior="new"
      class="a-tree__root"
      @update:model-value="onUpdateModelValue"
      @check:node="onCheckNode"
      @change="emit('change', treeData)"
      @after-drop="emit('change', treeData)"
    >
      <template #default="{ node, stat }">
        <div class="a-tree__node">
          <button
            v-if="stat.children.length"
            class="a-tree__toggle"
            type="button"
            :aria-label="stat.open ? 'Collapse node' : 'Expand node'"
            @click.stop="toggleNode(stat)"
          >
            <i class="i-lucide-chevron-right h-3.5 w-3.5" :class="{ 'a-tree__toggle-icon--open': stat.open }" />
          </button>
          <span v-else class="a-tree__toggle a-tree__toggle--spacer" />

          <Checkbox.Root
            v-if="checkable"
            class="a-tree__checkbox"
            :checked="checkedStateFromStat(stat.checked)"
            @update:checked="onCheckedStateChange(stat, $event as TreeCheckedState)"
          >
            <Checkbox.Control class="a-tree__checkbox-control">
              <Checkbox.Indicator class="a-tree__checkbox-indicator">
                <i v-if="stat.checked === 0" class="i-lucide-minus h-3 w-3" aria-hidden="true" />
                <i v-else class="i-lucide-check h-3 w-3" aria-hidden="true" />
              </Checkbox.Indicator>
            </Checkbox.Control>
          </Checkbox.Root>

          <button class="a-tree__label" type="button" @click.stop="onNodeClick(node, stat)">
            {{ toNodeLabel(node) }}
          </button>
        </div>
      </template>
    </component>
  </section>
</template>

<style scoped>
.a-tree {
  width: 100%;
}

.a-tree__root {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.45rem;
  max-height: min(56vh, 42rem);
  overflow: auto;
}

.a-tree__node {
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--admin-text);
}

.a-tree__toggle {
  border: 0;
  background: transparent;
  color: var(--admin-muted);
  width: 1rem;
  min-width: 1rem;
  height: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.a-tree__toggle--spacer {
  cursor: default;
}

.a-tree__toggle-icon--open {
  transform: rotate(90deg);
}

.a-tree__checkbox {
  display: inline-flex;
  align-items: center;
}

.a-tree__checkbox-control {
  width: 1.28rem;
  height: 1.28rem;
  border: 1px solid var(--admin-border-strong);
  border-radius: 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-text-soft);
  background: var(--admin-surface);
}

.a-tree__checkbox-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-tree__label {
  border: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: var(--fs-0, 0.95rem);
  line-height: 1.35;
  text-align: left;
  padding: 0;
  cursor: pointer;
}

.a-tree__label:hover {
  color: color-mix(in srgb, var(--admin-brand) 76%, var(--admin-text) 24%);
}
</style>
