<script setup lang="ts">
type PageFrameCanvasItem = {
  id: string
  width: number
  data?: any
}

type DropPosition = 'before' | 'after'

const props = withDefaults(
  defineProps<{
    frames: PageFrameCanvasItem[]
    minWidth?: number
    maxWidth?: number
    draggable?: boolean
    resizable?: boolean
  }>(),
  {
    minWidth: 20,
    maxWidth: 100,
    draggable: true,
    resizable: true,
  },
)

const emit = defineEmits<{
  (event: 'move-frame', payload: { fromId: string, toId: string, position: DropPosition }): void
  (event: 'resize-frame', payload: { id: string, width: number }): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<DropPosition>('after')
const dragOffset = reactive<Record<string, { x: number, y: number }>>({})

type DragState = {
  active: boolean
  pointerId: number | null
  frameId: string | null
  startX: number
  startY: number
}

type ResizeState = {
  active: boolean
  pointerId: number | null
  frameId: string | null
  startX: number
  startWidth: number
}

const dragState = reactive<DragState>({
  active: false,
  pointerId: null,
  frameId: null,
  startX: 0,
  startY: 0,
})

const resizeState = reactive<ResizeState>({
  active: false,
  pointerId: null,
  frameId: null,
  startX: 0,
  startWidth: 0,
})

const clampWidth = (value: unknown) => clampPercentWidth(value, props.minWidth, props.maxWidth)

const frameStyle = (frame: PageFrameCanvasItem) => {
  const width = clampWidth(frame.width)
  const offset = dragOffset[frame.id] || { x: 0, y: 0 }
  return {
    flex: `0 0 ${width}%`,
    maxWidth: `${width}%`,
    transform: `translate(${offset.x}px, ${offset.y}px)`,
  }
}

const frameClass = (frameId: string) => {
  const classes: string[] = []
  if (draggingId.value === frameId) classes.push('is-dragging')
  if (dropTargetId.value === frameId) classes.push(dropPosition.value === 'before' ? 'is-drop-before' : 'is-drop-after')
  return classes.join(' ')
}

const findFrameById = (id: string) => props.frames.find(frame => frame.id === id) ?? null

const resolvePointFromEvent = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY })

const resolveFrameElementAtPoint = (x: number, y: number) => {
  if (!rootRef.value) return null
  const element = document.elementFromPoint(x, y)
  if (!element) return null
  return element.closest<HTMLElement>('[data-page-frame-id]')
}

const resetDrag = () => {
  if (dragState.frameId && dragOffset[dragState.frameId]) {
    delete dragOffset[dragState.frameId]
  }
  dragState.active = false
  dragState.pointerId = null
  dragState.frameId = null
  draggingId.value = null
  dropTargetId.value = null
}

const resetResize = () => {
  resizeState.active = false
  resizeState.pointerId = null
  resizeState.frameId = null
  resizeState.startX = 0
  resizeState.startWidth = 0
}

const onPointerMove = (event: PointerEvent) => {
  if (dragState.active && dragState.pointerId === event.pointerId && dragState.frameId) {
    const { x, y } = resolvePointFromEvent(event)
    const dx = x - dragState.startX
    const dy = y - dragState.startY
    dragOffset[dragState.frameId] = { x: dx, y: dy }

    const hit = resolveFrameElementAtPoint(x, y)
    const targetId = hit?.dataset.pageFrameId || null
    if (!targetId || targetId === dragState.frameId) {
      dropTargetId.value = null
      return
    }

    const rect = hit.getBoundingClientRect()
    const position: DropPosition = x < rect.left + (rect.width / 2) ? 'before' : 'after'
    dropTargetId.value = targetId
    dropPosition.value = position
    return
  }

  if (resizeState.active && resizeState.pointerId === event.pointerId && resizeState.frameId) {
    const container = rootRef.value
    const frame = findFrameById(resizeState.frameId)
    if (!container || !frame) return

    const containerRect = container.getBoundingClientRect()
    if (!containerRect.width) return

    const dx = event.clientX - resizeState.startX
    const deltaPercent = (dx / containerRect.width) * 100
    const nextWidth = clampWidth(resizeState.startWidth + deltaPercent)
    emit('resize-frame', { id: frame.id, width: nextWidth })
  }
}

const onPointerUp = (event: PointerEvent) => {
  if (dragState.active && dragState.pointerId === event.pointerId && dragState.frameId) {
    const fromId = dragState.frameId
    const toId = dropTargetId.value
    const position = dropPosition.value
    resetDrag()
    if (toId && toId !== fromId) {
      emit('move-frame', { fromId, toId, position })
    }
  }

  if (resizeState.active && resizeState.pointerId === event.pointerId) {
    resetResize()
  }
}

const bindGlobalListeners = () => {
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

const unbindGlobalListeners = () => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

const startDrag = (frameId: string, event: PointerEvent) => {
  if (!props.draggable) return
  event.preventDefault()
  dragState.active = true
  dragState.pointerId = event.pointerId
  dragState.frameId = frameId
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  draggingId.value = frameId
  dragOffset[frameId] = { x: 0, y: 0 }
}

const startResize = (frameId: string, event: PointerEvent) => {
  if (!props.resizable) return
  event.preventDefault()
  const frame = findFrameById(frameId)
  if (!frame) return
  resizeState.active = true
  resizeState.pointerId = event.pointerId
  resizeState.frameId = frameId
  resizeState.startX = event.clientX
  resizeState.startWidth = clampWidth(frame.width)
}

onMounted(bindGlobalListeners)
onUnmounted(() => {
  unbindGlobalListeners()
  resetDrag()
  resetResize()
})
</script>

<template>
  <div ref="rootRef" class="page-frame-canvas">
    <article
      v-for="frame in frames"
      :key="frame.id"
      :data-page-frame-id="frame.id"
      class="page-frame-canvas__frame"
      :class="frameClass(frame.id)"
      :style="frameStyle(frame)"
    >
      <div class="page-frame-canvas__chrome">
        <button
          v-if="draggable"
          class="page-frame-canvas__drag-handle"
          type="button"
          aria-label="Drag frame"
          @pointerdown="startDrag(frame.id, $event)"
        >
          <i class="i-lucide-grip-horizontal h-4 w-4" aria-hidden="true" />
        </button>

        <div
          v-if="resizable"
          class="page-frame-canvas__resize-handle"
          aria-hidden="true"
          @pointerdown="startResize(frame.id, $event)"
        >
          <i class="i-lucide-chevrons-left-right h-3.5 w-3.5" />
        </div>
      </div>

      <div class="page-frame-canvas__content">
        <slot name="frame" :frame="frame" :frame-id="frame.id" />
      </div>
    </article>
  </div>
</template>

<style scoped>
.page-frame-canvas {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.55rem;
}

.page-frame-canvas__frame {
  position: relative;
  min-width: 260px;
  transition: box-shadow 150ms ease, border-color 150ms ease;
}

.page-frame-canvas__frame.is-dragging {
  z-index: 8;
  box-shadow: 0 20px 45px color-mix(in srgb, var(--admin-brand) 18%, transparent);
}

.page-frame-canvas__frame.is-drop-before::before,
.page-frame-canvas__frame.is-drop-after::after {
  content: '';
  position: absolute;
  top: 0.4rem;
  bottom: 0.4rem;
  width: 2px;
  background: color-mix(in srgb, var(--admin-brand) 62%, transparent);
  border-radius: 999px;
}

.page-frame-canvas__frame.is-drop-before::before {
  left: -0.3rem;
}

.page-frame-canvas__frame.is-drop-after::after {
  right: -0.3rem;
}

.page-frame-canvas__chrome {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  z-index: 2;
}

.page-frame-canvas__drag-handle {
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  width: 1.55rem;
  height: 1.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
  background: var(--admin-surface);
  cursor: grab;
}

.page-frame-canvas__drag-handle:active {
  cursor: grabbing;
}

.page-frame-canvas__resize-handle {
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  width: 1.55rem;
  height: 1.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
  background: var(--admin-surface);
  cursor: ew-resize;
}

.page-frame-canvas__content {
  min-width: 0;
}
</style>
