<script setup lang="ts">
import { markRaw, shallowRef, type Component } from 'vue'
import type { AdminNavItem, AdminNavSection } from '~/app/types/admin-nav'
import AdminSidebarBrandOpen from './branding/AdminSidebarBrandOpen.vue'
import AdminSidebarBrandCollapsed from './branding/AdminSidebarBrandCollapsed.vue'

const props = defineProps<{ collapsed: boolean }>()

const appExpandedLogoModules = import.meta.glob([
  '@/components/branding/logos/Logo.vue',
  '@/components/admin/branding/logos/Logo.vue',
  '@/components/branding/Logo.vue',
  '@/components/admin/Logo.vue',
])

const appCollapsedLogoModules = import.meta.glob([
  '@/components/branding/logos/LogoIcon.vue',
  '@/components/admin/branding/logos/LogoIcon.vue',
  '@/components/branding/LogoIcon.vue',
  '@/components/admin/LogoIcon.vue',
])

const loadFirstLogoComponent = async (modules: Record<string, () => Promise<unknown>>) => {
  const [first] = Object.keys(modules)
  if (!first) return null

  try {
    const loaded = await modules[first]()
    const component = (loaded as any)?.default ?? loaded
    if (typeof component === 'object' || typeof component === 'function') {
      return component as Component
    }
  }
  catch (error) {
    console.error(`[admin-sidebar] failed loading logo override: ${first}`, error)
  }

  return null
}

const expandedLogoComponent = shallowRef<Component>(markRaw(AdminLogo))
const collapsedLogoComponent = shallowRef<Component>(markRaw(AdminLogoIcon))

const expandedOverride = await loadFirstLogoComponent(appExpandedLogoModules)
if (expandedOverride) {
  expandedLogoComponent.value = markRaw(expandedOverride)
}

const collapsedOverride = await loadFirstLogoComponent(appCollapsedLogoModules)
if (collapsedOverride) {
  collapsedLogoComponent.value = markRaw(collapsedOverride)
}
else if (expandedOverride) {
  collapsedLogoComponent.value = markRaw(expandedOverride)
}

const route = useRoute()
const fallbackConfig = useAdminNav()
const { data: navState } = await useFetch('/api/admin/nav', {
  default: () => ({
    ok: true,
    source: 'default',
    config: fallbackConfig,
  }),
})

const sections = computed<AdminNavSection[]>(() => {
  const candidate = navState.value?.config?.sections
  if (Array.isArray(candidate) && candidate.length) return candidate as AdminNavSection[]
  return fallbackConfig.sections
})

const buildOpenState = (sectionList: AdminNavSection[]) => {
  const state: Record<string, boolean> = {}
  sectionList.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children?.length) {
        state[item.id] = item.defaultOpen ?? false
      }
    })
  })
  return state
}

const openGroups = ref<Record<string, boolean>>({})
const hoveredItem = ref<AdminNavItem | null>(null)
const hoveredRect = ref<{ top: number; left: number }>({ top: 0, left: 0 })
let hoverTimer: ReturnType<typeof setTimeout> | undefined

watch(
  sections,
  (nextSections) => {
    const nextState = buildOpenState(nextSections)
    for (const [groupId, isOpenState] of Object.entries(openGroups.value)) {
      if (groupId in nextState) nextState[groupId] = isOpenState
    }
    openGroups.value = nextState
  },
  { immediate: true, deep: true },
)

const isRouteActive = (to?: string) => {
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const resolveNavTo = (item?: AdminNavItem) => {
  if (!item?.to) return '#'
  if (item.query && Object.keys(item.query).length) {
    return {
      path: item.to,
      query: item.query,
    }
  }
  return item.to
}

const isItemActive = (item: AdminNavItem) => {
  if (isRouteActive(item.to)) return true
  if (item.children?.length) {
    return item.children.some((child) => isRouteActive(child.to))
  }
  return false
}

const toggleGroup = (item: AdminNavItem) => {
  if (!item.children?.length) return
  openGroups.value[item.id] = !openGroups.value[item.id]
}

const isOpen = (item: AdminNavItem) => {
  if (!item.children?.length) return false
  return !!openGroups.value[item.id]
}

const resolveDefaultChild = (item: AdminNavItem) => {
  if (!item.children?.length) return resolveNavTo(item)
  const overview = item.children.find((child) =>
    String(child.id).toLowerCase().includes('overview') ||
    String(child.label).toLowerCase().includes('overview'),
  )
  return resolveNavTo(overview || item.children[0])
}

const setHoverItem = (item: AdminNavItem, event: MouseEvent) => {
  if (!props.collapsed) return
  if (hoverTimer) clearTimeout(hoverTimer)

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  hoveredItem.value = item
  hoveredRect.value = {
    top: rect.top + 2,
    left: rect.right + 12,
  }
}

const clearHoverItem = () => {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => {
    hoveredItem.value = null
  }, 160)
}

const holdHoverItem = () => {
  if (hoverTimer) clearTimeout(hoverTimer)
}

const releaseHoverItem = () => {
  hoveredItem.value = null
}
</script>

<template>
  <aside class="admin-sidebar" :class="props.collapsed ? 'admin-sidebar--collapsed' : ''">
    <div class="admin-sidebar__header">
      <div class="admin-sidebar__brand" :class="props.collapsed ? 'is-collapsed' : ''">
        <AdminSidebarBrandOpen
          v-if="!props.collapsed"
          class="admin-sidebar__brand-open"
        />
        <AdminSidebarBrandCollapsed
          v-else
          class="admin-sidebar__brand-collapsed"
        />
      </div>
    </div>

    <div class="admin-sidebar__scroll">
      <template v-for="section in sections" :key="section.id">
        <div class="admin-sidebar__section">
          <p v-if="!props.collapsed" class="admin-sidebar__section-label">
            {{ section.label || section.id }}
          </p>
          <div v-else class="admin-sidebar__section-divider">
            <span />
          </div>

          <ul class="admin-sidebar__list">
            <li
              v-for="item in section.items"
              :key="item.id"
              class="admin-sidebar__item"
              @mouseenter="setHoverItem(item, $event)"
              @mouseleave="clearHoverItem"
            >
              <template v-if="item.children?.length">
                <NuxtLink
                  v-if="props.collapsed"
                  class="admin-sidebar__link"
                  :class="isItemActive(item) ? 'is-active is-collapsed' : 'is-collapsed'"
                  :to="resolveDefaultChild(item)"
                  :title="item.label"
                >
                  <AdminIcon :name="item.icon || 'dashboard'" />
                </NuxtLink>

                <button
                  v-else
                  class="admin-sidebar__link"
                  :class="isItemActive(item) ? 'is-active' : ''"
                  type="button"
                  @click="toggleGroup(item)"
                >
                  <span class="admin-sidebar__lead">
                    <AdminIcon :name="item.icon || 'dashboard'" />
                    <span class="truncate">{{ item.label }}</span>
                  </span>
                  <AdminIcon name="chevron" class="transition-transform duration-150" :class="isOpen(item) ? 'rotate-180' : ''" />
                </button>

                <div
                  v-if="!props.collapsed"
                  class="admin-sidebar__sublist"
                  :class="isOpen(item) ? 'is-open' : 'is-closed'"
                >
                  <ul class="admin-sidebar__sublist-inner">
                    <li v-for="child in item.children" :key="child.id">
                      <NuxtLink
                        class="admin-sidebar__sublink"
                        :class="isRouteActive(child.to) ? 'is-active' : ''"
                        :to="resolveNavTo(child)"
                      >
                        {{ child.label }}
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
              </template>

              <template v-else>
                <NuxtLink
                  class="admin-sidebar__link"
                  :class="[
                    isItemActive(item) ? 'is-active' : '',
                    props.collapsed ? 'is-collapsed' : '',
                  ]"
                  :to="resolveNavTo(item)"
                >
                  <AdminIcon :name="item.icon || 'dashboard'" />
                  <span v-if="!props.collapsed" class="truncate">{{ item.label }}</span>
                </NuxtLink>
              </template>
            </li>
          </ul>
        </div>
      </template>
    </div>

    <div class="admin-sidebar__footer">
      <div v-if="!props.collapsed" class="admin-sidebar__footer-row">
        <span class="f--1 text-[var(--admin-muted)]">Helios V1</span>
        <span class="admin-chip">Uno</span>
      </div>
      <div v-else class="flex items-center justify-center f--1 text-[var(--admin-muted)]">V1</div>
    </div>
  </aside>

  <Teleport to="body">
    <div
      v-if="props.collapsed && hoveredItem"
      class="fixed z-[1200] w-[15rem]"
      :style="{ top: `${hoveredRect.top}px`, left: `${hoveredRect.left}px` }"
      @mouseenter="holdHoverItem"
      @mouseleave="releaseHoverItem"
    >
      <div class="admin-popover">
        <p class="admin-popover__title">{{ hoveredItem.label }}</p>
        <ul class="admin-popover__links">
          <template v-if="hoveredItem.children?.length">
            <li v-for="child in hoveredItem.children" :key="child.id">
              <NuxtLink
                class="admin-sidebar__sublink"
                :class="isRouteActive(child.to) ? 'is-active' : ''"
                :to="resolveNavTo(child)"
              >
                {{ child.label }}
              </NuxtLink>
            </li>
          </template>
          <template v-else>
            <li>
              <NuxtLink class="admin-sidebar__sublink" :to="resolveNavTo(hoveredItem)">
                {{ hoveredItem.label }}
              </NuxtLink>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.admin-sidebar {
  width: 17.25rem;
  max-width: 17.25rem;
  height: 100vh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid color-mix(in srgb, var(--admin-border) 90%, white 10%);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--admin-surface) 96%, white 4%) 0%,
      color-mix(in srgb, var(--admin-surface) 92%, var(--admin-bg) 8%) 100%
    );
  transition: width 180ms ease, box-shadow 180ms ease;
  /* box-shadow: inset -1px 0 0 color-mix(in srgb, var(--admin-border) 78%, transparent); */
}

.admin-sidebar--collapsed {
  width: 4.5rem;
  max-width: 4.5rem;
}

.admin-sidebar__header {
  padding: 0.85rem 0.8rem;
  min-height: 4rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--admin-border) 65%, transparent);
}

.admin-sidebar__brand {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.admin-sidebar__brand.is-collapsed {
  justify-content: center;
}

.admin-sidebar__brand-open {
  display: block;
  width: 8.65rem;
  max-width: 100%;
  height: auto;
}

.admin-sidebar__brand-collapsed {
  display: block;
  width: 2.25rem;
  height: 2.25rem;
}

.admin-sidebar__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: visible;
  padding: 0.65rem 0.5rem;
}

.admin-sidebar__section {
  margin-top: var(--v-1, 1.4rem);
}

.admin-sidebar__section:first-child {
  margin-top: 0;
}

.admin-sidebar__section-label {
  margin: 0;
  padding: 0 0.5rem;
  font-size: var(--fs--1, 0.76rem);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--admin-muted);
}

.admin-sidebar__section-divider {
  display: flex;
  justify-content: center;
  padding: 0.3rem 0;
}

.admin-sidebar__section-divider span {
  display: block;
  width: 1.4rem;
  height: 1px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--admin-border) 80%, transparent);
}

.admin-sidebar__list {
  margin: 0;
  padding: 0.2rem 0 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.admin-sidebar__item {
  position: relative;
}

.admin-sidebar__lead {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: var(--sp-050, 0.9rem);
}

.admin-sidebar__link {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-050, 0.9rem);
  border: 1px solid transparent;
  background: transparent;
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-pill);
  padding: 0.48rem 0.58rem;
  text-decoration: none;
  font-size: var(--fs--050, 0.92rem);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease, transform 120ms ease;
}

.admin-sidebar__link::after {
  content: "";
  position: absolute;
  inset: -40%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.36) 0%, rgba(255, 255, 255, 0) 66%);
  opacity: 0;
  transform: scale(0.45);
  transition: opacity 180ms ease, transform 300ms ease;
}

.admin-sidebar__link:hover {
  color: var(--admin-text);
  /* background: color-mix(in srgb, var(--admin-brand-soft) 42%, var(--admin-surface) 58%); */
  background: var(--colors-slate-50);
  /* border-color: color-mix(in srgb, var(--admin-brand) 26%, var(--admin-border) 74%); */
  border-color: var(--colors-slate-200);
  transform: translateY(-1px);
}

.admin-sidebar__link:active {
  transform: translateY(0);
}

.admin-sidebar__link:active::after {
  opacity: 1;
  transform: scale(1);
}

.admin-sidebar__link.is-active {
  color: var(--admin-text);
  /* border-color: color-mix(in srgb, var(--admin-brand) 44%, var(--admin-border) 56%); */
  /* background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--admin-brand-soft) 78%, var(--admin-surface) 22%) 0%,
      color-mix(in srgb, var(--admin-surface) 96%, white 4%) 100%
    ); */
  /* box-shadow: 0 2px 10px rgba(34, 60, 120, 0.08); */
  background: var(--colors-slate-100);
}

.admin-sidebar__link.is-collapsed {
  justify-content: center;
  padding: 0.58rem 0.4rem;
}

.admin-sidebar__sublist {
  margin-left: 1.2rem;
  margin-top: 0.25rem;
  padding-left: 0.82rem;
  border-left: 1px solid var(--admin-border);
  overflow: hidden;
  transition: max-height 180ms ease, opacity 180ms ease, transform 180ms ease;
}

.admin-sidebar__sublist-inner {
  margin: 0;
  padding: 0.2rem 0;
  list-style: none;
  display: grid;
  gap: 0.18rem;
}

.admin-sidebar__sublist.is-open {
  max-height: 16rem;
  opacity: 1;
  transform: translateY(0);
}

.admin-sidebar__sublist.is-closed {
  max-height: 0;
  opacity: 0;
  transform: translateY(-0.2rem);
}

.admin-sidebar__sublink {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: block;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  color: var(--admin-text-soft);
  padding: 0.38rem 0.56rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}

.admin-sidebar__sublink::after {
  content: "";
  position: absolute;
  inset: -45%;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0) 65%);
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 180ms ease, transform 300ms ease;
}

.admin-sidebar__sublink:hover {
  color: var(--admin-text);
  /* background: color-mix(in srgb, var(--admin-brand-soft) 38%, var(--admin-surface) 62%); */
  background: var(--colors-slate-50);
  /* border-color: color-mix(in srgb, var(--admin-brand) 24%, var(--admin-border) 76%); */
  border-color: var(--colors-slate-200);
  transform: translateY(-1px);
  &:active {
    transform: translateY(0);
  }
}

.admin-sidebar__sublink.is-active {
  color: var(--admin-text);
  /* border-color: color-mix(in srgb, var(--admin-brand) 36%, var(--admin-border) 64%); */
  border-color: var(--colors-slate-50);
  /* background: color-mix(in srgb, var(--admin-brand-soft) 62%, var(--admin-surface) 38%); */
  /* background: var(--colors-slate-100); */
  background: var(--colors-slate-50);
}

.admin-sidebar__sublink:active::after {
  opacity: 1;
  transform: scale(1);
}

.admin-sidebar__footer {
  padding: 0.55rem 0.72rem;
  border-top: 1px solid color-mix(in srgb, var(--admin-border) 70%, transparent);
}

.admin-sidebar__footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.admin-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--admin-border-strong);
  border-radius: 999px;
  padding: 0.16rem 0.52rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-muted);
  background: color-mix(in srgb, var(--admin-surface-muted) 90%, white 10%);
  font-weight: 600;
}

.admin-popover {
  border: 1px solid var(--admin-border-strong);
  border-radius: 0.92rem;
  background: color-mix(in srgb, var(--admin-surface) 96%, white 4%);
  box-shadow: 0 20px 38px rgba(16, 29, 56, 0.16);
  padding: 0.62rem;
}

.admin-popover__title {
  margin: 0;
  font-size: var(--fs--1, 0.74rem);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--admin-muted);
  font-weight: 700;
}

.admin-popover__links {
  margin: 0.35rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.18rem;
}
</style>
