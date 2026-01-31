<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHeliosScaleStore } from '#layers/helios/app/stores/helios'

const scaleStore = useHeliosScaleStore()
scaleStore.initFromConfig()

const { ranges, activeScope, settings, tokens, commitStatus, isCommitting } = storeToRefs(scaleStore)

const modalOpen = ref(false)
const activePanel = ref<'typography' | 'settings' | 'utilities'>('typography')
const newRange = reactive({ label: 'Mobile', min: 0, max: 767 })
const typeUnit = ref<'rem' | 'px' | 'pt'>('rem')
const showTypeExport = ref(true)
const sampleText = ref('The quick brown fox jumps over the lazy dog')

const ensureRangeSettings = (maxWidth: number) => {
  if (!tokens.value) return
  if (!tokens.value.breakpoints[maxWidth]) {
    tokens.value.breakpoints[maxWidth] = {
      fontSize: tokens.value.base.fontSize,
      ratio: tokens.value.base.ratio,
      gridRatio: tokens.value.base.gridRatio,
      spaceSync: tokens.value.base.spaceSync,
      spaceMode: tokens.value.base.spaceMode,
      spaceBase: tokens.value.base.spaceBase,
      spaceRatio: tokens.value.base.spaceRatio,
    }
  }
}

const activeSettings = computed(() => {
  if (!tokens.value) return null
  if (activeScope.value === 'global') return tokens.value.base
  const range = ranges.value.find((item) => item.id === activeScope.value)
  if (!range) return tokens.value.base
  ensureRangeSettings(range.max)
  return tokens.value.breakpoints[range.max]
})

const scopeOptions = computed(() => {
  return [
    { value: 'global', label: 'Global' },
    ...ranges.value.map((range) => ({
      value: range.id,
      label: `${range.label} (${range.min}-${range.max}px)`
    }))
  ]
})

const formatOptions = [
  { value: 'scss', label: 'SCSS' },
  { value: 'css', label: 'CSS (coming soon)' }
]

const viewItems = computed(() => [
  { label: 'Typography', action: () => (activePanel.value = 'typography') },
  { label: 'Utilities', action: () => (activePanel.value = 'utilities') },
  { label: 'Settings', action: () => (activePanel.value = 'settings') },
  { label: 'Typography Lab', href: '/type' }
])

const typeRows = computed(() => {
  const baseFont = activeSettings.value?.fontSize ?? 16
  const ratio = activeSettings.value?.ratio ?? 1.2
  const toRem = (step: number) => Math.pow(ratio, step)
  const toUnit = (rem: number) => {
    if (typeUnit.value === 'px') return `${(rem * baseFont).toFixed(2)}px`
    if (typeUnit.value === 'pt') return `${(rem * baseFont * 0.75).toFixed(2)}pt`
    return `${rem.toFixed(3)}rem`
  }
  const rows = [
    { tag: 'h1', step: 6, weight: 'font-700', lh: 'var(--lh-1)' },
    { tag: 'h2', step: 5, weight: 'font-600', lh: 'var(--lh-1)' },
    { tag: 'h3', step: 4, weight: 'font-600', lh: 'var(--lh-1)' },
    { tag: 'h4', step: 3, weight: 'font-600', lh: 'var(--lh-0)' },
    { tag: 'h5', step: 2, weight: 'font-600', lh: 'var(--lh-0)' },
    { tag: 'h6', step: 1, weight: 'font-600', lh: 'var(--lh-0)' },
    { tag: 'p', step: 0, weight: 'font-400', lh: 'var(--lh-0)' },
    { tag: 'small', step: -1, weight: 'font-400', lh: 'var(--lh-0)' },
    { tag: 'tiny', step: -2, weight: 'font-400', lh: 'var(--lh-0)' },
  ]
  return rows.map((row) => {
    const rem = toRem(row.step)
    return {
      ...row,
      rem,
      display: toUnit(rem),
      className: row.tag === 'tiny' ? 'text-muted' : row.tag === 'small' ? 'text-muted' : ''
    }
  })
})

const typographyScss = computed(() => [
  'h1 { font-size: var(--fs-6); line-height: var(--lh-1); }',
  'h2 { font-size: var(--fs-5); line-height: var(--lh-1); }',
  'h3 { font-size: var(--fs-4); line-height: var(--lh-1); }',
  'h4 { font-size: var(--fs-3); line-height: var(--lh-0); }',
  'h5 { font-size: var(--fs-2); line-height: var(--lh-0); }',
  'h6 { font-size: var(--fs-1); line-height: var(--lh-0); }',
  'p, li { font-size: var(--fs-0); line-height: var(--lh-0); }',
  '',
  'ul, ol {',
  '  margin: 0;',
  '  padding-left: var(--v-1);',
  '}'
].join('\\n'))

const copyTypographyScss = async () => {
  await navigator.clipboard.writeText(typographyScss.value)
}

const addRange = () => {
  const label = newRange.label.trim() || `Range ${ranges.value.length + 1}`
  const min = Math.max(0, Number(newRange.min))
  const max = Math.max(0, Number(newRange.max))
  if (max <= min) return
  const id = `${label}-${min}-${max}`.replace(/\s+/g, '-').toLowerCase()
  ranges.value.push({ id, label, min, max })
  ensureRangeSettings(max)
  scaleStore.saveDraft()
  scaleStore.apply()
  activeScope.value = id
  modalOpen.value = false
}

const removeRange = (id: string) => {
  const index = ranges.value.findIndex((range) => range.id === id)
  if (index === -1) return
  const [removed] = ranges.value.splice(index, 1)
  if (tokens.value) {
    delete tokens.value.breakpoints[removed.max]
    scaleStore.apply()
  }
  scaleStore.saveDraft()
  if (activeScope.value === id) activeScope.value = 'global'
}
</script>

<template>
  <div class="min-h-screen bg-[#f5f6fb] text-ink type-default">
    <header class="scale-header">
      <div class="scale-header__bar">
        <div class="scale-header__left">
          <div class="scale-header__title">Scale setup</div>
          <div class="scale-header__subtitle">Global type + rhythm controls</div>
        </div>
        <div class="scale-header__controls">
          <div class="control">
            <label>Scope</label>
            <UiListbox v-model="activeScope" :options="scopeOptions" />
          </div>
          <div class="control">
            <label>Base size</label>
            <input
              v-if="activeSettings"
              v-model.number="activeSettings.fontSize"
              type="range"
              min="12"
              max="22"
              step="0.5"
              @input="scaleStore.apply"
            />
            <span>{{ activeSettings?.fontSize?.toFixed(1) }}px</span>
          </div>
          <div class="control">
            <label>Type ratio</label>
            <input
              v-if="activeSettings"
              v-model.number="activeSettings.ratio"
              type="range"
              min="1.05"
              max="1.6"
              step="0.01"
              @input="scaleStore.apply"
            />
            <span>{{ activeSettings?.ratio?.toFixed(2) }}</span>
          </div>
          <div class="control">
            <label>Grid ratio</label>
            <input
              v-if="activeSettings"
              v-model.number="activeSettings.gridRatio"
              type="range"
              min="1.1"
              max="2"
              step="0.01"
              @input="scaleStore.apply"
            />
            <span>{{ activeSettings?.gridRatio?.toFixed(2) }}</span>
          </div>
          <button class="ui-btn-ghost" type="button" @click="modalOpen = true">Add range</button>
          <UiMenu :items="viewItems" label="Views" />
          <button class="ui-btn-primary" type="button" :disabled="isCommitting" @click="scaleStore.commit">
            {{ isCommitting ? 'Committing…' : 'Commit' }}
          </button>
        </div>
      </div>
      <div v-if="commitStatus" class="scale-header__status">
        {{ commitStatus }}
      </div>
    </header>

    <div class="scale-body">
      <aside class="scale-sidebar">
        <div class="scale-sidebar__title">Setup</div>
        <button class="scale-nav" :class="{ active: activePanel === 'typography' }" @click="activePanel = 'typography'">
          Typography
        </button>
        <button class="scale-nav" disabled>Spacing</button>
        <button class="scale-nav" disabled>Components</button>
      </aside>
      <main class="scale-content">
        <section v-if="activePanel === 'typography'" class="flex flex-col g-2">
          <section class="ui-card gp-3 flex flex-col g-1">
            <div class="type-subheader">
              <div class="type-subheader__left">
                <div class="text-xs uppercase tracking-wide text-muted">Typography scale</div>
                <div class="type-unit-toggle">
                  <button class="type-unit" :class="{ active: typeUnit === 'rem' }" @click="typeUnit = 'rem'">REM</button>
                  <button class="type-unit" :class="{ active: typeUnit === 'px' }" @click="typeUnit = 'px'">PX</button>
                  <button class="type-unit" :class="{ active: typeUnit === 'pt' }" @click="typeUnit = 'pt'">PT</button>
                </div>
              </div>
              <div class="type-subheader__right">
                <label class="type-toggle">
                  <input type="checkbox" v-model="showTypeExport" />
                  <span>Show SCSS</span>
                </label>
              </div>
            </div>

            <div class="type-scale" :class="{ 'type-scale--split': showTypeExport }">
              <div class="type-scale__list">
                <div class="type-scale__row" v-for="row in typeRows" :key="row.tag">
                  <div class="type-scale__label">{{ row.tag }}</div>
                  <div class="type-scale__value">{{ row.display }}</div>
                  <div class="type-scale__sample" :class="row.weight">
                    <span :style="{ fontSize: `${row.rem}rem`, lineHeight: row.lh }">{{ sampleText }}</span>
                  </div>
                </div>
              </div>
              <div v-if="showTypeExport" class="type-scale__export">
                <div class="export-header">
                  <div class="text-xs uppercase tracking-wide text-muted">SCSS export</div>
                  <button class="ui-btn-ghost text-xs" type="button" @click="copyTypographyScss">Copy</button>
                </div>
                <pre class="export-code">{{ typographyScss }}</pre>
              </div>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'utilities'" class="flex flex-col g-2">
          <ScaleUtilitiesPanel />
        </section>

        <section v-else class="ui-card gp-3 flex flex-col g-1">
          <div class="text-xs uppercase tracking-wide text-muted">Settings</div>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="settings-field">
              Output format
              <UiListbox v-model="settings.outputFormat" :options="formatOptions" />
            </label>
            <label class="settings-field">
              Output directory
              <input v-model="settings.outputDir" type="text" />
            </label>
            <label class="settings-field">
              Entry file
              <input v-model="settings.outputEntry" type="text" />
            </label>
            <label class="settings-field">
              Tokens JSON
              <input v-model="settings.tokensFile" type="text" />
            </label>
            <label class="settings-field">
              Tokens SCSS
              <input v-model="settings.tokensScssFile" type="text" />
            </label>
            <label class="settings-field">
              Typography SCSS
              <input v-model="settings.typographyFile" type="text" />
            </label>
          </div>
          <p class="text-xs text-muted">
            These settings control where the commit process writes SCSS files. You will manually include them in your app.
          </p>
        </section>
      </main>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="scale-modal__backdrop" @click="modalOpen = false">
        <div class="scale-modal" @click.stop>
          <div class="scale-modal__title">Add range</div>
          <label>
            Label
            <input v-model="newRange.label" type="text" />
          </label>
          <div class="scale-modal__row">
            <label>
              From (px)
              <input v-model.number="newRange.min" type="number" min="0" />
            </label>
            <label>
              To (px)
              <input v-model.number="newRange.max" type="number" min="0" />
            </label>
          </div>
          <div class="scale-modal__list">
            <div v-for="range in ranges" :key="range.id" class="scale-modal__item">
              <div>{{ range.label }} ({{ range.min }}-{{ range.max }}px)</div>
              <button class="ui-btn-ghost" type="button" @click="removeRange(range.id)">Remove</button>
            </div>
          </div>
          <div class="scale-modal__actions">
            <button class="ui-btn-ghost" type="button" @click="modalOpen = false">Cancel</button>
            <button class="ui-btn-primary" type="button" @click="addRange">Add</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.scale-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(245, 246, 251, 0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.scale-header__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  padding: 16px 24px;
}

.scale-header__left {
  min-width: 220px;
}

.scale-header__title {
  font-weight: 700;
  font-size: 1.1rem;
}

.scale-header__subtitle {
  font-size: 0.8rem;
  color: #64748b;
}

.scale-header__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}

.scale-header__status {
  padding: 0 24px 12px;
  font-size: 0.75rem;
  color: #64748b;
}

.control {
  display: grid;
  gap: 4px;
  font-size: 0.7rem;
  color: #64748b;
}

.control label {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.control span {
  font-size: 0.75rem;
  color: #0f172a;
  font-weight: 600;
}

.control select,
.control input[type="text"],
.control input[type="number"] {
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 8px;
  padding: 4px 8px;
  background: #fff;
}

.scale-body {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0;
  min-height: calc(100vh - 96px);
}

.scale-sidebar {
  position: sticky;
  top: 96px;
  align-self: start;
  padding: 24px 16px;
  border-right: 1px solid rgba(226, 232, 240, 0.8);
  background: #f5f6fb;
  height: calc(100vh - 96px);
}

.scale-sidebar__title {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
  margin-bottom: 12px;
}

.scale-nav {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid transparent;
  background: transparent;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  margin-bottom: 8px;
}

.scale-nav.active {
  background: #e7ecff;
  border-color: rgba(40, 88, 255, 0.25);
  color: #2047d6;
}

.scale-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scale-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.type-subheader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.type-unit-toggle {
  margin-top: 6px;
  display: inline-flex;
  gap: 6px;
  background: #f1f5f9;
  border-radius: 999px;
  padding: 4px;
}

.type-unit {
  border: none;
  background: transparent;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.type-unit.active {
  background: #e7ecff;
  color: #2047d6;
}

.type-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #64748b;
}

.type-scale {
  display: grid;
  gap: 16px;
}

.type-scale--split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.type-scale__list {
  display: grid;
  gap: 12px;
}

.type-scale__row {
  display: grid;
  grid-template-columns: 48px 90px 1fr;
  gap: 12px;
  align-items: center;
}

.type-scale__label {
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #64748b;
}

.type-scale__value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.type-scale__sample {
  font-size: 1rem;
  color: #0f172a;
}

.type-scale__export {
  border-left: 1px solid rgba(226, 232, 240, 0.8);
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.export-code {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  font-size: 0.75rem;
  white-space: pre-wrap;
}

.settings-field {
  display: grid;
  gap: 6px;
  font-size: 0.75rem;
  color: #64748b;
}

.settings-field input,
.settings-field select {
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 10px;
  padding: 6px 10px;
}

.scale-modal__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 60;
}

.scale-modal {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  width: min(480px, 90vw);
  display: grid;
  gap: 12px;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.2);
}

.scale-modal label {
  display: grid;
  gap: 4px;
  font-size: 0.75rem;
  color: #64748b;
}

.scale-modal input {
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 10px;
  padding: 6px 10px;
}

.scale-modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.scale-modal__list {
  display: grid;
  gap: 6px;
  max-height: 160px;
  overflow: auto;
}

.scale-modal__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.8);
  font-size: 0.8rem;
}

.scale-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
