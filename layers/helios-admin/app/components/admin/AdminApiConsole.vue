<script setup lang="ts">
import type { ApiConsoleEntry } from '#helios-admin/app/stores/apiConsole'

const props = defineProps<{
  entries: ApiConsoleEntry[]
  autoClear: boolean
  autoScroll: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:autoClear', value: boolean): void
  (event: 'update:autoScroll', value: boolean): void
  (event: 'clear'): void
}>()

const consoleRef = ref<HTMLDivElement | null>(null)

const badgeClass = (state?: ApiConsoleEntry['state']) => {
  if (state === 'success') return 'is-success'
  if (state === 'error') return 'is-error'
  if (state === 'warning') return 'is-warning'
  return 'is-info'
}

watch(
  () => props.entries.length,
  () => {
    if (!props.autoScroll || !consoleRef.value) return
    nextTick(() => {
      consoleRef.value?.scrollTo({
        top: consoleRef.value.scrollHeight,
        behavior: 'smooth',
      })
    })
  },
)

const onToggleClear = (event: Event) => {
  emit('update:autoClear', (event.target as HTMLInputElement).checked)
}

const onToggleScroll = (event: Event) => {
  emit('update:autoScroll', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <section class="api-console a-card">
    <header class="api-console__header">
      <div>
        <p class="a-eyebrow">Console</p>
        <p class="api-console__subtitle">TypeSense request and response logs</p>
      </div>
      <div class="api-console__controls">
        <label class="console-toggle">
          <input type="checkbox" :checked="autoClear" @change="onToggleClear">
          Auto-clear
        </label>
        <label class="console-toggle">
          <input type="checkbox" :checked="autoScroll" @change="onToggleScroll">
          Auto-scroll
        </label>
        <button class="a-btn a-btn--ghost" type="button" @click="emit('clear')">Clear</button>
      </div>
    </header>

    <div ref="consoleRef" class="api-console__body">
      <div v-if="!entries.length" class="console-empty">
        Run a TypeSense action to see logs here.
      </div>

      <article v-for="entry in entries" :key="entry.id" class="console-entry">
        <div class="console-entry__meta">
          <span>{{ new Date(entry.timestamp).toLocaleTimeString() }}</span>
          <span class="console-entry__badge" :class="badgeClass(entry.state)">
            {{ entry.state || entry.type }}
          </span>
        </div>
        <p v-if="entry.message" class="console-entry__message">{{ entry.message }}</p>
        <pre v-if="entry.payload !== undefined" class="console-entry__payload">{{ JSON.stringify(entry.payload, null, 2) }}</pre>
      </article>
    </div>

    <footer class="api-console__footer">
      <span>{{ entries.length }} entries</span>
      <span v-if="busy">Running…</span>
    </footer>
  </section>
</template>

<style scoped>
.api-console {
  display: grid;
  grid-template-rows: auto minmax(16rem, 1fr) auto;
  min-height: 26rem;
}

.api-console__header {
  display: flex;
  justify-content: space-between;
  gap: 0.65rem;
  align-items: center;
}

.api-console__subtitle {
  margin: 0.2rem 0 0;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}

.api-console__controls {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.console-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}

.console-toggle input {
  width: 0.9rem;
  height: 0.9rem;
}

.api-console__body {
  margin-top: 0.52rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.55rem;
  overflow: auto;
  display: grid;
  gap: 0.45rem;
}

.console-empty {
  color: var(--admin-muted);
  font-size: var(--fs--075, 0.86rem);
}

.console-entry {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  padding: 0.5rem 0.55rem;
  display: grid;
  gap: 0.35rem;
}

.console-entry__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-muted-2);
}

.console-entry__badge {
  border-radius: var(--admin-radius-pill);
  padding: 0.1rem 0.45rem;
  border: 1px solid var(--admin-border);
  font-size: var(--fs--1, 0.78rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.console-entry__badge.is-success {
  color: var(--admin-success);
  background: color-mix(in srgb, var(--admin-success) 12%, transparent);
}

.console-entry__badge.is-error {
  color: var(--admin-danger);
  background: color-mix(in srgb, var(--admin-danger) 12%, transparent);
}

.console-entry__badge.is-warning {
  color: var(--admin-warning);
  background: color-mix(in srgb, var(--admin-warning) 16%, transparent);
}

.console-entry__badge.is-info {
  color: var(--admin-brand-text);
  background: color-mix(in srgb, var(--admin-brand) 10%, transparent);
}

.console-entry__message {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 500;
}

.console-entry__payload {
  margin: 0;
  border-radius: var(--admin-radius-sm);
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-muted);
  padding: 0.45rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
  max-height: 12rem;
  overflow: auto;
}

.api-console__footer {
  margin-top: 0.48rem;
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--admin-muted-2);
  font-size: var(--fs--1, 0.78rem);
}
</style>
