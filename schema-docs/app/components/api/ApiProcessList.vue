<script setup lang="ts">
export type ProcessItem = {
  id: string
  label: string
  description: string
  router: string
  disabled?: boolean
}

export type ProcessGroup = {
  id: string
  label: string
  description: string
  enabled: boolean
  processes: ProcessItem[]
}

const props = defineProps<{
  groups: ProcessGroup[]
  activeProcessId: string
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
}>()

const pickProcess = (process: ProcessItem, group: ProcessGroup) => {
  if (!group.enabled || process.disabled) return
  emit('select', process.id)
}
</script>

<template>
  <div class="stack">
    <div class="field">
      <label class="label">Processes</label>
      <p class="help">Pick a router action for the selected model.</p>
    </div>

    <div v-for="group in groups" :key="group.id" class="card">
      <div class="spread">
        <h4>{{ group.label }}</h4>
        <span v-if="!group.enabled" class="badge warning">Disabled</span>
      </div>
      <p class="help">{{ group.description }}</p>
      <div class="stack">
        <button
          v-for="process in group.processes"
          :key="process.id"
          class="button block"
          :class="{
            primary: process.id === activeProcessId,
            ghost: process.id !== activeProcessId,
          }"
          :disabled="!group.enabled || process.disabled"
          @click="pickProcess(process, group)"
        >
          <div class="spread">
            <span>{{ process.label }}</span>
            <span class="tag">{{ process.id }}</span>
          </div>
          <small class="muted">{{ process.description }}</small>
        </button>
      </div>
    </div>
  </div>
</template>
