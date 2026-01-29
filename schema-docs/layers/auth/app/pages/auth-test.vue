<script setup lang="ts">
// Auth test page (layer)
const loginEmail = ref('')
const loginPassword = ref('')

const registerEmail = ref('')
const registerPassword = ref('')
const registerFirstName = ref('')
const registerSurname = ref('')

const activeTab = ref('login')
const loading = ref(false)
const error = ref('')
const authStore = useAuthStore()
const user = computed(() => (authStore.isAuthenticated ? authStore.user : null))

async function handleLogin() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: loginEmail.value, password: loginPassword.value }),
    })

    const result = await response.json()

    if (result.ok) {
      if (result.userRecord) {
        authStore.setUser(result.userRecord)
      } else {
        await authStore.refresh()
      }
    } else {
      error.value = result.error || 'Login failed'
    }
  } catch (err: any) {
    error.value = err?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: registerEmail.value,
        password: registerPassword.value,
        firstName: registerFirstName.value,
        surname: registerSurname.value,
      }),
    })

    const result = await response.json()

    if (result.ok) {
      if (result.userRecord) {
        authStore.setUser(result.userRecord)
      } else {
        await authStore.refresh()
      }
      activeTab.value = 'login'
    } else {
      error.value = result.error || 'Registration failed'
    }
  } catch (err: any) {
    error.value = err?.message || 'Registration failed'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  loading.value = true
  try {
    await authStore.logout(null)
    error.value = ''
  } catch (err: any) {
    error.value = err?.message || 'Logout failed'
  } finally {
    loading.value = false
  }
}

async function checkSession() {
  loading.value = true
  try {
    await authStore.refresh()
    error.value = ''
  } catch (err: any) {
    error.value = err?.message || 'Failed to check session'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void checkSession()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4">
      <div class="max-w-md mx-auto">
        <h1 class="text-2xl font-bold text-center mb-8 text-gray-800">
          Auth Test Page
        </h1>

        <div class="flex mb-6 bg-white rounded-lg p-1 shadow-sm">
          <button
            @click="activeTab = 'login'"
            :class="activeTab === 'login'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-800'"
            class="flex-1 px-4 py-2 text-center font-medium rounded-md transition-all duration-200"
          >
            Login
          </button>
          <button
            @click="activeTab = 'register'"
            :class="activeTab === 'register'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-800'"
            class="flex-1 px-4 py-2 text-center font-medium rounded-md transition-all duration-200"
          >
            Register
          </button>
        </div>

        <div v-if="activeTab === 'login'" class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-center mb-6">Welcome Back</h2>
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="loginEmail"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                v-model="loginPassword"
                type="password"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
        </div>

        <div v-if="activeTab === 'register'" class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-center mb-6">Create Account</h2>
          <form @submit.prevent="handleRegister" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  v-model="registerFirstName"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="First name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                <input
                  v-model="registerSurname"
                  type="text"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Surname"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="registerEmail"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                v-model="registerPassword"
                type="password"
                required
                minlength="6"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Minimum 6 characters"
              />
            </div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {{ loading ? 'Creating account...' : 'Create Account' }}
            </button>
          </form>
        </div>

        <div v-if="error" class="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          <p class="text-sm">{{ error }}</p>
        </div>

        <div v-if="user" class="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 class="text-green-800 font-semibold mb-2">Authenticated</h3>
          <div class="space-y-1 text-sm text-green-700">
            <p><strong>User ID:</strong> {{ user.id || 'N/A' }}</p>
            <p><strong>Name:</strong> {{ user.firstName || 'N/A' }} {{ user.surname || 'N/A' }}</p>
            <p><strong>Email:</strong> {{ user.email || 'N/A' }}</p>
            <p><strong>Role:</strong> {{ user.role?.label || user.role?.value || 'N/A' }}</p>
          </div>
          <div class="mt-4 flex gap-2">
            <button
              @click="checkSession()"
              :disabled="loading"
              class="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors duration-200"
            >
              Refresh Session
            </button>
            <button
              @click="handleLogout()"
              :disabled="loading"
              class="bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 class="text-blue-800 font-semibold mb-2">Session Status</h3>
          <p class="text-sm text-blue-700">
            Status: {{ user ? 'Authenticated' : 'Not authenticated' }}
          </p>
        </div>

        <div class="mt-4 text-center">
          <button
            @click="checkSession()"
            :disabled="loading"
            class="text-blue-600 hover:text-blue-800 text-sm underline disabled:opacity-50"
          >
            Check Session Status
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
