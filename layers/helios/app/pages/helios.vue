<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

definePageMeta({
  ssr: false,
})

type HeliosTypeConfig = {
  baseFontPx: number
  typeRatio: number
  gridRatio: number
  spaceRatio: number
  minStep: number
  maxStep: number
  step: number
  brandColor: string
}

const defaultConfig: HeliosTypeConfig = {
  baseFontPx: 16,
  typeRatio: 1.2,
  gridRatio: 1.4,
  spaceRatio: 1.25,
  minStep: -2,
  maxStep: 6,
  step: 0.25,
  brandColor: '#2858ff',
}

const config = reactive<HeliosTypeConfig>({ ...defaultConfig })
const loading = ref(true)
const committing = ref(false)
const status = ref('')
const sample = ref('The quick brown fox jumps over the lazy dog')

const sanitizeConfig = (value: Partial<HeliosTypeConfig> | null | undefined): HeliosTypeConfig => {
  const safe = {
    baseFontPx: Number(value?.baseFontPx ?? defaultConfig.baseFontPx),
    typeRatio: Number(value?.typeRatio ?? defaultConfig.typeRatio),
    gridRatio: Number(value?.gridRatio ?? defaultConfig.gridRatio),
    spaceRatio: Number(value?.spaceRatio ?? defaultConfig.spaceRatio),
    minStep: Number(value?.minStep ?? defaultConfig.minStep),
    maxStep: Number(value?.maxStep ?? defaultConfig.maxStep),
    step: Number(value?.step ?? defaultConfig.step),
    brandColor: String(value?.brandColor ?? defaultConfig.brandColor),
  }

  if (!Number.isFinite(safe.baseFontPx) || safe.baseFontPx < 8) safe.baseFontPx = defaultConfig.baseFontPx
  if (!Number.isFinite(safe.typeRatio) || safe.typeRatio <= 1) safe.typeRatio = defaultConfig.typeRatio
  if (!Number.isFinite(safe.gridRatio) || safe.gridRatio <= 0.5) safe.gridRatio = defaultConfig.gridRatio
  if (!Number.isFinite(safe.spaceRatio) || safe.spaceRatio <= 1) safe.spaceRatio = defaultConfig.spaceRatio
  if (!Number.isFinite(safe.minStep)) safe.minStep = defaultConfig.minStep
  if (!Number.isFinite(safe.maxStep)) safe.maxStep = defaultConfig.maxStep
  if (safe.maxStep <= safe.minStep) {
    safe.minStep = defaultConfig.minStep
    safe.maxStep = defaultConfig.maxStep
  }
  if (!Number.isFinite(safe.step) || safe.step <= 0) safe.step = defaultConfig.step
  const rawBrand = safe.brandColor.trim()
  safe.brandColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawBrand)
    ? rawBrand
    : defaultConfig.brandColor

  return safe
}

const formatScaleKey = (raw: number) => {
  const sign = raw < 0 ? '-' : ''
  const absolute = Math.abs(raw)
  if (absolute % 1 === 0) return `${sign}${absolute}`
  const fixed = absolute.toFixed(2)
  const [intPart, fracRaw] = fixed.split('.')
  const frac = fracRaw.replace(/0+$/, '')
  const normalized = `${intPart}${frac.padEnd(2, '0')}`
  const padded = intPart === '0' ? normalized.padStart(2, '0') : normalized
  return `${sign}${padded}`
}

const toRem = (step: number) => Math.pow(config.typeRatio, step)
const toPx = (step: number) => toRem(step) * config.baseFontPx
const toSpace = (step: number) => Math.pow(config.spaceRatio, step)

const rows = computed(() => {
  const out: Array<{
    step: number
    className: string
    rem: string
    px: string
    sizeCss: string
  }> = []

  for (let step = config.maxStep; step >= config.minStep; step -= config.step) {
    const normalized = Number(step.toFixed(2))
    out.push({
      step: normalized,
      className: `f-${formatScaleKey(normalized)} lh-0`,
      rem: `${toRem(normalized).toFixed(4)}rem`,
      px: `${toPx(normalized).toFixed(2)}px`,
      sizeCss: `${toRem(normalized).toFixed(4)}rem`,
    })
  }

  return out
})

const spacingRows = computed(() => {
  const out: Array<{
    step: number
    className: string
    rem: string
    px: string
  }> = []

  for (let step = config.maxStep; step >= config.minStep; step -= config.step) {
    const normalized = Number(step.toFixed(2))
    const rem = toSpace(normalized)
    out.push({
      step: normalized,
      className: `sp-${formatScaleKey(normalized)} sm-${formatScaleKey(normalized)} sg-${formatScaleKey(normalized)}`,
      rem: `${rem.toFixed(4)}rem`,
      px: `${(rem * config.baseFontPx).toFixed(2)}px`,
    })
  }

  return out
})

const applyPreview = () => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.fontSize = `${((config.baseFontPx / 16) * 100).toFixed(4)}%`
  root.style.setProperty('--bf', `${config.baseFontPx}`)
  root.style.setProperty('--tr', `${config.typeRatio}`)
  root.style.setProperty('--gr', `${config.gridRatio}`)
  root.style.setProperty('--sr', `${config.spaceRatio}`)
  root.style.setProperty('--ds-brand', config.brandColor)

  for (let i = config.minStep; i <= config.maxStep; i += config.step) {
    const value = Number(i.toFixed(2))
    const key = formatScaleKey(value)
    root.style.setProperty(`--fs-${key}`, `${toRem(value).toFixed(6)}rem`)
    root.style.setProperty(`--v-${key}`, `${(config.gridRatio * value).toFixed(6)}rem`)
    root.style.setProperty(`--sp-${key}`, `${toSpace(value).toFixed(6)}rem`)
    root.style.setProperty(`--lh-${key}`, `${(config.gridRatio * (value + 1)).toFixed(6)}rem`)
  }

  root.style.setProperty('--lh-0', `${config.gridRatio.toFixed(6)}rem`)
  root.style.setProperty('--lh-1', `${(config.gridRatio * 2).toFixed(6)}rem`)
}

watch(config, applyPreview, { deep: true })

const load = async () => {
  loading.value = true
  status.value = ''
  try {
    const result = await $fetch<{ ok: boolean; config?: Partial<HeliosTypeConfig> }>('/api/helios/type/read')
    Object.assign(config, sanitizeConfig(result.config))
    status.value = result.ok ? 'Loaded saved Helios settings.' : 'Using defaults.'
  }
  catch {
    Object.assign(config, { ...defaultConfig })
    status.value = 'Unable to load saved settings. Using defaults.'
  }
  finally {
    applyPreview()
    loading.value = false
  }
}

const commit = async () => {
  committing.value = true
  status.value = ''
  try {
    const payload = sanitizeConfig(config)
    const result = await $fetch<{ ok: boolean; message?: string; files?: string[] }>('/api/helios/type/commit', {
      method: 'POST',
      body: { config: payload },
    })

    if (result.ok) {
      const output = result.files?.join(', ') ?? 'Artifacts updated.'
      status.value = `Committed: ${output}`
    }
    else {
      status.value = result.message ?? 'Commit failed.'
    }
  }
  catch {
    status.value = 'Commit failed.'
  }
  finally {
    committing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="helios-wrap">
    <header class="helios-header">
      <div>
        <p class="eyebrow">Helios</p>
        <h1>Typography Baseline</h1>
        <p class="intro">
          Configure base type scale values, preview the result, and commit app-owned UnoCSS/SCSS artifacts.
        </p>
      </div>
      <div class="actions">
        <button :disabled="loading || committing" @click="load">
          Reload
        </button>
        <button class="primary" :disabled="loading || committing" @click="commit">
          {{ committing ? 'Committing...' : 'Commit' }}
        </button>
      </div>
    </header>

    <p v-if="status" class="status">{{ status }}</p>

    <section class="panel controls">
      <label>
        <span>Base Font Size (px)</span>
        <input v-model.number="config.baseFontPx" type="number" min="8" step="0.5" />
      </label>

      <label>
        <span>Type Ratio</span>
        <input v-model.number="config.typeRatio" type="number" min="1" step="0.01" />
      </label>

      <label>
        <span>Grid Ratio</span>
        <input v-model.number="config.gridRatio" type="number" min="0.5" step="0.01" />
      </label>

      <label>
        <span>Spacing Ratio</span>
        <input v-model.number="config.spaceRatio" type="number" min="1" step="0.01" />
      </label>

      <label>
        <span>Scale Min Step</span>
        <input v-model.number="config.minStep" type="number" step="0.25" />
      </label>

      <label>
        <span>Scale Max Step</span>
        <input v-model.number="config.maxStep" type="number" step="0.25" />
      </label>

      <label>
        <span>Scale Step Resolution</span>
        <input v-model.number="config.step" type="number" min="0.25" step="0.25" />
      </label>

      <label>
        <span>Brand Color (Uno token)</span>
        <input v-model="config.brandColor" type="text" placeholder="#2858ff" />
      </label>
    </section>

    <section class="panel preview">
      <h2>Live Preview</h2>
      <p class="intro">
        The preview uses your current settings immediately. Utility classes in generated Uno config map to
        these CSS variables (for example <code>f-3</code>, <code>f-0</code>, <code>lh-0</code>).
      </p>

      <label>
        <span>Sample Text</span>
        <input v-model="sample" type="text" />
      </label>

      <div class="rows">
        <article v-for="row in rows" :key="row.className" class="row">
          <div class="meta">
            <code>{{ row.className }}</code>
            <span>{{ row.rem }} / {{ row.px }}</span>
          </div>
          <p :style="{ fontSize: row.sizeCss, lineHeight: 'var(--lh-0)' }">{{ sample }}</p>
        </article>
      </div>

      <h2>Spacing Preview</h2>
      <div class="rows">
        <article v-for="row in spacingRows" :key="row.className" class="row">
          <div class="meta">
            <code>{{ row.className }}</code>
            <span>{{ row.rem }} / {{ row.px }}</span>
          </div>
          <div class="space-preview" :style="{ gap: `var(--sp-${formatScaleKey(row.step)})` }">
            <span class="space-box">A</span>
            <span class="space-box">B</span>
          </div>
        </article>
      </div>

      <div class="color-test">
        <span class="chip">Preview</span>
        <span class="chip-brand">Generated Uno token `heliosbrand`</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.helios-wrap {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
  color: #0f172a;
}

.helios-header {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

h1 {
  margin: 0.25rem 0;
  font-size: 1.8rem;
  line-height: 1.2;
}

.intro {
  margin: 0;
  color: #475569;
}

.actions {
  display: flex;
  gap: 0.75rem;
}

button {
  border: 1px solid #cbd5e1;
  border-radius: 0.6rem;
  background: #fff;
  color: #0f172a;
  padding: 0.55rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

button.primary {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: #fff;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
}

.panel {
  border: 1px solid #dbe5f3;
  border-radius: 0.9rem;
  background: #fff;
  padding: 1rem;
  margin-bottom: 1rem;
}

.controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #334155;
}

input {
  border: 1px solid #cbd5e1;
  border-radius: 0.55rem;
  padding: 0.45rem 0.6rem;
  font-size: 0.95rem;
}

.rows {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
}

.row {
  border: 1px solid #e2e8f0;
  border-radius: 0.7rem;
  padding: 0.75rem;
  background: #f8fafc;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
  font-size: 0.8rem;
  color: #475569;
}

.row p {
  margin: 0;
}

.space-preview {
  display: inline-flex;
  align-items: center;
}

.space-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.8rem;
  min-height: 1.8rem;
  border-radius: 0.4rem;
  border: 1px solid #cbd5e1;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 0.75rem;
}

.color-test {
  margin-top: 1rem;
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.78rem;
  background: #e2e8f0;
  color: #0f172a;
}

@media (max-width: 840px) {
  .helios-header {
    flex-direction: column;
  }
}
</style>
