<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useHeliosScaleStore } from '#layers/helios/app/stores/helios'

definePageMeta({ ssr: false })

const scaleStore = useHeliosScaleStore()

const { ranges, activeScope, settings, tokens, commitStatus, isCommitting, breakpoints } = storeToRefs(scaleStore)

const modalOpen = ref(false)
const activePanel = ref<'typography' | 'settings' | 'utilities' | 'breakpoints'>('typography')
const newRange = reactive({ label: 'Mobile', min: 0, max: 767 })
const typeUnit = ref<'rem' | 'px' | 'pt'>('rem')
const showTypeExport = ref(false)
const isClient = ref(false)
const exportFile = ref('typography')
const sampleText = ref('The quick brown fox jumps over the lazy dog')
const scaleStep = ref(1)
const scaleStepOptions = [
  { value: 1, label: '1.0' },
  { value: 0.5, label: '0.5' },
  { value: 0.25, label: '0.25' },
]

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
  { label: 'Breakpoints', action: () => (activePanel.value = 'breakpoints') },
  { label: 'Settings', action: () => (activePanel.value = 'settings') },
  { label: 'Typography Lab', href: '/type' }
])

const formatStep = (value: number) => {
  const fixed = value.toFixed(2)
  return fixed.replace(/\.?0+$/, '')
}

const formatIndexString = (index: number) => {
  const sign = index < 0 ? '-' : ''
  const absoluteValue = Math.abs(index)
  if (absoluteValue % 1 === 0) return `${sign}${absoluteValue}`
  const fixed = absoluteValue.toFixed(2)
  const [intPart, fracRaw] = fixed.split('.')
  const frac = fracRaw.replace(/0+$/, '')
  const normalized = `${intPart}${frac.padEnd(2, '0')}`
  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized
  return `${sign}${padded}`
}

const typeRows = computed(() => {
  const baseFont = activeSettings.value?.fontSize ?? 16
  const ratio = activeSettings.value?.ratio ?? 1.2
  const toRem = (step: number) => Math.pow(ratio, step)
  const toPx = (rem: number) => rem * baseFont
  const toUnit = (rem: number) => {
    if (typeUnit.value === 'px') return `${(rem * baseFont).toFixed(2)}px`
    if (typeUnit.value === 'pt') return `${(rem * baseFont * 0.75).toFixed(2)}pt`
    return `${rem.toFixed(3)}rem`
  }
  const labelMap: Record<string, { label: string; weight: string; lh: string }> = {
    '6': { label: 'H1', weight: 'font-700', lh: 'var(--lh-1)' },
    '5': { label: 'H2', weight: 'font-600', lh: 'var(--lh-1)' },
    '4': { label: 'H3', weight: 'font-600', lh: 'var(--lh-1)' },
    '3': { label: 'H4', weight: 'font-600', lh: 'var(--lh-0)' },
    '2': { label: 'H5', weight: 'font-600', lh: 'var(--lh-0)' },
    '1': { label: 'H6', weight: 'font-600', lh: 'var(--lh-0)' },
    '0': { label: 'P', weight: 'font-400', lh: 'var(--lh-0)' },
    '-1': { label: 'Small', weight: 'font-400', lh: 'var(--lh-0)' },
    '-2': { label: 'Tiny', weight: 'font-400', lh: 'var(--lh-0)' },
  }

  const maxStep = 6
  const minStep = -2
  const rows: Array<{
    step: number
    label: string
    weight: string
    lh: string
  }> = []

  for (let step = maxStep; step >= minStep; step -= scaleStep.value) {
    const normalized = Number(step.toFixed(2))
    const key = formatStep(normalized)
    const mapped = labelMap[key]
    rows.push({
      step: normalized,
      label: mapped?.label ?? '',
      weight: mapped?.weight ?? 'font-500',
      lh: mapped?.lh ?? 'var(--lh-0)',
    })
  }

  return rows.map((row) => {
    const rem = toRem(row.step)
    const px = toPx(rem)
    const styleSize = toUnit(rem)
    const hoverHint =
      typeUnit.value === 'rem'
        ? `${px.toFixed(2)}px`
        : typeUnit.value === 'px'
          ? `${rem.toFixed(3)}rem`
          : `${rem.toFixed(3)}rem / ${px.toFixed(2)}px`
    return {
      ...row,
      rem,
      px,
      display: toUnit(rem),
      styleSize,
      hoverHint,
      className: row.label ? '' : 'text-muted',
      classLabel: `f-${formatStep(row.step)}`,
      key: formatStep(row.step),
    }
  })
})

const exportWindow = reactive({
  x: 120,
  y: 120,
  width: 720,
  height: 520,
  dragging: false,
  dragOffsetX: 0,
  dragOffsetY: 0,
})

const exportWindowRef = ref<HTMLElement | null>(null)
let exportResizeObserver: ResizeObserver | null = null
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const minExportSize = { width: 480, height: 320 }

const normalizeExportWindow = () => {
  if (!Number.isFinite(exportWindow.width) || exportWindow.width <= 0)
    exportWindow.width = minExportSize.width
  if (!Number.isFinite(exportWindow.height) || exportWindow.height <= 0)
    exportWindow.height = minExportSize.height
  if (!Number.isFinite(exportWindow.x)) exportWindow.x = 16
  if (!Number.isFinite(exportWindow.y)) exportWindow.y = 16
}

const clampExportWindow = () => {
  if (typeof window === 'undefined') return
  normalizeExportWindow()
  exportWindow.width = Math.max(minExportSize.width, exportWindow.width)
  exportWindow.height = Math.max(minExportSize.height, exportWindow.height)
  const maxX = Math.max(16, window.innerWidth - exportWindow.width - 16)
  const maxY = Math.max(16, window.innerHeight - exportWindow.height - 16)
  exportWindow.x = clamp(exportWindow.x, 16, maxX)
  exportWindow.y = clamp(exportWindow.y, 16, maxY)
}

const toggleExport = () => {
  showTypeExport.value = !showTypeExport.value
  if (showTypeExport.value) {
    normalizeExportWindow()
    clampExportWindow()
  }
}

const setupExportObserver = () => {
  if (typeof ResizeObserver === 'undefined' || !exportWindowRef.value) return
  exportResizeObserver?.disconnect()
  exportResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    if (width >= minExportSize.width) exportWindow.width = width
    if (height >= minExportSize.height) exportWindow.height = height
    clampExportWindow()
  })
  exportResizeObserver.observe(exportWindowRef.value)
}

const startDrag = (event: PointerEvent) => {
  if (exportWindowRef.value) {
    const rect = exportWindowRef.value.getBoundingClientRect()
    exportWindow.width = rect.width
    exportWindow.height = rect.height
  }
  exportWindow.dragging = true
  exportWindow.dragOffsetX = event.clientX - exportWindow.x
  exportWindow.dragOffsetY = event.clientY - exportWindow.y
}

const onDrag = (event: PointerEvent) => {
  if (!exportWindow.dragging) return
  exportWindow.x = Math.max(16, event.clientX - exportWindow.dragOffsetX)
  exportWindow.y = Math.max(16, event.clientY - exportWindow.dragOffsetY)
}

const stopDrag = () => {
  exportWindow.dragging = false
}

onMounted(() => {
  isClient.value = true
  if (typeof window !== 'undefined') {
    if (!window.localStorage.getItem('helios-export-window')) {
      exportWindow.width = Math.max(minExportSize.width, Math.round(window.innerWidth * 0.6))
      exportWindow.height = Math.max(minExportSize.height, Math.round(window.innerHeight * 0.7))
      exportWindow.x = Math.max(16, Math.round((window.innerWidth - exportWindow.width) / 2))
      exportWindow.y = Math.max(16, Math.round((window.innerHeight - exportWindow.height) / 2))
    }
    const saved = window.localStorage.getItem('helios-export-window')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        exportWindow.x = parsed.x ?? exportWindow.x
        exportWindow.y = parsed.y ?? exportWindow.y
        exportWindow.width = parsed.width ?? exportWindow.width
        exportWindow.height = parsed.height ?? exportWindow.height
      } catch {}
    }
    clampExportWindow()
  }
  if (showTypeExport.value) setupExportObserver()
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', stopDrag)
})

onBeforeUnmount(() => {
  exportResizeObserver?.disconnect()
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', stopDrag)
})

watch(
  () => [exportWindow.x, exportWindow.y, exportWindow.width, exportWindow.height],
  () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      'helios-export-window',
      JSON.stringify({
        x: exportWindow.x,
        y: exportWindow.y,
        width: exportWindow.width,
        height: exportWindow.height,
      })
    )
  }
)

watch(
  () => showTypeExport.value,
  (value) => {
    if (value) {
      nextTick(() => {
        setupExportObserver()
        clampExportWindow()
      })
    }
    else {
      exportResizeObserver?.disconnect()
    }
  }
)

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
].join('\n'))

const buildTokensScss = () => {
  if (!tokens.value) return ''
  const buildBlock = (base: any) => {
    const lines: string[] = []
    const fontSizePercentage = (base.fontSize / 16) * 100
    lines.push(`  font-size: ${fontSizePercentage.toFixed(4)}%;`)
    lines.push(`  --lh: ${base.gridRatio};`)
    lines.push(`  --s: ${base.ratio};`)
    lines.push(`  --space-mode: ${base.spaceMode};`)
    lines.push(`  --space-sync: ${base.spaceSync !== false};`)
    for (let i = scaleStore.minLevel; i <= scaleStore.levels; i += 0.25) {
      const index = Number(i.toFixed(2))
      const key = formatIndexString(index)
      const size = Math.pow(base.ratio, index)
      const gridUnit = base.gridRatio * index
      const lineHeightUnit = base.gridRatio * (index + 1)
      let space = 0
      if (base.spaceSync !== false) {
        space = gridUnit
      }
      else if (index !== 0) {
        space = base.spaceMode === 'grid'
          ? base.spaceBase * index
          : base.spaceBase * Math.pow(base.spaceRatio, index)
      }
      lines.push(`  --fs-${key}: ${size}rem;`)
      lines.push(`  --v-${key}: ${gridUnit}rem;`)
      lines.push(`  --lh-${key}: ${lineHeightUnit}rem;`)
      lines.push(`  --sp-${key}: ${space}rem;`)
    }
    return lines
  }

  const lines: string[] = []
  lines.push(':root {')
  lines.push(...buildBlock(tokens.value.base))
  lines.push('}')
  lines.push('')

  for (const range of ranges.value) {
    const override = tokens.value.breakpoints?.[range.max]
    if (!override) continue
    const nextTokens = { ...tokens.value.base, ...override }
    lines.push(`@media (min-width: ${range.min}px) and (max-width: ${range.max}px) {`)
    lines.push('  :root {')
    lines.push(...buildBlock(nextTokens).map((line) => `  ${line}`))
    lines.push('  }')
    lines.push('}')
    lines.push('')
  }

  return lines.join('\n')
}

const breakpointsScss = computed(() => {
  const lines: string[] = []
  lines.push('@theme {')
  for (const bp of breakpoints.value) {
    if (!bp.key || !bp.value) continue
    lines.push(`  --breakpoint-${bp.key}: ${bp.value};`)
  }
  lines.push('}')
  return lines.join('\n')
})

const entryScss = computed(() => {
  const tokensName = settings.value.tokensScssFile.replace(/^_/, '').replace(/\.scss$/, '')
  const typeName = settings.value.typographyFile.replace(/^_/, '').replace(/\.scss$/, '')
  const breakName = settings.value.breakpointsFile.replace(/^_/, '').replace(/\.scss$/, '')
  return `@use "${tokensName}";\n@use "${typeName}";\n@use "${breakName}";\n`
})

const exportFiles = computed(() => ([
  { value: 'typography', label: 'Typography', content: typographyScss.value },
  { value: 'tokens', label: 'Tokens', content: buildTokensScss() },
  { value: 'breakpoints', label: 'Breakpoints', content: breakpointsScss.value },
  { value: 'entry', label: 'Entry', content: entryScss.value },
]))

const activeExport = computed(() => {
  return exportFiles.value.find((file) => file.value === exportFile.value) ?? exportFiles.value[0]
})

const copyTypographyScss = async () => {
  if (!activeExport.value) return
  await navigator.clipboard.writeText(activeExport.value.content)
}

const removeBreakpoint = (key: string) => {
  breakpoints.value = breakpoints.value.filter((item) => item.key !== key)
  scaleStore.saveDraft()
}

const addBreakpoint = () => {
  breakpoints.value = [...breakpoints.value, { key: 'new', value: '1000px' }]
  scaleStore.saveDraft()
}

watch(
  breakpoints,
  () => {
    scaleStore.saveDraft()
  },
  { deep: true }
)

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
            />
            <span>{{ activeSettings?.gridRatio?.toFixed(2) }}</span>
          </div>
          <button class="ui-btn-ghost" type="button" @click="modalOpen = true">Add range</button>
          <UiMenu :items="viewItems" label="Views" />
          <button class="ui-btn-ghost" type="button" @click="toggleExport">
            SCSS
          </button>
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
                <div class="type-subheader__controls">
                  <div class="type-unit-toggle">
                    <button class="type-unit" :class="{ active: typeUnit === 'rem' }" @click="typeUnit = 'rem'">REM</button>
                    <button class="type-unit" :class="{ active: typeUnit === 'px' }" @click="typeUnit = 'px'">PX</button>
                    <button class="type-unit" :class="{ active: typeUnit === 'pt' }" @click="typeUnit = 'pt'">PT</button>
                  </div>
                  <input v-model="sampleText" class="input type-subheader__input" type="text" />
                  <label class="type-toggle type-toggle--inline">
                    <span>Step</span>
                    <UiListbox v-model="scaleStep" :options="scaleStepOptions" />
                  </label>
                </div>
              </div>
              <div class="type-subheader__right">
              </div>
            </div>
            <div class="type-scale">
              <div class="type-scale__list">
                <div class="type-scale__row" v-for="row in typeRows" :key="row.key">
                  <div class="type-scale__label">{{ row.label }}</div>
                  <div class="type-scale__value" :data-tooltip="row.hoverHint">{{ row.display }}</div>
                  <div class="type-scale__class">{{ row.classLabel }}</div>
                  <div class="type-scale__sample" :class="row.weight">
                    <span :style="{ fontSize: row.styleSize, lineHeight: row.lh }">{{ sampleText }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'utilities'" class="flex flex-col g-2">
          <ScaleUtilitiesPanel />
        </section>

        <section v-else-if="activePanel === 'breakpoints'" class="ui-card gp-3 flex flex-col g-1">
          <div class="text-xs uppercase tracking-wide text-muted">Breakpoints</div>
          <div class="breakpoints-grid">
            <div v-for="bp in breakpoints" :key="bp.key" class="breakpoint-row">
              <input v-model="bp.key" class="input input-sm" />
              <input v-model="bp.value" class="input input-sm" />
              <button class="ui-btn-ghost text-xs" type="button" @click="removeBreakpoint(bp.key)">
                Remove
              </button>
            </div>
            <button class="ui-btn-ghost text-xs" type="button" @click="addBreakpoint">
              Add breakpoint
            </button>
          </div>
          <div class="text-xs text-muted">
            Uses UnoCSS breakpoint names (e.g. <code>t:flex-row</code> or <code>lt-t=\"flex-col\"</code>).
            Commit writes <code>_breakpoints.scss</code> and updates <code>helios.tokens.json</code>; restart dev server to reload UnoCSS breakpoints.
          </div>
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
            <label class="settings-field">
              Breakpoints SCSS
              <input v-model="settings.breakpointsFile" type="text" />
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

    <Teleport v-if="isClient" to="body">
      <div
        v-if="showTypeExport"
        ref="exportWindowRef"
        class="export-window"
        :style="{
          width: `${exportWindow.width}px`,
          height: `${exportWindow.height}px`,
          transform: `translate(${exportWindow.x}px, ${exportWindow.y}px)`
        }"
      >
        <div class="export-window__header" @pointerdown="startDrag">
          <div class="export-window__title">SCSS export</div>
          <div class="export-window__controls">
            <UiListbox v-model="exportFile" :options="exportFiles.map(({ value, label }) => ({ value, label }))" />
            <button class="ui-btn-ghost text-xs" type="button" @click="copyTypographyScss">Copy</button>
            <button class="ui-btn-ghost text-xs" type="button" @click="showTypeExport = false">Close</button>
          </div>
        </div>
        <div class="export-window__body">
          <pre class="export-code">{{ activeExport?.content }}</pre>
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

.type-subheader__controls {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.type-subheader__input {
  max-width: 320px;
}

.type-unit-toggle {
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

.type-toggle--inline :deep(.ui-select-shell) {
  width: 88px;
}

.type-scale {
  display: grid;
  gap: 16px;
}


.type-scale__list {
  display: grid;
  gap: 12px;
}

.type-scale__row {
  display: grid;
  grid-template-columns: 48px 90px 90px 1fr;
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
  position: relative;
}

.type-scale__value::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 0;
  top: -28px;
  padding: 4px 8px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 0.7rem;
  white-space: nowrap;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
  z-index: 2;
}

.type-scale__value:hover::after {
  opacity: 1;
  transform: translateY(0);
}

.type-scale__class {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
}

.type-scale__sample {
  font-size: 1rem;
  color: #0f172a;
}

.export-code {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 12px;
  padding: 14px;
  font-size: 0.75rem;
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.export-window {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 80;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);
  display: flex;
  flex-direction: column;
  resize: both;
  overflow: auto;
  min-width: 320px;
  min-height: 220px;
}

.export-window__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  cursor: grab;
}

.export-window__header:active {
  cursor: grabbing;
}

.export-window__title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
}

.export-window__controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.export-window__body {
  padding: 12px;
  flex: 1;
}

.breakpoints-grid {
  display: grid;
  gap: 8px;
}

.breakpoint-row {
  display: grid;
  grid-template-columns: 120px 1fr auto;
  gap: 10px;
  align-items: center;
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
