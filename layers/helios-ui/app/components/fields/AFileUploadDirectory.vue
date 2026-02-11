<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
import {
  formatFileSize,
  getDisplayFilePath,
  getFileIconClass,
  isImageFile,
} from '../../composables/useFileUploadHelpers'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    maxFiles?: number
  }>(),
  {
    label: 'Directory Upload',
    helperText: '',
    maxFiles: 10000,
  },
)

const iconClassForDirectoryFile = (file: File) => {
  const path = getDisplayFilePath(file)
  if (!isImageFile(file) && path.includes('/')) return 'i-lucide-folder-open'
  return getFileIconClass(file)
}

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, props.maxFiles)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-directory"
    directory
    :max-files="props.maxFiles"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <FileUpload.Context v-slot="context">
      <p class="a-file-upload-directory__label">{{ props.label }}</p>

      <FileUpload.Dropzone class="a-file-upload-directory__dropzone">
        <div class="a-file-upload-directory__drop-icon">
          <i class="i-lucide-folder h-5 w-5" aria-hidden="true" />
        </div>
        <p class="a-file-upload-directory__drop-title">Drag & drop or click to select a folder</p>
        <p class="a-file-upload-directory__drop-copy">All files and subdirectories are included</p>
      </FileUpload.Dropzone>

      <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-directory__items">
        <FileUpload.ItemGroup>
          <FileUpload.Item
            v-for="file in context.acceptedFiles"
            :key="`${file.name}-${file.webkitRelativePath}-${file.lastModified}`"
            :file="file"
            class="a-file-upload-directory__item"
          >
            <div class="a-file-upload-directory__preview">
              <FileUpload.ItemPreview v-if="isImageFile(file)" type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-directory__preview-image" />
              </FileUpload.ItemPreview>

              <i
                v-else
                :class="[iconClassForDirectoryFile(file), 'h-4 w-4 a-file-upload-directory__preview-icon']"
                aria-hidden="true"
              />
            </div>

            <div class="a-file-upload-directory__copy">
              <span class="a-file-upload-directory__path">{{ getDisplayFilePath(file) }}</span>
              <span class="a-file-upload-directory__size">{{ formatFileSize(file.size) }}</span>
            </div>

            <FileUpload.ItemDeleteTrigger class="a-file-upload-directory__remove" aria-label="Remove file">
              <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
            </FileUpload.ItemDeleteTrigger>
          </FileUpload.Item>
        </FileUpload.ItemGroup>

        <div class="a-file-upload-directory__footer">
          <span class="a-file-upload-directory__meta">{{ context.acceptedFiles.length }} file(s)</span>
          <FileUpload.ClearTrigger class="a-file-upload-directory__clear">Clear directory</FileUpload.ClearTrigger>
        </div>
      </div>

      <p v-if="props.helperText" class="a-file-upload-directory__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-directory {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-directory__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-directory__dropzone {
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  min-height: 10.5rem;
  padding: 0.95rem;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
  gap: 0.35rem;
  cursor: pointer;
}

.a-file-upload-directory__drop-icon {
  width: 2.9rem;
  height: 2.9rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-brand);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-file-upload-directory__drop-title {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
}

.a-file-upload-directory__drop-copy {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-directory__items {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-directory__item {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.48rem;
}

.a-file-upload-directory__preview {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.a-file-upload-directory__preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-directory__preview-icon {
  color: var(--admin-brand);
}

.a-file-upload-directory__copy {
  min-width: 0;
  display: grid;
  gap: 0.13rem;
}

.a-file-upload-directory__path {
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.a-file-upload-directory__size {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-directory__remove {
  margin-left: auto;
  border: 0;
  background: transparent;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 999px;
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-directory__remove:hover {
  background: var(--admin-surface-soft);
  color: var(--admin-text-soft);
}

.a-file-upload-directory__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.a-file-upload-directory__meta {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-directory__clear {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.3rem 0.55rem;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-directory__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
