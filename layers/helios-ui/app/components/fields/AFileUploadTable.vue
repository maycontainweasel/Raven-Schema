<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
import {
  downloadLocalFile,
  formatFileSize,
  getFileExtension,
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
    label: 'Files Table',
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
    class="a-file-upload-table"
    :accept="props.accept"
    :max-files="props.maxFiles"
    :max-file-size="props.maxFileSize"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <FileUpload.Context v-slot="context">
      <div class="a-file-upload-table__head">
        <p class="a-file-upload-table__label">{{ props.label }} ({{ context.acceptedFiles.length }})</p>

        <div class="a-file-upload-table__actions">
          <FileUpload.Trigger class="a-file-upload-table__btn">
            <i class="i-lucide-upload h-3.5 w-3.5" aria-hidden="true" />
            Add files
          </FileUpload.Trigger>

          <FileUpload.ClearTrigger v-if="context.acceptedFiles.length > 0" class="a-file-upload-table__btn">
            <i class="i-lucide-trash-2 h-3.5 w-3.5" aria-hidden="true" />
            Remove all
          </FileUpload.ClearTrigger>
        </div>
      </div>

      <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-table__table">
        <div class="a-file-upload-table__row a-file-upload-table__row--head">
          <span>Name</span>
          <span>Type</span>
          <span>Size</span>
          <span>Actions</span>
        </div>

        <FileUpload.ItemGroup>
          <FileUpload.Item
            v-for="file in context.acceptedFiles"
            :key="`${file.name}-${file.lastModified}`"
            :file="file"
            class="a-file-upload-table__row"
          >
            <div class="a-file-upload-table__name-cell">
              <span class="a-file-upload-table__preview">
                <FileUpload.ItemPreview v-if="isImageFile(file)" type="image/*">
                  <FileUpload.ItemPreviewImage class="a-file-upload-table__preview-image" />
                </FileUpload.ItemPreview>
                <i
                  v-else
                  :class="[getFileIconClass(file), 'h-4 w-4 a-file-upload-table__preview-icon']"
                  aria-hidden="true"
                />
              </span>
              <FileUpload.ItemName class="a-file-upload-table__name" />
            </div>

            <span class="a-file-upload-table__cell">{{ getFileExtension(file.name) }}</span>
            <span class="a-file-upload-table__cell">{{ formatFileSize(file.size) }}</span>

            <div class="a-file-upload-table__cell a-file-upload-table__cell--actions">
              <button class="a-file-upload-table__icon-btn" type="button" @click="downloadLocalFile(file)">
                <i class="i-lucide-download h-4 w-4" aria-hidden="true" />
              </button>

              <FileUpload.ItemDeleteTrigger class="a-file-upload-table__icon-btn">
                <i class="i-lucide-trash-2 h-4 w-4" aria-hidden="true" />
              </FileUpload.ItemDeleteTrigger>
            </div>
          </FileUpload.Item>
        </FileUpload.ItemGroup>
      </div>

      <FileUpload.Dropzone v-else class="a-file-upload-table__empty">
        <div class="a-file-upload-table__empty-icon">
          <i class="i-lucide-file-text h-4 w-4" aria-hidden="true" />
        </div>
        <p class="a-file-upload-table__empty-copy">Drag & drop files here or click to browse</p>
      </FileUpload.Dropzone>

      <p v-if="props.helperText" class="a-file-upload-table__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-table {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-table__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.a-file-upload-table__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-table__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.a-file-upload-table__btn {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.34rem 0.58rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-table__table {
  border: 1px solid var(--admin-border);
  border-radius: 0.75rem;
  background: var(--admin-surface);
  overflow: hidden;
}

.a-file-upload-table__row {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(72px, 0.6fr) minmax(72px, 0.6fr) minmax(96px, 0.7fr);
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.62rem;
  border-bottom: 1px solid var(--admin-border);
}

.a-file-upload-table__row:last-child {
  border-bottom: 0;
}

.a-file-upload-table__row--head {
  background: var(--admin-surface-soft);
  font-size: 0.69rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--admin-muted-2);
}

.a-file-upload-table__name-cell {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.a-file-upload-table__preview {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 0.48rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.a-file-upload-table__preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-table__preview-icon {
  color: var(--admin-muted-2);
}

.a-file-upload-table__name {
  min-width: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.a-file-upload-table__cell {
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-table__cell--actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.a-file-upload-table__icon-btn {
  width: 1.65rem;
  height: 1.65rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--admin-muted-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-table__icon-btn:hover {
  background: var(--admin-surface-soft);
  color: var(--admin-text-soft);
}

.a-file-upload-table__empty {
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  min-height: 10rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.42rem;
  text-align: center;
  cursor: pointer;
}

.a-file-upload-table__empty-icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
}

.a-file-upload-table__empty-copy {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-table__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

@media (max-width: 760px) {
  .a-file-upload-table__row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .a-file-upload-table__row--head {
    display: none;
  }
}
</style>
