<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { ScaleKitInstance } from '../utils/scale-kit'

const props = defineProps<{ kit: ScaleKitInstance }>()
const dragStorageKey = 'scale-kit-overlay-position'

const open = computed({
  get: () => props.kit.overlayOpen,
  set: (value) => {
    props.kit.overlayOpen = value
  },
})

const tokens = computed(() => props.kit.tokens)

const base = computed(() => tokens.value.base)

const breakpointRows = computed(() => {
  const rows = Object.keys(tokens.value.breakpoints)
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((key) => ({ key, ...tokens.value.breakpoints[key] }))
  return rows
})

const addBreakpoint = () => {
  const width = Number(prompt('Breakpoint max width? (px)', '1024'))
  if (!Number.isFinite(width)) return
  tokens.value.breakpoints[width] = {
    fontSize: base.value.fontSize,
    ratio: base.value.ratio,
    gridRatio: base.value.gridRatio,
    spaceMode: base.value.spaceMode,
    spaceBase: base.value.spaceBase,
    spaceRatio: base.value.spaceRatio,
  }
}

const removeBreakpoint = (key: number) => {
  delete tokens.value.breakpoints[key]
}

const save = () => props.kit.save()
const reset = () => props.kit.reset()

const showGrid = ref(false)

const panelPosition = reactive({ x: 0, y: 0 })
const dragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
})

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const setInitialPosition = () => {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(dragStorageKey)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { x: number; y: number }
      panelPosition.x = parsed.x
      panelPosition.y = parsed.y
      return
    }
    catch {
      window.localStorage.removeItem(dragStorageKey)
    }
  }
  panelPosition.x = Math.max(16, window.innerWidth - 360)
  panelPosition.y = 96
}

const startDrag = (event: PointerEvent) => {
  if (event.button !== 0) return
  dragState.active = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.originX = panelPosition.x
  dragState.originY = panelPosition.y
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture?.(event.pointerId)
}

const stopDrag = () => {
  if (!dragState.active) return
  dragState.active = false
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      dragStorageKey,
      JSON.stringify({ x: panelPosition.x, y: panelPosition.y })
    )
  }
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragState.active || typeof window === 'undefined') return
  const deltaX = event.clientX - dragState.startX
  const deltaY = event.clientY - dragState.startY
  const maxX = window.innerWidth - 260
  const maxY = window.innerHeight - 120
  panelPosition.x = clamp(dragState.originX + deltaX, 8, maxX)
  panelPosition.y = clamp(dragState.originY + deltaY, 8, maxY)
}

onMounted(() => {
  setInitialPosition()
  if (typeof window === 'undefined') return
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="showGrid" class="scale-kit-grid" />
  </Teleport>

  <div
    v-if="open"
    class="scale-kit"
    :style="{ transform: `translate(${panelPosition.x}px, ${panelPosition.y}px)` }"
  >
    <div class="scale-kit__header" @pointerdown.prevent="startDrag">
      <div>
        <div class="scale-kit__title">Scale Kit</div>
        <div class="scale-kit__sub">Ctrl + Shift + K</div>
        <div class="sk-scope">
          <label class="sk-scope__label">Scope</label>
          <select class="sk-scope__select" disabled>
            <option>Global</option>
          </select>
        </div>
      </div>
      <div class="scale-kit__actions">
        <button class="sk-pill" type="button" @click="showGrid = !showGrid">
          {{ showGrid ? 'Grid on' : 'Grid off' }}
        </button>
        <button class="sk-pill" type="button" @click="save">Save</button>
        <button class="sk-pill" type="button" @click="reset">Reset</button>
        <button class="sk-pill" type="button" @click="open = false">Close</button>
      </div>
    </div>

    <div class="scale-kit__body">
      <section class="sk-section">
        <div class="sk-section__title">Type scale</div>
        <label>
          <div class="sk-label">
            <span>Base font size</span>
            <span class="sk-value">{{ base.fontSize.toFixed(1) }}px</span>
          </div>
          <input v-model.number="base.fontSize" type="range" min="12" max="22" step="0.5" @input="kit.apply" />
        </label>
        <label>
          <div class="sk-label">
            <span>Ratio</span>
            <span class="sk-value">{{ base.ratio.toFixed(2) }}</span>
          </div>
          <input v-model.number="base.ratio" type="range" min="1.05" max="1.6" step="0.01" @input="kit.apply" />
        </label>
        <label>
          <div class="sk-label">
            <span>Grid ratio</span>
            <span class="sk-value">{{ base.gridRatio.toFixed(2) }}</span>
          </div>
          <input v-model.number="base.gridRatio" type="range" min="1.1" max="2" step="0.01" @input="kit.apply" />
        </label>
      </section>

      <section class="sk-section">
        <div class="sk-section__title">Spacing</div>
        <div class="sk-row">
          <label>Sync to rhythm</label>
          <button
            class="sk-pill"
            :class="{ active: base.spaceSync !== false }"
            type="button"
            @click="base.spaceSync = base.spaceSync === false ? true : false; kit.apply()"
          >
            {{ base.spaceSync === false ? 'Off' : 'On' }}
          </button>
        </div>
        <div class="sk-row">
          <label>Mode</label>
          <div class="sk-toggle">
            <button
              class="sk-pill"
              :class="{ active: base.spaceMode === 'grid' }"
              type="button"
              @click="base.spaceMode = 'grid'; kit.apply()"
            >Grid</button>
            <button
              class="sk-pill"
              :class="{ active: base.spaceMode === 'ratio' }"
              type="button"
              @click="base.spaceMode = 'ratio'; kit.apply()"
            >Ratio</button>
          </div>
        </div>
        <label>
          <div class="sk-label">
            <span>Base unit</span>
            <span class="sk-value">{{ base.spaceBase.toFixed(2) }}rem</span>
          </div>
          <input v-model.number="base.spaceBase" type="range" min="0.25" max="2" step="0.05" :disabled="base.spaceSync !== false" @input="kit.apply" />
        </label>
        <label :class="{ disabled: base.spaceMode === 'grid' || base.spaceSync !== false }">
          <div class="sk-label">
            <span>Space ratio</span>
            <span class="sk-value">{{ base.spaceRatio.toFixed(2) }}</span>
          </div>
          <input v-model.number="base.spaceRatio" type="range" min="1.05" max="1.8" step="0.01" :disabled="base.spaceMode === 'grid' || base.spaceSync !== false" @input="kit.apply" />
        </label>
      </section>

      <section class="sk-section">
        <div class="sk-section__title">Breakpoints (max-width)</div>
        <div class="sk-muted">
          Breakpoint editing is paused while we finalize global behavior.
        </div>
      </section>
      <div class="sk-note">
        Tip: These sliders only affect elements using <code>fs-*</code>, <code>gp-*</code>, <code>sp-*</code>, <code>g-*</code> classes.
      </div>
    </div>
  </div>
</template>

<style scoped>
.scale-kit {
  position: fixed;
  top: 0;
  left: 0;
  width: 320px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 18px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(12px);
  z-index: 9999;
  font-family: var(--font-sans, system-ui, sans-serif);
  will-change: transform;
}

.scale-kit__header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(203, 213, 225, 0.6);
  display: flex;
  justify-content: space-between;
  gap: 12px;
  cursor: move;
}

.scale-kit__title {
  font-weight: 600;
  font-size: 0.95rem;
}

.scale-kit__sub {
  font-size: 0.7rem;
  color: #667085;
}

.sk-scope {
  margin-top: 8px;
  display: grid;
  gap: 4px;
}

.sk-scope__label {
  font-size: 0.65rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sk-scope__select {
  appearance: none;
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 999px;
  background: #f8fafc;
  padding: 4px 10px;
  font-size: 0.7rem;
  color: #0f172a;
}

.scale-kit__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.scale-kit__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 65vh;
  overflow: auto;
}

.sk-section {
  display: grid;
  gap: 8px;
  font-size: 0.75rem;
  color: #667085;
}

.sk-section__title {
  font-weight: 600;
  font-size: 0.8rem;
  color: #0f172a;
}

.sk-section label {
  display: grid;
  gap: 4px;
}

.sk-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sk-value {
  font-size: 0.7rem;
  color: #334155;
  font-weight: 600;
}

.sk-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sk-toggle {
  display: flex;
  gap: 6px;
}

.sk-pill {
  border-radius: 999px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  background: #f8fafc;
  font-size: 0.7rem;
  padding: 4px 8px;
  cursor: pointer;
}

.sk-pill.active {
  background: rgba(40, 88, 255, 0.12);
  border-color: rgba(40, 88, 255, 0.4);
  color: #2047d6;
}

.sk-breakpoints {
  display: grid;
  gap: 10px;
}

.sk-breakpoint {
  border: 1px solid rgba(203, 213, 225, 0.6);
  border-radius: 12px;
  padding: 10px;
  background: #fff;
}

.bp-title {
  font-weight: 600;
  margin-bottom: 6px;
  color: #0f172a;
}

.bp-grid {
  display: grid;
  gap: 6px;
}

.bp-actions {
  display: flex;
  justify-content: flex-end;
}

.disabled {
  opacity: 0.5;
}

.sk-note {
  font-size: 0.7rem;
  color: #667085;
  border-top: 1px dashed rgba(148, 163, 184, 0.5);
  padding-top: 10px;
}

.sk-muted {
  font-size: 0.7rem;
  color: #94a3b8;
}

.scale-kit-grid {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(99, 102, 241, 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(99, 102, 241, 0.18) 1px, transparent 1px);
  background-size: var(--v-1) var(--v-1);
  mix-blend-mode: multiply;
}
</style>
