<script setup lang="ts">
import APasswordInput from './APasswordInput.vue'

type PasswordRequirement = {
  label: string
  test: (value: string) => boolean
}

const model = defineModel<string>({ default: '' })

const defaultRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { label: 'Contains uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'Contains lowercase letter', test: (value) => /[a-z]/.test(value) },
  { label: 'Contains number', test: (value) => /[0-9]/.test(value) },
  { label: 'Contains special character', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

const props = withDefaults(
  defineProps<{
    label?: string
    placeholder?: string
    helperText?: string
    requirements?: PasswordRequirement[]
    required?: boolean
    disabled?: boolean
  }>(),
  {
    label: 'Create Password',
    placeholder: '',
    helperText: '',
    required: false,
    disabled: false,
  },
)

const evaluatedRequirements = computed(() => (props.requirements ?? defaultRequirements).map((requirement) => ({
  ...requirement,
  met: requirement.test(model.value),
})))
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
      <div class="a-password-req">
        <div
          v-for="(requirement, index) in evaluatedRequirements"
          :key="`${requirement.label}-${index}`"
          class="a-password-req__item"
          :class="{ 'is-met': requirement.met }"
        >
          <span class="a-password-req__icon">
            <i v-if="requirement.met" class="i-lucide-check h-3 w-3" aria-hidden="true" />
            <i v-else class="i-lucide-x h-3 w-3" aria-hidden="true" />
          </span>
          <span class="a-password-req__label">{{ requirement.label }}</span>
        </div>
      </div>
    </template>
  </APasswordInput>
</template>

<style scoped>
.a-password-req {
  display: grid;
  gap: 0.28rem;
}

.a-password-req__item {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-muted);
}

.a-password-req__icon {
  width: 0.92rem;
  height: 0.92rem;
  min-width: 0.92rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
  background: var(--admin-surface-soft);
}

.a-password-req__item.is-met {
  color: #15803d;
}

.a-password-req__item.is-met .a-password-req__icon {
  color: #15803d;
  background: color-mix(in srgb, #16a34a 16%, white 84%);
}
</style>
