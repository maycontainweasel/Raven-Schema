<script setup lang="ts">
import APasswordInput from './APasswordInput.vue'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    helperText?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    label: 'Password',
    placeholder: '',
    helperText: '',
    required: false,
    disabled: false,
  },
)

const getStrength = (value: string) => {
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return score
}

const strength = computed(() => getStrength(model.value))

const strengthLabel = computed(() => {
  if (!model.value.length) return 'Enter a password'
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
  return `Strength: ${labels[Math.max(strength.value - 1, 0)]}`
})
</script>

<template>
  <APasswordInput
    v-model="model"
    :label="props.label"
    :placeholder="props.placeholder"
    :helper-text="props.helperText"
    :required="props.required"
    :disabled="props.disabled"
  >
    <template #footer>
      <div class="a-password-strength">
        <div class="a-password-strength__bars">
          <span
            v-for="index in 5"
            :key="index"
            class="a-password-strength__bar"
            :class="{
              'is-active': index <= strength,
              [`is-level-${strength}`]: index <= strength,
            }"
          />
        </div>
        <p class="a-password-strength__text">{{ strengthLabel }}</p>
      </div>
    </template>
  </APasswordInput>
</template>

<style scoped>
.a-password-strength {
  display: grid;
  gap: 0.42rem;
}

.a-password-strength__bars {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.24rem;
}

.a-password-strength__bar {
  height: 0.26rem;
  border-radius: 999px;
  background: var(--admin-border);
}

.a-password-strength__bar.is-active.is-level-1 {
  background: #dc2626;
}

.a-password-strength__bar.is-active.is-level-2 {
  background: #ea580c;
}

.a-password-strength__bar.is-active.is-level-3 {
  background: #d97706;
}

.a-password-strength__bar.is-active.is-level-4 {
  background: #2563eb;
}

.a-password-strength__bar.is-active.is-level-5 {
  background: #16a34a;
}

.a-password-strength__text {
  margin: 0;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
}
</style>
