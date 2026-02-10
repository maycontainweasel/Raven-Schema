<script setup lang="ts">
import APasswordInput from './APasswordInput.vue'

const emit = defineEmits<{
  matchChange: [matches: boolean]
}>()

const password = defineModel<string>('password', { default: '' })
const confirmPassword = defineModel<string>('confirmPassword', { default: '' })

const props = withDefaults(
  defineProps<{
    passwordLabel?: string
    confirmLabel?: string
    passwordPlaceholder?: string
    confirmPlaceholder?: string
    passwordAutoComplete?: string
    confirmAutoComplete?: string
    mismatchText?: string
    matchText?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    passwordLabel: 'Password',
    confirmLabel: 'Confirm Password',
    passwordPlaceholder: 'Enter password',
    confirmPlaceholder: 'Re-enter password',
    passwordAutoComplete: 'new-password',
    confirmAutoComplete: 'new-password',
    mismatchText: 'Passwords do not match',
    matchText: 'Passwords match!',
    required: false,
    disabled: false,
  },
)

const passwordsMatch = computed(() => (
  password.value.length > 0
  && confirmPassword.value.length > 0
  && password.value === confirmPassword.value
))

const showMismatch = computed(() => (
  confirmPassword.value.length > 0
  && password.value !== confirmPassword.value
))

watch(passwordsMatch, (value) => {
  emit('matchChange', value)
}, { immediate: true })
</script>

<template>
  <div class="a-password-confirm">
    <APasswordInput
      v-model="password"
      :label="props.passwordLabel"
      :placeholder="props.passwordPlaceholder"
      :auto-complete="props.passwordAutoComplete"
      :required="props.required"
      :disabled="props.disabled"
    />

    <APasswordInput
      v-model="confirmPassword"
      :label="props.confirmLabel"
      :placeholder="props.confirmPlaceholder"
      :auto-complete="props.confirmAutoComplete"
      :required="props.required"
      :disabled="props.disabled"
      :error-text="showMismatch ? props.mismatchText : ''"
      :helper-text="passwordsMatch ? props.matchText : ''"
    >
      <template #label-prefix>
        <i
          v-if="passwordsMatch"
          class="i-lucide-check h-4 w-4 text-[color:#16a34a]"
          aria-hidden="true"
        />
        <i
          v-else-if="showMismatch"
          class="i-lucide-x h-4 w-4 text-[color:#dc2626]"
          aria-hidden="true"
        />
      </template>
    </APasswordInput>
  </div>
</template>

<style scoped>
.a-password-confirm {
  display: grid;
  gap: 0.52rem;
}
</style>
