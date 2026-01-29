<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const sidebarCollapsed = useState('adminSidebarCollapsed', () => false)

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
  <div class="app-shell">
    <div class="flex h-screen">
      <AdminSidebar :collapsed="sidebarCollapsed" />

      <div class="flex min-w-0 flex-1 flex-col">
        <AdminHeader :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />

        <main class="relative flex-1 overflow-y-auto">
          <div
            class="pointer-events-none absolute inset-0 opacity-70 z-0 bg-[var(--bg-gray-2)]"
            style=""
          ></div>
          <div class="relative z-10 px-6 py-6">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>
