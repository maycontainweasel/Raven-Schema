<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
import { ref } from 'vue'
import {
  formatFileSize,
  getFileIconClass,
  isImageFile,
} from '../../composables/useFileUploadHelpers'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    accept?: string
    maxFiles?: number
    pasteNoticeMs?: number
  }>(),
  {
    label: 'Paste Upload',
    helperText: '',
    accept: '',
    maxFiles: 5,
    pasteNoticeMs: 1800,
  },
)

const pastedFlash = ref(false)

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, props.maxFiles)
}

const flashPaste = () => {
  pastedFlash.value = true
  window.setTimeout(() => {
    pastedFlash.value = false
  }, props.pasteNoticeMs)
}

const appendPastedFiles = (files: FileList) => {
  const incoming = Array.from(files || [])
  if (!incoming.length) return

  const next = [...model.value]
  for (const file of incoming) {
    if (next.length >= props.maxFiles) break
    next.push(file)
  }

  model.value = next
  if (typeof window !== 'undefined') flashPaste()
}

const handlePaste = (event: ClipboardEvent) => {
  const clipboardFiles = event.clipboardData?.files
  if (!clipboardFiles || !clipboardFiles.length) return
  event.preventDefault()
  appendPastedFiles(clipboardFiles)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-paste"
    :accept="props.accept"
    :max-files="props.maxFiles"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <FileUpload.Context v-slot="context">
      <p class="a-file-upload-paste__label">{{ props.label }}</p>

      <FileUpload.Dropzone class="a-file-upload-paste__dropzone" tabindex="0" @paste="handlePaste">
        <div class="a-file-upload-paste__drop-icon">
          <i class="i-lucide-clipboard h-5 w-5" aria-hidden="true" />
        </div>

        <p class="a-file-upload-paste__drop-copy">Drag & drop, click to browse, or paste with <code>Ctrl/Cmd + V</code></p>

        <div v-if="pastedFlash" class="a-file-upload-paste__flash">
          <i class="i-lucide-clipboard-check h-4 w-4" aria-hidden="true" />
          Files pasted
        </div>
      </FileUpload.Dropzone>

      <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-paste__items">
        <FileUpload.ItemGroup>
          <FileUpload.Item
            v-for="file in context.acceptedFiles"
            :key="`${file.name}-${file.lastModified}`"
            :file="file"
            class="a-file-upload-paste__item"
          >
            <div class="a-file-upload-paste__preview">
              <FileUpload.ItemPreview v-if="isImageFile(file)" type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-paste__preview-image" />
              </FileUpload.ItemPreview>
              <i
                v-else
                :class="[getFileIconClass(file), 'h-4 w-4 a-file-upload-paste__preview-icon']"
                aria-hidden="true"
              />
            </div>

            <div class="a-file-upload-paste__copy">
              <FileUpload.ItemName class="a-file-upload-paste__name" />
              <span class="a-file-upload-paste__size">{{ formatFileSize(file.size) }}</span>
            </div>

            <FileUpload.ItemDeleteTrigger class="a-file-upload-paste__remove" aria-label="Remove file">
              <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
            </FileUpload.ItemDeleteTrigger>
          </FileUpload.Item>
        </FileUpload.ItemGroup>

        <FileUpload.ClearTrigger class="a-file-upload-paste__clear">Clear all files</FileUpload.ClearTrigger>
      </div>

      <p v-if="props.helperText" class="a-file-upload-paste__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-paste {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-paste__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-paste__dropzone {
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  min-height: 10.5rem;
  padding: 0.9rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.48rem;
  text-align: center;
  cursor: pointer;
  position: relative;
}

.a-file-upload-paste__drop-icon {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-file-upload-paste__drop-copy {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-paste__drop-copy code {
  font-size: 0.74rem;
}

.a-file-upload-paste__flash {
  position: absolute;
  bottom: 0.6rem;
  right: 0.6rem;
  border: 1px solid #86efac;
  background: #ecfdf3;
  color: #166534;
  border-radius: var(--admin-radius-pill);
  padding: 0.22rem 0.45rem;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 0.26rem;
}

.a-file-upload-paste__items {
  display: grid;
  gap: 0.42rem;
}

.a-file-upload-paste__item {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.a-file-upload-paste__preview {
  width: 2rem;
  height: 2rem;
  border-radius: 0.45rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.a-file-upload-paste__preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-paste__preview-icon {
  color: var(--admin-muted-2);
}

.a-file-upload-paste__copy {
  min-width: 0;
  display: grid;
  gap: 0.13rem;
}

.a-file-upload-paste__name {
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.a-file-upload-paste__size {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-paste__remove {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--admin-muted-2);
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-paste__remove:hover {
  color: var(--admin-text-soft);
  background: var(--admin-surface-soft);
}

.a-file-upload-paste__clear {
  justify-self: start;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.3rem 0.55rem;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-paste__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
