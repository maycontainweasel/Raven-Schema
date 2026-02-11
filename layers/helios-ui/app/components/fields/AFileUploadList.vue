<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
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
    maxFileSize?: number
  }>(),
  {
    label: 'Files List',
    helperText: '',
    accept: '',
    maxFiles: 10,
    maxFileSize: 100 * 1024 * 1024,
  },
)

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, props.maxFiles)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-list"
    :accept="props.accept"
    :max-files="props.maxFiles"
    :max-file-size="props.maxFileSize"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <FileUpload.Context v-slot="context">
      <p class="a-file-upload-list__label">{{ props.label }}</p>

      <FileUpload.Dropzone class="a-file-upload-list__dropzone">
        <div class="a-file-upload-list__drop-icon">
          <i class="i-lucide-file-text h-5 w-5" aria-hidden="true" />
        </div>
        <p class="a-file-upload-list__drop-copy">Drag & drop or click to browse</p>
      </FileUpload.Dropzone>

      <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-list__items">
        <FileUpload.ItemGroup>
          <FileUpload.Item
            v-for="file in context.acceptedFiles"
            :key="`${file.name}-${file.lastModified}`"
            :file="file"
            class="a-file-upload-list__item"
          >
            <div class="a-file-upload-list__preview">
              <FileUpload.ItemPreview v-if="isImageFile(file)" type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-list__preview-image" />
              </FileUpload.ItemPreview>

              <i
                v-else
                :class="[getFileIconClass(file), 'h-4 w-4 a-file-upload-list__preview-icon']"
                aria-hidden="true"
              />
            </div>

            <div class="a-file-upload-list__copy">
              <FileUpload.ItemName class="a-file-upload-list__name" />
              <span class="a-file-upload-list__size">{{ formatFileSize(file.size) }}</span>
            </div>

            <FileUpload.ItemDeleteTrigger class="a-file-upload-list__remove" aria-label="Remove file">
              <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
            </FileUpload.ItemDeleteTrigger>
          </FileUpload.Item>
        </FileUpload.ItemGroup>

        <FileUpload.ClearTrigger class="a-file-upload-list__clear">Remove all files</FileUpload.ClearTrigger>
      </div>

      <p v-if="props.helperText" class="a-file-upload-list__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-list {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-list__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-list__dropzone {
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.48rem;
  padding: 1rem;
  cursor: pointer;
}

.a-file-upload-list__drop-icon {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
  background: var(--admin-surface);
}

.a-file-upload-list__drop-copy {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-list__items {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-list__item {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface);
  padding: 0.55rem;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.a-file-upload-list__preview {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.55rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.a-file-upload-list__preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-list__preview-icon {
  color: var(--admin-muted-2);
}

.a-file-upload-list__copy {
  min-width: 0;
  display: grid;
  gap: 0.15rem;
}

.a-file-upload-list__name {
  font-size: var(--fs--075, 0.86rem);
  color: var(--admin-text);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.a-file-upload-list__size {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-list__remove {
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

.a-file-upload-list__remove:hover {
  color: var(--admin-text-soft);
  background: var(--admin-surface-soft);
}

.a-file-upload-list__clear {
  justify-self: start;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.33rem 0.58rem;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-list__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
