<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    accept?: string
    maxFiles?: number
  }>(),
  {
    label: 'Multiple Images',
    helperText: '',
    accept: 'image/*',
    maxFiles: 10,
  },
)

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, props.maxFiles)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-images"
    :accept="props.accept"
    :max-files="props.maxFiles"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <FileUpload.Context v-slot="context">
      <div class="a-file-upload-images__shell">
        <div class="a-file-upload-images__head">
          <p class="a-file-upload-images__label">{{ props.label }}</p>

          <FileUpload.Trigger class="a-file-upload-images__trigger">
            <i class="i-lucide-upload h-3.5 w-3.5" aria-hidden="true" />
            Add more
          </FileUpload.Trigger>
        </div>

        <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0">
          <div class="a-file-upload-images__grid">
            <FileUpload.Item
              v-for="file in context.acceptedFiles"
              :key="`${file.name}-${file.lastModified}`"
              :file="file"
              class="a-file-upload-images__item"
            >
              <FileUpload.ItemPreview type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-images__image" />
              </FileUpload.ItemPreview>

              <FileUpload.ItemDeleteTrigger class="a-file-upload-images__delete" aria-label="Remove image">
                <i class="i-lucide-x h-3.5 w-3.5" aria-hidden="true" />
              </FileUpload.ItemDeleteTrigger>
            </FileUpload.Item>
          </div>
        </FileUpload.ItemGroup>

        <FileUpload.Dropzone v-else class="a-file-upload-images__empty">
          <div class="a-file-upload-images__empty-icon">
            <i class="i-lucide-upload h-5 w-5" aria-hidden="true" />
          </div>
          <p class="a-file-upload-images__empty-copy">Click to upload or drag and drop images here</p>
        </FileUpload.Dropzone>

        <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-images__footer">
          <span class="a-file-upload-images__meta">{{ context.acceptedFiles.length }} file(s)</span>
          <FileUpload.ClearTrigger class="a-file-upload-images__clear">Remove all</FileUpload.ClearTrigger>
        </div>
      </div>

      <p v-if="props.helperText" class="a-file-upload-images__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-images {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-images__shell {
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  padding: 0.85rem;
  display: grid;
  gap: 0.72rem;
}

.a-file-upload-images__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.a-file-upload-images__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-images__trigger {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.36rem 0.58rem;
  font-size: var(--fs--1, 0.78rem);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  cursor: pointer;
}

.a-file-upload-images__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.a-file-upload-images__item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.7rem;
  overflow: hidden;
  background: var(--admin-surface);
}

.a-file-upload-images__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-images__delete {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  width: 1.45rem;
  height: 1.45rem;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-images__empty {
  min-height: 12rem;
  border: 1px dashed var(--admin-border);
  border-radius: 0.8rem;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.45rem;
  text-align: center;
  cursor: pointer;
  background: var(--admin-surface);
}

.a-file-upload-images__empty-icon {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--admin-muted-2);
}

.a-file-upload-images__empty-copy {
  margin: 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-images__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.a-file-upload-images__meta {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-images__clear {
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  border-radius: var(--admin-radius-md);
  padding: 0.3rem 0.52rem;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-images__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

@media (max-width: 880px) {
  .a-file-upload-images__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .a-file-upload-images__grid {
    grid-template-columns: 1fr;
  }
}
</style>
