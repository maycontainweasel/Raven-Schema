<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useHeliosScaleStore } from '#layers/helios/app/stores/helios'

definePageMeta({ ssr: false })

const scaleStore = useHeliosScaleStore()

const { ranges, activeScope, settings, tokens, commitStatus, isCommitting, breakpoints, designTokens } = storeToRefs(scaleStore)

const modalOpen = ref(false)
const activePanel = ref<'typography' | 'spacing' | 'design' | 'components' | 'settings' | 'utilities' | 'breakpoints'>('typography')
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

const spacingSteps = [-3, -2, -1, -0.5, -0.25, 0, 0.25, 0.5, 1, 1.5, 2, 3, 4]

const buttonSizeScales = reactive([
  { label: 'XS', scale: 0.85 },
  { label: 'SM', scale: 1 },
  { label: 'MD', scale: 1.15 },
  { label: 'LG', scale: 1.3 },
])

const buttonVariants = [
  { label: 'Primary', className: 'ui-btn-primary' },
  { label: 'Ghost', className: 'ui-btn-ghost' },
  { label: 'Soft', className: 'ui-btn-soft' },
]

const colorFields = [
  { key: 'bg', label: 'Background' },
  { key: 'panel', label: 'Panel' },
  { key: 'panelSoft', label: 'Panel soft' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted' },
  { key: 'border', label: 'Border' },
  { key: 'accent', label: 'Accent' },
  { key: 'accentStrong', label: 'Accent strong' },
  { key: 'accentSoft', label: 'Accent soft' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'danger', label: 'Danger' },
]

const radiusFields = [
  { key: 'sm', label: 'Radius sm' },
  { key: 'md', label: 'Radius md' },
  { key: 'lg', label: 'Radius lg' },
  { key: 'xl', label: 'Radius xl' },
]

const shadowFields = [
  { key: 'sm', label: 'Shadow sm' },
  { key: 'md', label: 'Shadow md' },
  { key: 'lg', label: 'Shadow lg' },
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
  { label: 'Spacing', action: () => (activePanel.value = 'spacing') },
  { label: 'Design system', action: () => (activePanel.value = 'design') },
  { label: 'Components', action: () => (activePanel.value = 'components') },
  { label: 'Utilities', action: () => (activePanel.value = 'utilities') },
  { label: 'Breakpoints', action: () => (activePanel.value = 'breakpoints') },
  { label: 'Settings', action: () => (activePanel.value = 'settings') },
  { label: 'Preview canvas', href: '/preview' },
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

const spaceSync = computed(() => activeSettings.value?.spaceSync !== false)
const spaceMode = computed(() => activeSettings.value?.spaceMode ?? 'grid')

const toggleSpaceSync = () => {
  if (!activeSettings.value) return
  const current = activeSettings.value.spaceSync !== false
  activeSettings.value.spaceSync = current ? false : true
}

const spacingRows = computed(() => {
  const base = activeSettings.value
  if (!base) return []
  const baseFont = base.fontSize ?? 16
  return spacingSteps.map((step) => {
    const key = formatIndexString(step)
    const gridRem = base.gridRatio * step
    let spaceRem = 0
    if (base.spaceSync !== false) {
      spaceRem = gridRem
    } else if (step !== 0) {
      spaceRem = base.spaceMode === 'grid'
        ? base.spaceBase * step
        : base.spaceBase * Math.pow(base.spaceRatio, step)
    }
    return {
      step,
      key,
      isNegative: step < 0,
      gridRem,
      gridPx: gridRem * baseFont,
      spaceRem,
      spacePx: spaceRem * baseFont,
      gridClass: `gp-${key}`,
      spaceClass: `sp-${key}`,
    }
  })
})

const buttonStyle = (scale: number) => {
  const tokensValue = designTokens.value
  if (!tokensValue) return {}
  const height = tokensValue.buttons.height * scale
  const padX = tokensValue.buttons.padX * scale
  return {
    height: `${height}px`,
    padding: `0 ${padX}px`,
    borderRadius: `${tokensValue.buttons.radius}px`,
    fontSize: 'var(--fs-0)',
  }
}

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

const spacingScss = computed(() => {
  if (!tokens.value) return ''
  const buildBlock = (base: any) => {
    const lines: string[] = []
    lines.push(`  --space-mode: ${base.spaceMode};`)
    lines.push(`  --space-sync: ${base.spaceSync !== false};`)
    for (let i = scaleStore.minLevel; i <= scaleStore.levels; i += 0.25) {
      const index = Number(i.toFixed(2))
      const key = formatIndexString(index)
      const gridUnit = base.gridRatio * index
      let space = 0
      if (base.spaceSync !== false) {
        space = gridUnit
      }
      else if (index !== 0) {
        space = base.spaceMode === 'grid'
          ? base.spaceBase * index
          : base.spaceBase * Math.pow(base.spaceRatio, index)
      }
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
})

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

const designScss = computed(() => {
  const tokensValue = designTokens.value
  if (!tokensValue) return ''
  const colors = tokensValue.colors
  const radius = tokensValue.radius
  const shadows = tokensValue.shadows
  const borders = tokensValue.borders
  const buttons = tokensValue.buttons
  const cards = tokensValue.cards
  const shadowBase = colors.text || '#0f172a'
  const alphaHex = (value: number) =>
    Math.round(value * 255).toString(16).padStart(2, '0')
  return [
    ':root {',
    `  --ds-bg: ${colors.bg};`,
    `  --ds-panel: ${colors.panel};`,
    `  --ds-panel-soft: ${colors.panelSoft};`,
    `  --ds-text: ${colors.text};`,
    `  --ds-muted: ${colors.muted};`,
    `  --ds-border: ${colors.border};`,
    `  --ds-accent: ${colors.accent};`,
    `  --ds-accent-strong: ${colors.accentStrong};`,
    `  --ds-accent-soft: ${colors.accentSoft};`,
    `  --ds-success: ${colors.success};`,
    `  --ds-warning: ${colors.warning};`,
    `  --ds-danger: ${colors.danger};`,
    `  --ds-radius-sm: ${radius.sm}px;`,
    `  --ds-radius-md: ${radius.md}px;`,
    `  --ds-radius-lg: ${radius.lg}px;`,
    `  --ds-radius-xl: ${radius.xl}px;`,
    `  --ds-shadow-sm: 0 6px 18px ${shadowBase}${alphaHex(shadows.sm)};`,
    `  --ds-shadow-md: 0 18px 40px ${shadowBase}${alphaHex(shadows.md)};`,
    `  --ds-shadow-lg: 0 30px 70px ${shadowBase}${alphaHex(shadows.lg)};`,
    `  --ds-border-width: ${borders.width}px;`,
    `  --ds-btn-height: ${buttons.height}px;`,
    `  --ds-btn-pad-x: ${buttons.padX}px;`,
    `  --ds-btn-radius: ${buttons.radius}px;`,
    `  --ds-card-radius: ${cards.radius}px;`,
    `  --ds-card-border: ${cards.border}px;`,
    '}',
  ].join('\n')
})

const entryScss = computed(() => {
  const tokensName = settings.value.tokensScssFile.replace(/^_/, '').replace(/\.scss$/, '')
  const typeName = settings.value.typographyFile.replace(/^_/, '').replace(/\.scss$/, '')
  const breakName = settings.value.breakpointsFile.replace(/^_/, '').replace(/\.scss$/, '')
  const designName = settings.value.designFile.replace(/^_/, '').replace(/\.scss$/, '')
  return `@use "${tokensName}";\n@use "${typeName}";\n@use "${breakName}";\n@use "${designName}";\n`
})

const exportFiles = computed(() => ([
  { value: 'typography', label: 'Typography', content: typographyScss.value },
  { value: 'spacing', label: 'Spacing', content: spacingScss.value },
  { value: 'tokens', label: 'Tokens', content: buildTokensScss() },
  { value: 'design', label: 'Design system', content: designScss.value },
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
  <div class="min-h-screen bg-[var(--ds-bg)] text-ink type-default">
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
        <button class="scale-nav" :class="{ active: activePanel === 'spacing' }" @click="activePanel = 'spacing'">
          Spacing
        </button>
        <button class="scale-nav" :class="{ active: activePanel === 'design' }" @click="activePanel = 'design'">
          Design system
        </button>
        <button class="scale-nav" :class="{ active: activePanel === 'components' }" @click="activePanel = 'components'">
          Components
        </button>
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

        <section v-else-if="activePanel === 'spacing'" class="flex flex-col g-2">
          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Spacing scale</div>
            <div class="spacing-controls">
              <div class="spacing-control">
                <span>Sync to grid</span>
                <button class="toggle-btn" :class="{ active: spaceSync }" type="button" @click="toggleSpaceSync">
                  {{ spaceSync ? 'On' : 'Off' }}
                </button>
              </div>
              <div class="spacing-control">
                <span>Mode</span>
                <div class="segmented">
                  <button
                    type="button"
                    class="segmented__item"
                    :class="{ active: spaceMode === 'grid' }"
                    :disabled="spaceSync"
                    @click="activeSettings && (activeSettings.spaceMode = 'grid')"
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    class="segmented__item"
                    :class="{ active: spaceMode === 'ratio' }"
                    :disabled="spaceSync"
                    @click="activeSettings && (activeSettings.spaceMode = 'ratio')"
                  >
                    Ratio
                  </button>
                </div>
              </div>
              <label class="spacing-control">
                <span>Base unit (rem)</span>
                <input
                  v-if="activeSettings"
                  v-model.number="activeSettings.spaceBase"
                  type="range"
                  min="0.25"
                  max="2"
                  step="0.05"
                  :disabled="spaceSync"
                />
                <strong>{{ activeSettings?.spaceBase?.toFixed(2) }}rem</strong>
              </label>
              <label class="spacing-control">
                <span>Space ratio</span>
                <input
                  v-if="activeSettings"
                  v-model.number="activeSettings.spaceRatio"
                  type="range"
                  min="1.05"
                  max="1.8"
                  step="0.01"
                  :disabled="spaceSync || spaceMode === 'grid'"
                />
                <strong>{{ activeSettings?.spaceRatio?.toFixed(2) }}</strong>
              </label>
            </div>
            <div class="text-xs text-muted">
              <code>gp-*</code> uses the typographic grid (<code>--v-*</code>). <code>sp-*</code> uses the spacing scale (<code>--sp-*</code>).
            </div>
          </section>

          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Spacing preview</div>
            <div class="spacing-table">
              <div class="spacing-row spacing-row--head">
                <div>Step</div>
                <div>Grid (gp)</div>
                <div>Class</div>
                <div>Space (sp)</div>
                <div>Class</div>
                <div>Preview</div>
              </div>
              <div v-for="row in spacingRows" :key="row.key" class="spacing-row">
                <div class="spacing-step">{{ row.step }}</div>
                <div class="spacing-value">{{ row.gridRem.toFixed(2) }}rem</div>
                <div class="spacing-class">{{ row.gridClass }}</div>
                <div class="spacing-value">{{ row.spaceRem.toFixed(2) }}rem</div>
                <div class="spacing-class">{{ row.spaceClass }}</div>
                <div class="spacing-preview">
                  <div
                    class="spacing-chip"
                    :class="{ negative: row.isNegative }"
                    :style="row.isNegative ? { marginTop: `${row.gridRem}rem` } : { padding: `${row.gridRem}rem` }"
                  >
                    gp
                  </div>
                  <div
                    class="spacing-chip"
                    :class="{ negative: row.isNegative }"
                    :style="row.isNegative ? { marginTop: `${row.spaceRem}rem` } : { padding: `${row.spaceRem}rem` }"
                  >
                    sp
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Utility class preview</div>
            <div class="spacing-class-preview">
              <div class="preview-column">
                <div class="text-xs uppercase tracking-wide text-muted">Grid (gp/gm/g)</div>
                <div class="preview-block gp-1">gp-1 padding</div>
                <div class="preview-block gmy-1">gmy-1 margin</div>
                <div class="preview-block g-1">g-1 gap (parent)</div>
                <div class="preview-stack g-1">
                  <div class="preview-chip">Item</div>
                  <div class="preview-chip">Item</div>
                </div>
              </div>
              <div class="preview-column">
                <div class="text-xs uppercase tracking-wide text-muted">Space (sp/sm/sg)</div>
                <div class="preview-block sp-1">sp-1 padding</div>
                <div class="preview-block smy-1">smy-1 margin</div>
                <div class="preview-block sg-1">sg-1 gap (parent)</div>
                <div class="preview-stack sg-1">
                  <div class="preview-chip">Item</div>
                  <div class="preview-chip">Item</div>
                </div>
              </div>
            </div>
            <p class="text-xs text-muted">
              Negative spacing works on margin utilities (e.g. <code>gmy--1</code>, <code>smt--05</code>).
            </p>
          </section>
        </section>

        <section v-else-if="activePanel === 'design'" class="flex flex-col g-2">
          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Atomic design tokens</div>
            <div class="design-grid">
              <div class="design-panel">
                <div class="panel-title">Colors</div>
                <div class="token-grid">
                  <label v-for="item in colorFields" :key="item.key" class="token-row">
                    <span>{{ item.label }}</span>
                    <div class="token-inputs">
                      <input v-model="designTokens.colors[item.key]" type="color" class="color-input" />
                      <input v-model="designTokens.colors[item.key]" type="text" class="input input-sm" />
                    </div>
                  </label>
                </div>
              </div>
              <div class="design-panel">
                <div class="panel-title">Radii</div>
                <div class="token-grid">
                  <label v-for="item in radiusFields" :key="item.key" class="token-row">
                    <span>{{ item.label }}</span>
                    <input v-model.number="designTokens.radius[item.key]" type="number" class="input input-sm" />
                  </label>
                </div>

                <div class="panel-title mt-6">Shadows (opacity)</div>
                <div class="token-grid">
                  <label v-for="item in shadowFields" :key="item.key" class="token-row">
                    <span>{{ item.label }}</span>
                    <input v-model.number="designTokens.shadows[item.key]" type="number" step="0.01" min="0" max="0.5" class="input input-sm" />
                  </label>
                </div>
              </div>
              <div class="design-panel">
                <div class="panel-title">Buttons</div>
                <div class="token-grid">
                  <label class="token-row">
                    <span>Height</span>
                    <input v-model.number="designTokens.buttons.height" type="number" class="input input-sm" />
                  </label>
                  <label class="token-row">
                    <span>Horizontal padding</span>
                    <input v-model.number="designTokens.buttons.padX" type="number" class="input input-sm" />
                  </label>
                  <label class="token-row">
                    <span>Radius</span>
                    <input v-model.number="designTokens.buttons.radius" type="number" class="input input-sm" />
                  </label>
                </div>

                <div class="panel-title mt-6">Cards</div>
                <div class="token-grid">
                  <label class="token-row">
                    <span>Radius</span>
                    <input v-model.number="designTokens.cards.radius" type="number" class="input input-sm" />
                  </label>
                  <label class="token-row">
                    <span>Border width</span>
                    <input v-model.number="designTokens.cards.border" type="number" class="input input-sm" />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Design preview</div>
            <div class="preview-grid">
              <div class="ui-card preview-card shadow-ds-sm">
                <div class="text-xs uppercase tracking-wide text-muted">Primary card</div>
                <div class="fs-2 font-600">Launch faster with atomic tokens.</div>
                <div class="text-muted">Every surface is powered by CSS variables and UnoCSS shortcuts.</div>
                <div class="flex items-center gap-2">
                  <button class="ui-btn-primary">Primary</button>
                  <button class="ui-btn-ghost">Ghost</button>
                </div>
              </div>
              <div class="preview-stack">
                <div class="ui-card shadow-ds-md">
                  <div class="ui-pill">System tag</div>
                  <div class="fs-1 font-600">Tokens sync everywhere</div>
                  <div class="text-muted">Update once, see the UI refresh instantly.</div>
                </div>
                <div class="ui-card shadow-ds-lg">
                  <div class="fs-1 font-600">Buttons</div>
                  <div class="flex flex-wrap gap-2">
                    <button class="ui-btn-primary">Primary</button>
                    <button class="ui-btn-ghost">Secondary</button>
                    <button class="ui-btn-soft">Soft</button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section v-else-if="activePanel === 'components'" class="flex flex-col g-2">
          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Button system</div>
            <div class="component-grid">
              <div class="component-panel">
                <div class="panel-title">Size scale</div>
                <div class="token-grid">
                  <label v-for="size in buttonSizeScales" :key="size.label" class="token-row">
                    <span>{{ size.label }}</span>
                    <input v-model.number="size.scale" type="number" step="0.05" class="input input-sm" />
                  </label>
                </div>
                <p class="text-xs text-muted mt-3">
                  Sizes multiply the base button tokens (<code>--ds-btn-height</code>, <code>--ds-btn-pad-x</code>).
                </p>
              </div>
              <div class="component-panel">
                <div class="panel-title">Preview</div>
                <div class="button-preview">
                  <div v-for="variant in buttonVariants" :key="variant.label" class="button-preview__row">
                    <div class="text-xs uppercase tracking-wide text-muted">{{ variant.label }}</div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="size in buttonSizeScales"
                        :key="size.label"
                        :class="variant.className"
                        :style="buttonStyle(size.scale)"
                      >
                        {{ size.label }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="ui-card gp-3 flex flex-col g-2">
            <div class="text-xs uppercase tracking-wide text-muted">Tags & surfaces</div>
            <div class="flex flex-wrap gap-2">
              <span class="ui-pill">UI Pill</span>
              <span class="ui-pill bg-[var(--ds-accent-soft)] text-[var(--ds-accent-strong)]">Accent</span>
              <span class="ui-pill" style="border-radius: var(--ds-radius-sm);">Soft radius</span>
            </div>
            <div class="preview-grid mt-3">
              <div class="ui-card shadow-ds-sm">Card sm</div>
              <div class="ui-card shadow-ds-md">Card md</div>
              <div class="ui-card shadow-ds-lg">Card lg</div>
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
            <label class="settings-field">
              Design system SCSS
              <input v-model="settings.designFile" type="text" />
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

.design-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.design-panel {
  background: var(--ds-panel-soft, #f8f9fc);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 16px;
}

.panel-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #667085;
  margin-bottom: 8px;
}

.token-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.token-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(140px, 1.2fr);
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #1f2937;
}

.token-inputs {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 36px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #fff;
  padding: 0;
}

.preview-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(260px, 1fr) minmax(240px, 0.9fr);
}

.preview-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.spacing-controls {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  align-items: center;
}

.spacing-control {
  display: grid;
  gap: 6px;
  font-size: 0.75rem;
  color: #64748b;
}

.spacing-control strong {
  font-size: 0.75rem;
  color: #0f172a;
  font-weight: 600;
}

.toggle-btn {
  border: 1px solid rgba(203, 213, 225, 0.8);
  border-radius: 999px;
  padding: 6px 12px;
  background: #fff;
  font-weight: 600;
  color: #64748b;
  text-align: center;
}

.toggle-btn.active {
  background: #1f2a44;
  border-color: #1f2a44;
  color: #fff;
}

.segmented {
  display: inline-flex;
  border-radius: 999px;
  border: 1px solid rgba(203, 213, 225, 0.8);
  overflow: hidden;
  background: #fff;
}

.segmented__item {
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.segmented__item.active {
  background: #e7ecff;
  color: #2047d6;
}

.segmented__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spacing-table {
  display: grid;
  gap: 8px;
}

.spacing-row {
  display: grid;
  grid-template-columns: 60px 120px 120px 120px 120px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 0.8rem;
  color: #475569;
}

.spacing-row--head {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.spacing-class {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 0.72rem;
  color: #64748b;
}

.spacing-preview {
  display: flex;
  gap: 8px;
}

.spacing-chip {
  background: #e7ecff;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #2047d6;
  min-width: 46px;
  text-align: center;
}

.spacing-chip.negative {
  background: #ffe8e8;
  color: #c92a2a;
}

.spacing-class-preview {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.preview-column {
  display: grid;
  gap: 10px;
}

.preview-block {
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.7);
  background: #f8fafc;
  font-size: 0.8rem;
  color: #475569;
}

.preview-stack {
  display: grid;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.7);
  padding: 8px;
}

.preview-chip {
  background: #e7ecff;
  color: #2047d6;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 6px 8px;
  border-radius: 999px;
}

.component-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.component-panel {
  background: var(--ds-panel-soft, #f8f9fc);
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 16px;
}

.button-preview {
  display: grid;
  gap: 16px;
}

.button-preview__row {
  display: grid;
  gap: 8px;
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
