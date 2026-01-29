<script setup lang="ts">
type ConsoleEntry = {
  id: string
  time: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  detail?: unknown
}

const props = defineProps<{
  logs: ConsoleEntry[]
  autoScroll: boolean
  fontSize?: number
}>()

const consoleRef = ref<HTMLElement | null>(null)

const formatDetail = (detail: unknown) => {
  if (detail === undefined) return ''
  try {
    return JSON.stringify(detail, null, 2)
  } catch (error) {
    return String(detail)
  }
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const formatDetailHtml = (detail: unknown) => {
  const raw = formatDetail(detail)
  if (!raw) return ''
  const escaped = escapeHtml(raw)
  const tokenRegex =
    /(\"(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\\"])*\")(\\s*:)?|\\btrue\\b|\\bfalse\\b|\\bnull\\b|-?\\d+(?:\\.\\d+)?(?:[eE][+\\-]?\\d+)?/g
  return escaped.replace(tokenRegex, (match, str, colon) => {
    if (str) {
      if (colon) {
        return `<span class=\"json-key\">${str}</span>${colon}`
      }
      return `<span class=\"json-string\">${str}</span>`
    }
    if (match === 'true' || match === 'false') return `<span class=\"json-boolean\">${match}</span>`
    if (match === 'null') return `<span class=\"json-null\">${match}</span>`
    return `<span class=\"json-number\">${match}</span>`
  })
}

const extractErrorMessage = (detail: unknown) => {
  if (!detail || typeof detail !== 'object') return ''
  const maybe = detail as { error?: unknown }
  if (maybe.error === undefined || maybe.error === null) return ''
  return typeof maybe.error === 'string' ? maybe.error : JSON.stringify(maybe.error)
}

const getEntryKind = (message: string) => {
  if (message.includes('REQUEST')) return 'request'
  if (message.includes('RESPONSE')) return 'response'
  if (message.includes('ERROR')) return 'error'
  return 'info'
}

const getEntryTag = (entry: ConsoleEntry) => {
  const kind = getEntryKind(entry.message)
  if (kind === 'request') return 'REQUEST'
  if (kind === 'response') return entry.level === 'error' ? 'ERROR' : 'RESPONSE'
  if (kind === 'error') return 'ERROR'
  if (entry.level === 'success') return 'SUCCESS'
  if (entry.level === 'warning') return 'WARN'
  return 'INFO'
}

const getEntryTagClass = (entry: ConsoleEntry) => {
  const kind = getEntryKind(entry.message)
  if (kind === 'request') return 'console-tag request'
  if (kind === 'response') return entry.level === 'error' ? 'console-tag error' : 'console-tag response'
  if (kind === 'error') return 'console-tag error'
  if (entry.level === 'success') return 'console-tag success'
  if (entry.level === 'warning') return 'console-tag warning'
  return 'console-tag info'
}

const fontSizeStyle = computed(() => {
  if (!props.fontSize) return {}
  return { fontSize: `${props.fontSize}px` }
})

watch(
  () => props.logs.length,
  async () => {
    if (!props.autoScroll) return
    await nextTick()
    if (consoleRef.value) {
      consoleRef.value.scrollTop = consoleRef.value.scrollHeight
    }
  }
)
</script>

<template>
  <div class="stack">
    <div ref="consoleRef" class="console" :style="fontSizeStyle">
      <div v-if="!logs.length" class="line">No output yet. Run a process to see logs.</div>
      <div v-for="entry in logs" :key="entry.id" class="line">
        <strong>[{{ entry.time }}]</strong>
        <span> {{ entry.message }}</span>
        <span :class="getEntryTagClass(entry)" style="margin-left: 0.5rem;">{{ getEntryTag(entry) }}</span>
        <div v-if="entry.level === 'error' && extractErrorMessage(entry.detail)" class="inset" style="margin-top: 0.4rem;">
          <strong>Error:</strong> {{ extractErrorMessage(entry.detail) }}
        </div>
        <div v-if="entry.detail" class="inset" style="margin-top: 0.4rem;">
          <pre class="console-json" style="margin: 0; white-space: pre-wrap;" v-html="formatDetailHtml(entry.detail)"></pre>
        </div>
      </div>
    </div>
  </div>
</template>
