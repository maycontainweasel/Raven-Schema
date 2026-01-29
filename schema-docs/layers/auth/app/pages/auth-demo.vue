<script setup lang="ts">
const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)

const refreshAuth = async () => {
  loading.value = true
  error.value = null
  try {
    await auth.refresh()
  } catch (err: any) {
    error.value = err?.message || 'Refresh failed'
  } finally {
    loading.value = false
  }
}

const logout = async () => {
  loading.value = true
  error.value = null
  try {
    await auth.logout(null)
  } catch (err: any) {
    error.value = err?.message || 'Logout failed'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshAuth()
})
</script>

<template>
  <div style="max-width: 720px; margin: 2rem auto; padding: 1.5rem; font-family: system-ui, -apple-system, sans-serif;">
    <h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem;">Auth Demo</h1>
    <p style="margin-bottom: 1rem; color: #555;">
      This page is public. Use it to test auth state, refresh, and navigation to protected routes.
    </p>

    <div style="display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap;">
      <button @click="refreshAuth" :disabled="loading" style="padding: 0.5rem 0.75rem;">
        Refresh /me
      </button>
      <button @click="logout" :disabled="loading" style="padding: 0.5rem 0.75rem;">
        Logout
      </button>
      <NuxtLink to="/auth-demo/protected" style="padding: 0.5rem 0.75rem; text-decoration: underline;">
        Go to protected page
      </NuxtLink>
    </div>

    <div v-if="error" style="color: #b00020; margin-bottom: 1rem;">
      {{ error }}
    </div>

    <div style="background: #f7f7f7; border-radius: 8px; padding: 1rem;">
      <div><strong>Authenticated:</strong> {{ auth.isAuthenticated }}</div>
      <div><strong>User:</strong> {{ auth.user?.email || '—' }}</div>
      <div><strong>Role:</strong> {{ auth.user?.role?.value || auth.user?.role || '—' }}</div>
    </div>
  </div>
</template>
