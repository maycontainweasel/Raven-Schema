<script setup lang="ts">
type PageFrameCanvasItem = {
  id: string
  width: number
  colStart?: number
  colEnd?: number
  data?: any
}

type DropPosition = 'before' | 'after'

const props = withDefaults(
  defineProps<{
    frames: PageFrameCanvasItem[]
    gridCols?: number
    minWidth?: number
    maxWidth?: number
    draggable?: boolean
    resizable?: boolean
    dragHandleSelector?: string
    dragIgnoreSelector?: string
    resizeEdgeSelector?: string
  }>(),
  {
    gridCols: 24,
    minWidth: 20,
    maxWidth: 100,
    draggable: true,
    resizable: true,
    dragHandleSelector: '.page-frame-canvas__drag-handle, .page-frame-canvas__drag-strip, .builder2-frame__head',
    dragIgnoreSelector: '.page-frame-canvas__resize-handle',
    resizeEdgeSelector: '.page-frame-canvas__resize-handle, .page-frame-canvas__resize-edge',
  },
)

const emit = defineEmits<{
  (event: 'move-frame', payload: { fromId: string, toId: string, position: DropPosition }): void
  (event: 'resize-frame', payload: { id: string, width: number }): void
  (event: 'position-frame', payload: { id: string, colStart: number, colEnd: number }): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const draggingId = ref<string | null>(null)
const dropTargetId = ref<string | null>(null)
const dropPosition = ref<DropPosition>('after')
const dragOffset = reactive<Record<string, { x: number, y: number }>>({})
const interactionError = ref('')
type InteractInstanceLike = {
  draggable: (options: Record<string, any>) => unknown
  resizable: (options: Record<string, any>) => unknown
  unset: () => void
}
type InteractModule = (target: Element | string) => InteractInstanceLike
const interactLib = shallowRef<null | InteractModule>(null)
const interactables = new Map<string, InteractInstanceLike>()
const resizeWidth = reactive<Record<string, number>>({})
const isSyncingInteractables = ref(false)
const syncInteractablesQueued = ref(false)

const clampWidth = (value: unknown) => clampPercentWidth(value, props.minWidth, props.maxWidth)
const clampGridCols = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 24
  return Math.max(1, Math.min(96, Math.round(parsed)))
}
const frameSpanFromWidth = (width: number, gridCols: number) =>
  Math.max(1, Math.min(gridCols, Math.round((Math.max(1, width) / 100) * gridCols)))
const normalizeFrameBounds = (colStart: unknown, colEnd: unknown, width: number, gridCols: number) => {
  const span = frameSpanFromWidth(width, gridCols)
  const startParsed = Number(colStart)
  const endParsed = Number(colEnd)
  let start = Number.isFinite(startParsed) ? Math.round(startParsed) : 1
  let end = Number.isFinite(endParsed) ? Math.round(endParsed) : start + span
  if (start < 1) start = 1
  if (start > gridCols) start = gridCols
  if (end <= start) end = start + span
  if (end > gridCols + 1) end = gridCols + 1
  const minEnd = Math.min(gridCols + 1, start + 1)
  if (end < minEnd) end = minEnd
  return { colStart: start, colEnd: end }
}
const resolveFrameBounds = (frame: PageFrameCanvasItem) => {
  const gridCols = clampGridCols(props.gridCols)
  return normalizeFrameBounds(frame.colStart, frame.colEnd, frame.width, gridCols)
}
const canvasStyle = computed(() => {
  const cols = clampGridCols(props.gridCols)
  return {
    '--page-frame-grid-cols': String(cols),
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  } as Record<string, string>
})

const frameStyle = (frame: PageFrameCanvasItem) => {
  const bounds = resolveFrameBounds(frame)
  const offset = dragOffset[frame.id] || { x: 0, y: 0 }
  return {
    gridColumn: `${bounds.colStart} / ${bounds.colEnd}`,
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
const getCanvasFrameElements = (root: HTMLElement) => {
  return Array.from(root.children)
    .filter((entry): entry is HTMLElement => {
      return entry instanceof HTMLElement && Boolean(String(entry.dataset.pageFrameId || '').trim())
    })
}
const resolveFrameElementById = (frameId: string) => {
  const root = rootRef.value
  if (!root) return null
  const frames = getCanvasFrameElements(root)
  return frames.find(entry => String(entry.dataset.pageFrameId || '').trim() === frameId) ?? null
}

const resolveFrameElementAtPoint = (x: number, y: number) => {
  if (!rootRef.value) return null
  const element = document.elementFromPoint(x, y)
  if (!element) return null
  return element.closest<HTMLElement>('[data-page-frame-id]')
}

const resetDragState = (frameId?: string | null) => {
  const targetId = frameId || draggingId.value
  if (targetId && dragOffset[targetId]) {
    delete dragOffset[targetId]
  }
  draggingId.value = null
  dropTargetId.value = null
}

const updateDropTarget = (frameId: string, x: number, y: number) => {
  const hit = resolveFrameElementAtPoint(x, y)
  const targetId = hit?.dataset.pageFrameId || null
  if (!targetId || targetId === frameId) {
    dropTargetId.value = null
    return
  }
  const rect = hit.getBoundingClientRect()
  const position: DropPosition = x < rect.left + (rect.width / 2) ? 'before' : 'after'
  dropTargetId.value = targetId
  dropPosition.value = position
}

const handleDragStart = (frameId: string) => {
  draggingId.value = frameId
  dropTargetId.value = null
  dropPosition.value = 'after'
  dragOffset[frameId] = { x: 0, y: 0 }
}

const handleDragMove = (frameId: string, event: any) => {
  const current = dragOffset[frameId] || { x: 0, y: 0 }
  const dx = Number(event?.dx || 0)
  const dy = Number(event?.dy || 0)
  dragOffset[frameId] = {
    x: current.x + dx,
    y: current.y + dy,
  }

  const pointX = Number(event?.clientX ?? event?.pageX ?? 0)
  const pointY = Number(event?.clientY ?? event?.pageY ?? 0)
  if (Number.isFinite(pointX) && Number.isFinite(pointY)) {
    updateDropTarget(frameId, pointX, pointY)
  }
}

const handleDragEnd = (frameId: string) => {
  const container = rootRef.value
  const frameElement = resolveFrameElementById(frameId)
  const frame = findFrameById(frameId)
  if (container && frameElement) {
    const containerRect = container.getBoundingClientRect()
    const frameRect = frameElement.getBoundingClientRect()
    const gridCols = clampGridCols(props.gridCols)
    if (containerRect.width > 0 && gridCols > 0) {
      const cellWidth = containerRect.width / gridCols
      const start = Math.max(
        1,
        Math.min(
          gridCols,
          Math.round((frameRect.left - containerRect.left) / cellWidth) + 1,
        ),
      )
      const currentBounds = frame
        ? resolveFrameBounds(frame)
        : normalizeFrameBounds(1, 2, 100, gridCols)
      const span = Math.max(1, currentBounds.colEnd - currentBounds.colStart)
      const end = Math.max(start + 1, Math.min(gridCols + 1, start + span))
      emit('position-frame', { id: frameId, colStart: start, colEnd: end })
    }
  }

  const toId = dropTargetId.value
  const position = dropPosition.value
  resetDragState(frameId)
  if (toId && toId !== frameId) {
    emit('move-frame', { fromId: frameId, toId, position })
  }
}

const handleResizeStart = (frameId: string) => {
  const frame = findFrameById(frameId)
  if (!frame) return
  resizeWidth[frameId] = clampWidth(frame.width)
}

const handleResizeMove = (frameId: string, event: any) => {
  const container = rootRef.value
  if (!container) return
  const containerRect = container.getBoundingClientRect()
  if (!containerRect.width) return

  const current = resizeWidth[frameId] ?? clampWidth(findFrameById(frameId)?.width ?? 50)
  const deltaPixels = Number(event?.deltaRect?.width || 0)
  const deltaPercent = (deltaPixels / containerRect.width) * 100
  const nextWidth = clampWidth(current + deltaPercent)
  resizeWidth[frameId] = nextWidth
  emit('resize-frame', { id: frameId, width: nextWidth })
}

const handleResizeEnd = (frameId: string) => {
  if (resizeWidth[frameId] !== undefined) delete resizeWidth[frameId]
}

const bindInteractable = (element: HTMLElement) => {
  const interact = interactLib.value
  if (!interact) return
  const frameId = String(element.dataset.pageFrameId || '').trim()
  if (!frameId) return

  const instance = interact(element) as unknown as InteractInstanceLike

  instance.draggable({
    enabled: props.draggable,
    allowFrom: props.dragHandleSelector,
    ignoreFrom: props.dragIgnoreSelector,
    listeners: {
      start: () => handleDragStart(frameId),
      move: (event: any) => handleDragMove(frameId, event),
      end: () => handleDragEnd(frameId),
    },
  })

  instance.resizable({
    enabled: props.resizable,
    edges: { right: props.resizeEdgeSelector },
    listeners: {
      start: () => handleResizeStart(frameId),
      move: (event: any) => handleResizeMove(frameId, event),
      end: () => handleResizeEnd(frameId),
    },
  })

  interactables.set(frameId, instance)
}

const syncInteractables = async () => {
  if (!interactLib.value) return
  if (isSyncingInteractables.value) {
    syncInteractablesQueued.value = true
    return
  }

  isSyncingInteractables.value = true
  await nextTick()
  try {
    const root = rootRef.value
    if (!root) return

    for (const [, instance] of interactables) {
      instance.unset()
    }
    interactables.clear()

    const frameElements = getCanvasFrameElements(root)
    let failed = 0
    for (const element of frameElements) {
      try {
        bindInteractable(element)
      }
      catch (error) {
        failed += 1
        console.error('[PageFrameCanvas] Failed binding interaction for frame', element.dataset.pageFrameId, error)
      }
    }
    if (failed > 0) {
      interactionError.value = `Some interactions could not be initialized (${failed}).`
    }
    else if (interactionError.value.startsWith('Some interactions could not be initialized')) {
      interactionError.value = ''
    }
  }
  finally {
    isSyncingInteractables.value = false
    if (syncInteractablesQueued.value) {
      syncInteractablesQueued.value = false
      void syncInteractables()
    }
  }
}

watch(
  () => props.frames.map(frame => `${frame.id}:${frame.width}`).join('|'),
  () => {
    void syncInteractables().catch((error) => {
      interactionError.value = error instanceof Error ? error.message : 'Failed to sync canvas interactions.'
      console.error('[PageFrameCanvas] syncInteractables failed', error)
    })
  },
  { immediate: true, flush: 'post' },
)

watch(
  () => [props.draggable, props.resizable, props.dragHandleSelector, props.dragIgnoreSelector, props.resizeEdgeSelector],
  () => {
    void syncInteractables().catch((error) => {
      interactionError.value = error instanceof Error ? error.message : 'Failed to sync canvas interactions.'
      console.error('[PageFrameCanvas] syncInteractables failed', error)
    })
  },
  { deep: true, flush: 'post' },
)

onMounted(async () => {
  try {
    const mod = await import('interactjs')
    interactLib.value = ((mod as any).default || mod) as InteractModule
    interactionError.value = ''
  }
  catch (error) {
    interactionError.value = error instanceof Error ? error.message : 'Failed to load interactjs.'
    console.error('[PageFrameCanvas] Failed to load interactjs', error)
    return
  }

  await syncInteractables().catch((error) => {
    interactionError.value = error instanceof Error ? error.message : 'Failed to initialize canvas interactions.'
    console.error('[PageFrameCanvas] Failed to initialize interactions', error)
  })
})

onUnmounted(() => {
  for (const [, instance] of interactables) {
    instance.unset()
  }
  interactables.clear()
  for (const key of Object.keys(dragOffset)) delete dragOffset[key]
  for (const key of Object.keys(resizeWidth)) delete resizeWidth[key]
  draggingId.value = null
  dropTargetId.value = null
})
</script>

<template>
  <div ref="rootRef" class="page-frame-canvas" :style="canvasStyle">
    <p v-if="interactionError" class="page-frame-canvas__error">
      Canvas interaction unavailable: {{ interactionError }}
    </p>
    <article
      v-for="frame in frames"
      :key="frame.id"
      :data-page-frame-id="frame.id"
      class="page-frame-canvas__frame"
      :class="frameClass(frame.id)"
      :style="frameStyle(frame)"
    >
      <div class="page-frame-canvas__chrome">
        <div
          v-if="draggable"
          class="page-frame-canvas__drag-strip"
          aria-hidden="true"
        />
        <button
          v-if="draggable"
          class="page-frame-canvas__drag-handle"
          type="button"
          aria-label="Drag frame"
        >
          <i class="i-lucide-grip-horizontal h-4 w-4" aria-hidden="true" />
        </button>

        <div
          v-if="resizable"
          class="page-frame-canvas__resize-handle"
          aria-hidden="true"
        >
          <i class="i-lucide-chevrons-left-right h-3.5 w-3.5" />
        </div>

        <div
          v-if="resizable"
          class="page-frame-canvas__resize-edge"
          aria-hidden="true"
        />
      </div>

      <div class="page-frame-canvas__content">
        <slot name="frame" :frame="frame" :frame-id="frame.id" />
      </div>
    </article>
  </div>
</template>

<style scoped>
.page-frame-canvas {
  position: relative;
  display: grid;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.25rem;
  border-radius: var(--admin-radius-sm);
  overflow: hidden;
}

.page-frame-canvas::before {
  content: '';
  position: absolute;
  inset: 0.25rem;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to right,
    color-mix(in srgb, var(--admin-border) 55%, transparent) 0,
    color-mix(in srgb, var(--admin-border) 55%, transparent) 1px,
    transparent 1px,
    transparent calc(100% / var(--page-frame-grid-cols, 24))
  );
  border-radius: inherit;
  opacity: 0.6;
  z-index: 0;
}

.page-frame-canvas__error {
  width: 100%;
  margin: 0;
  padding: 0.42rem 0.55rem;
  border: 1px solid color-mix(in srgb, #ef4444 32%, var(--admin-border) 68%);
  border-radius: var(--admin-radius-sm);
  background: color-mix(in srgb, #ef4444 10%, var(--admin-surface) 90%);
  color: color-mix(in srgb, #ef4444 70%, var(--admin-text) 30%);
  font-size: var(--fs--1, 0.82rem);
}

.page-frame-canvas__frame {
  position: relative;
  min-width: 0;
  z-index: 1;
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
  left: 0.3rem;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
  z-index: 2;
}

.page-frame-canvas__drag-strip {
  position: absolute;
  top: -0.3rem;
  left: -0.3rem;
  right: 2.8rem;
  height: 2rem;
  cursor: grab;
  border-radius: var(--admin-radius-sm);
  touch-action: none;
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
  touch-action: none;
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
  touch-action: none;
}

.page-frame-canvas__resize-edge {
  position: absolute;
  top: -0.3rem;
  right: -0.3rem;
  bottom: -0.3rem;
  width: 0.65rem;
  cursor: ew-resize;
  touch-action: none;
}

.page-frame-canvas__content {
  min-width: 0;
}
</style>
