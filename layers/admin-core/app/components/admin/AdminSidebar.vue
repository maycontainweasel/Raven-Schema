<script setup lang="ts">
type AdminNavItem = {
  id: string
  label: string
  to?: string
  icon?: string
  badge?: string
  defaultOpen?: boolean
  children?: AdminNavItem[]
}

const props = defineProps<{ collapsed: boolean }>()

const { sections } = useAdminNav()

const buildOpenState = () => {
  const state: Record<string, boolean> = {}
  sections.forEach((section) => {
    section.items.forEach((item) => {
      if (item.children?.length) {
        state[item.id] = item.defaultOpen ?? false
      }
    })
  })
  return state
}

const openGroups = ref<Record<string, boolean>>(buildOpenState())

const toggleGroup = (item: AdminNavItem) => {
  if (!item.children?.length) return
  openGroups.value[item.id] = !openGroups.value[item.id]
}

const isOpen = (item: AdminNavItem) => {
  if (!item.children?.length) return false
  return !!openGroups.value[item.id]
}

const resolveDefaultChild = (item: AdminNavItem) => {
  if (!item.children?.length) return item.to || '#'
  const overview = item.children.find((child) =>
    String(child.id).toLowerCase().includes('overview') ||
    String(child.label).toLowerCase().includes('overview')
  )
  const target = overview ?? item.children[0]
  return target?.to || item.to || '#'
}

const hoveredItem = ref<AdminNavItem | null>(null)
const hoveredRect = ref<{ top: number; left: number }>({ top: 0, left: 0 })
let hoverTimer: ReturnType<typeof setTimeout> | undefined

const setHoverItem = (item: AdminNavItem, event: MouseEvent) => {
  if (!props.collapsed) return
  if (hoverTimer) clearTimeout(hoverTimer)
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  hoveredItem.value = item
  hoveredRect.value = { top: rect.top + 4, left: rect.right + 12 }
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
  <aside class="sidebar" :class="collapsed ? 'sidebar--collapsed' : ''">
    <div class="sidebar-header">
      <div class="logo-container relative h-10 w-40">
        <Logo
          v-if="!collapsed"
          class="logo-text transition-all duration-200"
        />
        <LogoIcon
          v-else
          class="logo-icon transition-all duration-200"
        />
      </div>
    </div>

    <div class="sidebar-scroll">
      <template v-for="section in sections" :key="section.id">
        <div class="mt-4">
          <div v-if="!collapsed" class="sidebar-section-title">
            {{ section.label }}
          </div>
          <div v-else class="flex items-center justify-center py-2 text-[10px] text-muted">
            <span class="h-[1px] w-6 app-surface-muted"></span>
          </div>
        </div>

        <ul class="sidebar-nav">
          <li
            v-for="item in section.items"
            :key="item.id"
            class="group relative overflow-visible"
            @mouseenter="setHoverItem(item, $event)"
            @mouseleave="clearHoverItem"
          >
            <template v-if="item.children?.length">
              <NuxtLink
                v-if="collapsed"
                class="sidebar-link justify-center"
                :to="resolveDefaultChild(item)"
              >
                <Icon :name="item.icon || 'dashboard'" />
              </NuxtLink>

              <button
                v-else
                class="sidebar-link"
                @click="toggleGroup(item)"
                type="button"
              >
                <span class="flex items-center gap-3">
                  <Icon :name="item.icon || 'dashboard'" />
                  <span class="truncate">{{ item.label }}</span>
                </span>
                <Icon
                  name="chevron"
                  :class="isOpen(item) ? 'rotate-180' : ''"
                  class="transition-transform"
                />
              </button>

              <div
                v-if="!collapsed"
                class="sidebar-sublist"
                :class="isOpen(item) ? 'sidebar-sublist--open' : 'sidebar-sublist--closed'"
              >
                <ul class="space-y-1 py-1">
                  <li v-for="child in item.children" :key="child.id">
                    <NuxtLink class="sidebar-subitem" :to="child.to || '#'">
                      {{ child.label }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>

            </template>

            <template v-else>
              <NuxtLink
                class="sidebar-link"
                :class="collapsed ? 'justify-center' : ''"
                :to="item.to || '#'"
              >
                <Icon :name="item.icon || 'dashboard'" />
                <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
              </NuxtLink>

            </template>
          </li>
        </ul>
      </template>
    </div>

    <div class="sidebar-footer">
      <div v-if="!collapsed" class="flex items-center justify-between">
        <span>© 2026 mpd-admin</span>
        <span class="badge badge-ghost">Light</span>
      </div>
      <div v-else class="flex items-center justify-center">©</div>
    </div>
  </aside>

  <Teleport to="body">
    <div
      v-if="collapsed && hoveredItem"
      class="fixed z-[999] w-56"
      :style="{ top: `${hoveredRect.top}px`, left: `${hoveredRect.left}px` }"
      @mouseenter="holdHoverItem"
      @mouseleave="releaseHoverItem"
    >
      <div class="sidebar-popover pointer-events-auto rounded-xl bg-white app-border p-3 shadow-xl">
        <p class="sidebar-popover-title text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {{ hoveredItem.label }}
        </p>
        <ul class="mt-2 space-y-1">
          <template v-if="hoveredItem.children?.length">
            <li v-for="child in hoveredItem.children" :key="child.id">
              <NuxtLink class="sidebar-subitem" :to="child.to || '#'">
                {{ child.label }}
              </NuxtLink>
            </li>
          </template>
          <template v-else>
            <li>
              <NuxtLink class="sidebar-subitem" :to="hoveredItem.to || '#'">
                {{ hoveredItem.label }}
              </NuxtLink>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </Teleport>
</template>


<style scoped lang="scss">
.logo-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;

  .logo-text {
    max-height: 100%;
    width: 136px;
  }

  .logo-icon {
    display: block;
  }
}
</style>
