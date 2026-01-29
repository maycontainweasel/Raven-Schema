<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    readOnly?: boolean
    showHtmlToggle?: boolean
    minHeight?: string
  }>(),
  {
    modelValue: '',
    placeholder: 'Write something...'
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

type Mode = 'visual' | 'html'

const editorRef = ref<HTMLDivElement | null>(null)
const activeMode = ref<Mode>('visual')
const isFocused = ref(false)
const localHtml = ref(props.modelValue ?? '')

const editable = computed(() => !props.disabled && !props.readOnly)

const allowedTags = new Set([
  'b',
  'strong',
  'i',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'p',
  'br',
  'span',
  'div'
])

const normalizeEmptyHtml = (value: string) => {
  const stripped = value
    .replace(/<br\s*\/?\s*>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
  return stripped.length === 0 ? '' : value
}

const sanitizeHtml = (value: string) => {
  if (typeof window === 'undefined') return value ?? ''
  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${value ?? ''}</div>`, 'text/html')
  const root = doc.body.firstElementChild as HTMLElement | null
  if (!root) return ''

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node)
      return
    }

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    if (!allowedTags.has(tag)) {
      const parent = el.parentNode
      if (!parent) return
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el)
      }
      parent.removeChild(el)
      return
    }

    Array.from(el.attributes).forEach((attr) => {
      el.removeAttribute(attr.name)
    })

    Array.from(el.childNodes).forEach(sanitizeNode)
  }

  Array.from(root.childNodes).forEach(sanitizeNode)
  return root.innerHTML
}

const commitValue = (value: string) => {
  const sanitized = normalizeEmptyHtml(sanitizeHtml(value))
  localHtml.value = sanitized
  if (sanitized !== (props.modelValue ?? '')) {
    emit('update:modelValue', sanitized)
  }
}

const syncDom = () => {
  if (!editorRef.value) return
  if (editorRef.value.innerHTML !== localHtml.value) {
    editorRef.value.innerHTML = localHtml.value
  }
}

const handleInput = () => {
  if (!editorRef.value) return
  commitValue(editorRef.value.innerHTML)
}

const handleBlur = () => {
  isFocused.value = false
  handleInput()
}

const handleFocus = () => {
  isFocused.value = true
}

const runCommand = (command: string) => {
  if (!editorRef.value || !editable.value) return
  editorRef.value.focus()
  document.execCommand(command)
  handleInput()
}

const setMode = async (mode: Mode) => {
  if (activeMode.value === mode) return
  activeMode.value = mode
  await nextTick()
  if (mode === 'visual') {
    syncDom()
  }
}

watch(
  () => props.modelValue,
  (next) => {
    const sanitized = normalizeEmptyHtml(sanitizeHtml(next ?? ''))
    if (sanitized === localHtml.value) return
    localHtml.value = sanitized
    if (!isFocused.value && activeMode.value === 'visual') {
      syncDom()
    }
  },
  { immediate: true }
)

onMounted(() => {
  syncDom()
})
</script>

<template>
  <div
    class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
    :class="!editable ? 'opacity-60' : ''"
  >
    <div class="flex items-center gap-1 border-b border-[var(--color-border)] px-2 py-2">
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        title="Bold"
        @mousedown.prevent
        @click="runCommand('bold')"
      >
        <span class="font-semibold">B</span>
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        title="Italic"
        @mousedown.prevent
        @click="runCommand('italic')"
      >
        <span class="italic">I</span>
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        title="Underline"
        @mousedown.prevent
        @click="runCommand('underline')"
      >
        <span class="underline">U</span>
      </button>
      <span class="mx-1 h-4 w-px bg-[var(--color-border)]"></span>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        title="Bulleted list"
        @mousedown.prevent
        @click="runCommand('insertUnorderedList')"
      >
        UL
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-xs"
        title="Numbered list"
        @mousedown.prevent
        @click="runCommand('insertOrderedList')"
      >
        OL
      </button>

      <div class="ml-auto flex items-center gap-1 text-xs font-semibold uppercase text-muted">
        <button
          v-if="showHtmlToggle !== false"
          type="button"
          class="btn btn-ghost btn-xs"
          :class="activeMode === 'html' ? 'bg-[var(--color-surface-muted)]' : ''"
          @click="setMode(activeMode === 'html' ? 'visual' : 'html')"
        >
          HTML
        </button>
      </div>
    </div>

    <div class="p-2">
      <div
        v-if="activeMode === 'visual'"
        ref="editorRef"
        class="wysiwyg-editor min-h-[140px] rounded-md border border-transparent px-2 py-2 text-sm outline-none"
        :contenteditable="editable"
        :data-placeholder="placeholder"
        :style="{ minHeight: minHeight ?? '140px' }"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      ></div>
      <textarea
        v-else
        class="textarea w-full text-sm"
        :rows="6"
        :value="localHtml"
        :placeholder="placeholder"
        :disabled="!editable"
        @input="commitValue(($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.wysiwyg-editor:empty:before {
  content: attr(data-placeholder);
  color: var(--color-muted);
}

.wysiwyg-editor ul {
  list-style: disc;
  padding-left: 1.25rem;
}

.wysiwyg-editor ol {
  list-style: decimal;
  padding-left: 1.25rem;
}

.wysiwyg-editor li {
  margin: 0.125rem 0;
}
</style>
