<script setup lang="ts">
const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ (e: 'toggle'): void }>()

const router = useRouter()
const authStore = useAuthStore()
const displayName = computed(() => authStore.getFirstName || authStore.userDisplayName || 'User')
const initials = computed(() => authStore.userInitials || 'U')

const handleLogout = async () => {
  await authStore.logout('/login')
}
</script>

<template>
  <header class="topbar sticky top-0 z-10">
    <div class="flex h-full items-center justify-between w-full">
      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('toggle')">
          <Icon name="menu" />
        </button>
        <span v-if="displayName" class="text-xs uppercase tracking-[0.25em] text-muted hidden sm:inline-flex">
          Welcome, {{ displayName }}
        </span>
      </div>

      <div class="flex items-center gap-3">
        <button class="btn btn-ghost btn-sm" type="button">
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Search</span>
        </button>
        <details class="dropdown">
          <summary class="flex h-9 w-9 items-center justify-center rounded-full app-surface-muted text-xs font-semibold">
            {{ initials }}
          </summary>
          <div class="dropdown-menu">
            <button class="dropdown-item" type="button" @click="router.push('/settings')">Settings</button>
            <button class="dropdown-item" type="button" @click="handleLogout">Logout</button>
          </div>
        </details>
      </div>
    </div>
  </header>
</template>
