<script setup lang="ts">
type ApiConsoleEntry = {
  id: string
  timestamp: string
  type: 'message' | 'response'
  message?: string
  state?: 'success' | 'error' | 'info'
  payload?: unknown
}

const props = defineProps<{
  entries: ApiConsoleEntry[]
  autoClear: boolean
  autoScroll: boolean
}>()

const emit = defineEmits<{
  (event: 'update:autoClear', value: boolean): void
  (event: 'update:autoScroll', value: boolean): void
  (event: 'clear'): void
}>()

const consoleRef = ref<HTMLDivElement | null>(null)

watch(
  () => props.entries.length,
  () => {
    if (!props.autoScroll || !consoleRef.value) return
    nextTick(() => {
      consoleRef.value?.scrollTo({
        top: consoleRef.value.scrollHeight,
        behavior: 'smooth'
      })
    })
  }
)

const toggleClear = (event: Event) => {
  emit('update:autoClear', (event.target as HTMLInputElement).checked)
}

const toggleScroll = (event: Event) => {
  emit('update:autoScroll', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="flex h-full flex-col border-l border-slate-800 bg-slate-950 text-emerald-200">
    <div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Console</div>
      <div class="flex items-center gap-4 text-xs text-emerald-300">
        <label class="flex items-center gap-2">
          <input type="checkbox" :checked="autoClear" @change="toggleClear" />
          Auto-clear
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" :checked="autoScroll" @change="toggleScroll" />
          Auto-scroll
        </label>
        <button class="btn btn-ghost btn-xs text-emerald-200" type="button" @click="emit('clear')">Clear</button>
      </div>
    </div>

    <div ref="consoleRef" class="flex-1 overflow-y-auto px-4 py-4 text-xs">
      <div v-if="entries.length === 0" class="italic text-emerald-700">
        Console output will appear here.
      </div>
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="mb-3 rounded border border-slate-800 bg-slate-900/60 p-3"
      >
        <div class="text-[10px] uppercase tracking-[0.2em] text-emerald-500">
          {{ new Date(entry.timestamp).toLocaleTimeString() }}
        </div>
        <div v-if="entry.type === 'message'" class="mt-2 text-emerald-100">
          <span class="text-emerald-400">$</span> {{ entry.message }}
        </div>
        <div v-else class="mt-2 space-y-2">
          <div class="flex items-center gap-2">
            <span
              class="badge"
              :class="entry.state === 'success'
                ? 'badge-success'
                : entry.state === 'error'
                  ? 'badge-error'
                  : 'badge-info'"
            >
              {{ entry.state ?? 'info' }}
            </span>
            <span class="text-emerald-200">{{ entry.message }}</span>
          </div>
          <pre class="whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-3 text-[11px] text-cyan-200">{{ JSON.stringify(entry.payload, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <div class="border-t border-slate-800 px-4 py-2 text-[10px] text-emerald-500">
      {{ entries.length }} entries
    </div>
  </div>
</template>
