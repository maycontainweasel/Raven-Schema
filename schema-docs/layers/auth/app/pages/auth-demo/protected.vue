<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
</script>

<template>
  <div style="max-width: 720px; margin: 2rem auto; padding: 1.5rem; font-family: system-ui, -apple-system, sans-serif;">
    <h1 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem;">Protected Page</h1>
    <p style="margin-bottom: 1rem; color: #555;">You should only see this if auth guard passes.</p>

    <div style="background: #f7f7f7; border-radius: 8px; padding: 1rem;">
      <div><strong>User:</strong> {{ auth.user?.email || '—' }}</div>
      <div><strong>Role:</strong> {{ auth.user?.role?.value || auth.user?.role || '—' }}</div>
    </div>

    <NuxtLink to="/auth-demo" style="display: inline-block; margin-top: 1rem; text-decoration: underline;">
      Back to auth demo
    </NuxtLink>
  </div>
</template>
