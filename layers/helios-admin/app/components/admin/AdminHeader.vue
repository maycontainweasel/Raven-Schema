<script setup lang="ts">
const emit = defineEmits<{ (event: 'toggle'): void }>()

const router = useRouter()
const authStore = useAuthStore()

const displayName = computed(() => authStore.getFirstName || authStore.userDisplayName || 'Guest')
const initials = computed(() => authStore.userInitials || 'G')
const isAuthenticated = computed(() => Boolean(authStore.isAuthenticated))

const handleLogout = async () => {
  try {
    await authStore.logout('/login')
  }
  catch (error) {
    console.error('Logout failed', error)
  }
}

const handleLogin = async () => {
  await router.push('/login')
}
</script>

<template>
  <header class="admin-topbar">
    <div class="admin-topbar__inner">
      <div class="admin-topbar__left">
        <button class="a-btn a-btn--ghost admin-topbar__toggle" type="button" @click="emit('toggle')" title="Toggle sidebar">
          <AdminIcon name="menu" />
        </button>
        <span class="admin-topbar__label">
          Admin Workspace
        </span>
      </div>

      <div class="admin-topbar__right">
        <label class="admin-search">
          <AdminIcon name="search" :size="16" />
          <input type="search" placeholder="Search" />
        </label>

        <button class="a-btn a-btn--ghost admin-action-btn" type="button" title="Apps">
          <AdminIcon name="grid" :size="16" />
        </button>

        <button class="a-btn a-btn--ghost admin-action-btn" type="button" title="Help">
          <AdminIcon name="help" :size="16" />
        </button>

        <button class="a-btn a-btn--ghost admin-action-btn" type="button" title="Notifications">
          <AdminIcon name="bell" :size="16" />
        </button>

        <details class="admin-dropdown">
          <summary class="admin-dropdown__summary">
            <span class="admin-avatar">{{ initials }}</span>
          </summary>
          <div class="admin-dropdown__menu">
            <p class="admin-dropdown__label">{{ displayName }}</p>
            <button class="admin-dropdown__item" type="button" @click="router.push('/settings')">
              <AdminIcon name="settings" :size="16" />
              Settings
            </button>
            <button
              v-if="isAuthenticated"
              class="admin-dropdown__item"
              type="button"
              @click="handleLogout"
            >
              <AdminIcon name="logout" :size="16" />
              Logout
            </button>
            <button
              v-else
              class="admin-dropdown__item"
              type="button"
              @click="handleLogin"
            >
              <AdminIcon name="login" :size="16" />
              Login
            </button>
          </div>
        </details>
      </div>
    </div>
  </header>
</template>

<style scoped>
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 120;
  height: 3.85rem;
  border-bottom: 1px solid var(--admin-border);
  background: color-mix(in srgb, var(--admin-surface) 92%, white 8%);
  backdrop-filter: blur(8px);
}

.admin-topbar__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.9rem;
}

.admin-topbar__left {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.admin-topbar__toggle {
  width: 2.15rem;
  min-height: 2.15rem;
  padding: 0;
}

.admin-topbar__label {
  font-size: var(--fs--075, 0.86rem);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--admin-muted);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-topbar__right {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.admin-search {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  width: min(18.5rem, 42vw);
  min-height: 2.2rem;
  border-radius: 0.72rem;
  border: 1px solid var(--admin-border-strong);
  background: color-mix(in srgb, var(--admin-surface-muted) 82%, white 18%);
  color: var(--admin-muted-2);
  padding: 0 0.65rem;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.admin-search:focus-within {
  border-color: color-mix(in srgb, var(--admin-brand) 62%, var(--admin-border-strong) 38%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--admin-brand) 18%, transparent);
  background: var(--admin-surface);
}

.admin-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
}

.admin-search input::placeholder {
  color: var(--admin-muted-2);
}

.admin-action-btn {
  width: 2.15rem;
  min-height: 2.15rem;
  padding: 0;
}

.admin-dropdown {
  position: relative;
}

.admin-dropdown__summary {
  list-style: none;
  cursor: pointer;
}

.admin-dropdown__summary::-webkit-details-marker {
  display: none;
}

.admin-avatar {
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--admin-border-strong);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--admin-brand-soft) 64%, white 36%) 0%,
    color-mix(in srgb, var(--admin-brand-soft) 78%, var(--admin-surface) 22%) 100%
  );
  color: var(--admin-text);
  font-size: var(--fs--075, 0.85rem);
  font-weight: 800;
}

.admin-dropdown__menu {
  position: absolute;
  top: calc(100% + 0.42rem);
  right: 0;
  min-width: 12.5rem;
  border: 1px solid var(--admin-border-strong);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--admin-surface) 96%, white 4%);
  box-shadow: 0 18px 34px rgba(17, 32, 62, 0.16);
  padding: 0.45rem;
  z-index: 700;
}

.admin-dropdown__label {
  margin: 0;
  padding: 0.4rem 0.55rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  color: var(--admin-muted);
}

.admin-dropdown__item {
  width: 100%;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  text-align: left;
  padding: 0.5rem 0.55rem;
  cursor: pointer;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  transition: border-color 140ms ease, background 140ms ease, color 140ms ease;
}

.admin-dropdown__item:hover {
  background: color-mix(in srgb, var(--admin-brand-soft) 42%, var(--admin-surface) 58%);
  border-color: color-mix(in srgb, var(--admin-brand) 28%, var(--admin-border) 72%);
  color: var(--admin-text);
}

@media (max-width: 940px) {
  .admin-topbar__label {
    display: none;
  }

  .admin-search {
    width: min(14rem, 52vw);
  }
}

@media (max-width: 760px) {
  .admin-search {
    width: 10.5rem;
  }

  .admin-action-btn {
    display: none;
  }
}
</style>
