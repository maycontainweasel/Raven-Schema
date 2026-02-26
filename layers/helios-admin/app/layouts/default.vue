<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const sidebarCollapsed = useState('adminSidebarCollapsed', () => false)
const modelBuilderOverlayOpen = useState('heliosModelBuilderOverlayOpen', () => false)

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (target.isContentEditable) return true
  return tag === 'input' || tag === 'textarea' || tag === 'select'
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Backspace') return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (isEditableTarget(event.target)) return
  event.preventDefault()
  toggleSidebar()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="admin-app-shell">
    <div class="admin-shell-layout">
      <AdminSidebar :collapsed="sidebarCollapsed" />

      <div class="admin-shell-main">
        <AdminHeader
          :class="{ 'is-hidden': modelBuilderOverlayOpen }"
          @toggle="toggleSidebar"
        />

        <main class="admin-main">
          <div class="admin-shell-pattern" />
          <div class="admin-main-inner">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style>

:root {
  --admin-bg: var(--hds-color-util-neutral-25, white);
  --admin-surface: var(--hds-color-util-neutral-0, #ffffff);
  --admin-surface-muted: var(--hds-color-util-neutral-25, var(--colors-slate-100));
  --admin-surface-soft: var(--hds-color-util-neutral-50, var(--colors-slate-50));
  --admin-border: var(--hds-color-border, rgba(2, 5, 19, 0.08));
  --admin-border-strong: var(--hds-color-util-border-subdued, var(--colors-slate-200));
  --admin-brand: var(--hds-color-action-bg-solid, var(--colors-sky-400));
  --admin-brand-hover: var(--hds-color-action-bg-solidHover, var(--colors-sky-500));
  --admin-brand-soft: var(--hds-color-action-bg-subdued, #e2e4ff);
  --admin-brand-text: var(--hds-color-action-text-solid, var(--colors-sky-400));
  --admin-text: var(--hds-color-text-solid, var(--colors-slate-900));
  --admin-text-soft: var(--hds-color-text-soft, var(--colors-slate-500));
  --admin-muted: var(--hds-color-text-subdued, var(--colors-slate-500));
  --admin-muted-2: var(--hds-color-text-quiet, var(--colors-slate-400));
  --admin-success: var(--hds-color-util-success-400, var(--colors-green-400));
  --admin-warning: var(--hds-color-util-accent-lemon-300, var(--colors-amber-500));
  --admin-danger: var(--hds-color-util-error-500, var(--colors-red-400));
  --admin-shadow-soft: 0 1px 2px rgba(2, 5, 19, 0.06);
  --admin-radius-sm: var(--radius-sm);
  --admin-radius-md: var(--radius-md);
  --admin-radius-lg: var(--radius-lg);
  --admin-radius-pill: 9999px;
}

/* :root {
  --admin-bg: var(--hds-color-util-neutral-25, #f8fafd);
  --admin-surface: var(--hds-color-util-neutral-0, #ffffff);
  --admin-surface-muted: var(--hds-color-util-neutral-25, #f8fafd);
  --admin-surface-soft: var(--hds-color-util-neutral-50, #e5edf5);
  --admin-border: var(--hds-color-border, rgba(2, 5, 19, 0.08));
  --admin-border-strong: var(--hds-color-util-border-subdued, #d4dee9);
  --admin-brand: var(--hds-color-action-bg-solid, #533afd);
  --admin-brand-hover: var(--hds-color-action-bg-solidHover, #4032c8);
  --admin-brand-soft: var(--hds-color-action-bg-subdued, #e2e4ff);
  --admin-brand-text: var(--hds-color-action-text-solid, #533afd);
  --admin-text: var(--hds-color-text-solid, #061b31);
  --admin-text-soft: var(--hds-color-text-soft, #3c4f69);
  --admin-muted: var(--hds-color-text-subdued, #64748d);
  --admin-muted-2: var(--hds-color-text-quiet, #7d8ba4);
  --admin-success: var(--hds-color-util-success-400, #00b261);
  --admin-warning: var(--hds-color-util-accent-lemon-300, #e8a30b);
  --admin-danger: var(--hds-color-util-error-500, #d8351e);
  --admin-shadow-soft: 0 1px 2px rgba(2, 5, 19, 0.06);
  --admin-radius-sm: 0.75rem;
  --admin-radius-md: 0.875rem;
  --admin-radius-lg: 1rem;
  --admin-radius-pill: 9999px;
} */

html,
body,
#__nuxt {
  height: 100%;
}

body {
  margin: 0;
  color: var(--admin-text);
  background: var(--admin-bg);
  font-family: "DM Sans", var(--hds-font-family, "Inter", "SF Pro Text", "Segoe UI", sans-serif);
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.admin-app-shell {
  min-height: 100vh;
  background: var(--admin-bg);
  color: var(--admin-text);
}

.admin-shell-layout {
  display: flex;
  height: 100vh;
}

.admin-shell-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.admin-topbar.is-hidden {
  display: none;
}

.admin-main {
  position: relative;
  flex: 1;
  overflow-y: auto;
}

.admin-shell-pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 1;
  background: transparent;
}

.admin-main-inner {
  position: relative;
  z-index: 2;
  width: min(100%, 108rem);
  margin-inline: auto;
  padding: 1rem;
}

.a-grid {
  display: grid;
  gap: var(--sp-1, 1.25rem);
}

.a-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface);
  box-shadow: none;
  padding: 1rem;
}

.a-card--soft {
  background: var(--admin-surface-muted);
}

.a-card--hero {
  background: var(--admin-surface);
  border-color: color-mix(in srgb, var(--admin-brand) 14%, var(--admin-border) 86%);
}

.a-eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: var(--fs--1, 0.8rem);
  color: var(--admin-muted);
  font-weight: 600;
}

.a-title {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs-150, 1.75rem);
  line-height: var(--lh-1, 1.2);
  letter-spacing: -0.015em;
  font-weight:600;
}

.a-copy {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--025, 0.95rem);
}

.a-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--admin-border-strong);
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
  background: color-mix(in srgb, var(--admin-surface-muted) 92%, white 8%);
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  letter-spacing: 0.04em;
}

.a-chip--brand {
  background: color-mix(in srgb, var(--admin-brand-soft) 75%, white 25%);
  border-color: color-mix(in srgb, var(--admin-brand) 38%, var(--admin-border) 62%);
  color: var(--admin-brand-text);
}

.a-chip--success {
  background: color-mix(in srgb, var(--admin-success) 10%, #ffffff 90%);
  border-color: color-mix(in srgb, var(--admin-success) 32%, var(--admin-border) 68%);
  color: color-mix(in srgb, var(--admin-success) 78%, black 22%);
}

.a-chip--warning {
  background: color-mix(in srgb, var(--admin-warning) 16%, #ffffff 84%);
  border-color: color-mix(in srgb, var(--admin-warning) 34%, var(--admin-border) 66%);
  color: color-mix(in srgb, var(--admin-warning) 78%, black 22%);
}

.a-chip--danger {
  background: color-mix(in srgb, var(--admin-danger) 10%, #ffffff 90%);
  border-color: color-mix(in srgb, var(--admin-danger) 34%, var(--admin-border) 66%);
  color: color-mix(in srgb, var(--admin-danger) 80%, black 20%);
}

.a-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: var(--admin-radius-pill);
  border: 0;
  background: var(--admin-surface-soft);
  color: var(--admin-text);
  padding: 0.56rem 0.9rem;
  min-height: 2.5rem;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  text-decoration: none;
  transform: translateY(0);
  transition: transform 120ms ease, filter 120ms ease, background 120ms ease, color 120ms ease;
}

.a-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.a-btn:active {
  transform: translateY(0);
  filter: brightness(1);
}

.a-btn:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--admin-brand) 16%, transparent);
}

.a-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.a-btn--primary {
  background: var(--admin-brand);
  color: #ffffff;
}

.a-btn--primary:hover {
  background: var(--admin-brand);
}

.a-btn--ghost {
  background: var(--admin-surface-muted);
  color: var(--admin-text-soft);
}

.a-btn--subtle {
  background: var(--admin-surface-muted);
  color: var(--admin-text);
}

.a-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.a-field__label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: var(--fs--1, 0.8rem);
  color: var(--admin-muted);
  font-weight: 600;
}

.a-input,
.a-select,
.a-textarea {
  width: 100%;
  border-radius: var(--admin-radius-sm);
  border: 1.5px solid var(--admin-border-strong);
  background: var(--admin-surface);
  color: var(--admin-text);
  padding: 0.56rem 0.72rem;
  min-height: 2.5rem;
  font-size: var(--fs--050, 0.9rem);
  transition: border-color 0ms linear, background 0ms linear;
}

.a-input::placeholder,
.a-textarea::placeholder {
  color: var(--admin-muted-2);
}

.a-textarea {
  resize: vertical;
  min-height: 5.25rem;
  line-height: 1.45;
}

.a-input:hover,
.a-select:hover,
.a-textarea:hover {
  border-color: color-mix(in srgb, var(--admin-brand) 22%, var(--admin-border-strong) 78%);
}

.a-input:focus,
.a-select:focus,
.a-textarea:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--admin-brand) 56%, var(--admin-border-strong) 44%);
  box-shadow: none;
  background: var(--admin-surface);
}

.a-input-wrap {
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  padding: 0.55rem 0.72rem;
  min-height: 2.5rem;
  color: var(--admin-muted-2);
  transition: border-color 0ms linear, background 0ms linear;
}

.a-input-wrap:focus-within {
  border-color: color-mix(in srgb, var(--admin-brand) 56%, var(--admin-border-strong) 44%);
  box-shadow: none;
  background: var(--admin-surface);
}

.a-input-wrap .a-input {
  border: 0;
  background: transparent;
  box-shadow: none;
  min-height: 0;
  padding: 0;
}

.a-table-wrap {
  overflow: auto;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
}

.a-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs--075, 0.86rem);
}

.a-table th,
.a-table td {
  text-align: left;
  padding: 0.62rem 0.9rem;
  border-bottom: 1px solid color-mix(in srgb, var(--admin-border) 78%, transparent 22%);
  white-space: nowrap;
}

.a-table thead th {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: var(--fs--1, 0.77rem);
  font-weight: 700;
  color: var(--admin-muted);
  background: var(--admin-surface-muted);
}

.a-table tbody tr {
  transition: background 140ms ease;
}

.a-table tbody tr:hover {
  background: color-mix(in srgb, var(--admin-brand-soft) 16%, var(--admin-surface) 84%);
}

.a-table tbody tr:last-child td {
  border-bottom: 0;
}

.a-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid var(--admin-border-strong);
  padding: 0.18rem 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
}

.a-status--published {
  color: color-mix(in srgb, var(--admin-success) 82%, black 18%);
  background: color-mix(in srgb, var(--admin-success) 11%, white 89%);
  border-color: color-mix(in srgb, var(--admin-success) 34%, var(--admin-border) 66%);
}

.a-status--review {
  color: color-mix(in srgb, var(--admin-brand) 78%, #151b55 22%);
  background: color-mix(in srgb, var(--admin-brand) 11%, white 89%);
  border-color: color-mix(in srgb, var(--admin-brand) 32%, var(--admin-border) 68%);
}

.a-status--draft {
  color: color-mix(in srgb, var(--admin-warning) 86%, #442d0d 14%);
  background: color-mix(in srgb, var(--admin-warning) 17%, white 83%);
  border-color: color-mix(in srgb, var(--admin-warning) 34%, var(--admin-border) 66%);
}

.a-link {
  color: var(--admin-brand-text);
  text-decoration: none;
  font-weight: 600;
}

.a-link:hover {
  color: var(--admin-brand-hover);
}

@media (max-width: 820px) {
  .admin-main-inner {
    padding: 0.72rem;
  }
}
</style>
