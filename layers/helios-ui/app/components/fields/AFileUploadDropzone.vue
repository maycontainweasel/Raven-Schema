<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    accept?: string
    maxFileSize?: number
    uploadHint?: string
  }>(),
  {
    label: 'Image Upload',
    helperText: '',
    accept: 'image/*',
    maxFileSize: 5 * 1024 * 1024,
    uploadHint: 'Max size: 5MB',
  },
)

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, 1)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-dropzone"
    :max-files="1"
    :accept="props.accept"
    :max-file-size="props.maxFileSize"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <p class="a-file-upload-dropzone__label">{{ props.label }}</p>

    <FileUpload.Context v-slot="context">
      <div v-if="context.acceptedFiles.length > 0" class="a-file-upload-dropzone__preview-wrap">
        <FileUpload.ItemGroup>
          <FileUpload.Item :file="context.acceptedFiles[0]">
            <FileUpload.ItemPreview type="image/*">
              <FileUpload.ItemPreviewImage class="a-file-upload-dropzone__preview-image" />
            </FileUpload.ItemPreview>
          </FileUpload.Item>
        </FileUpload.ItemGroup>

        <FileUpload.ItemGroup>
          <FileUpload.Item :file="context.acceptedFiles[0]">
            <FileUpload.ItemDeleteTrigger class="a-file-upload-dropzone__delete" aria-label="Remove file">
              <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
            </FileUpload.ItemDeleteTrigger>
          </FileUpload.Item>
        </FileUpload.ItemGroup>
      </div>

      <FileUpload.Dropzone v-else class="a-file-upload-dropzone__dropzone">
        <div class="a-file-upload-dropzone__icon-wrap">
          <i class="i-lucide-image h-5 w-5 a-file-upload-dropzone__icon" aria-hidden="true" />
        </div>

        <div class="a-file-upload-dropzone__copy">
          <p class="a-file-upload-dropzone__headline">Drop your image here or click to browse</p>
          <p class="a-file-upload-dropzone__hint">{{ props.uploadHint }}</p>
        </div>
      </FileUpload.Dropzone>

      <p v-if="props.helperText" class="a-file-upload-dropzone__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-dropzone {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-dropzone__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-dropzone__preview-wrap {
  position: relative;
}

.a-file-upload-dropzone__preview-image {
  width: 100%;
  max-height: 16rem;
  object-fit: cover;
  border-radius: 0.85rem;
}

.a-file-upload-dropzone__delete {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 1.7rem;
  height: 1.7rem;
  border: 0;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-dropzone__dropzone {
  width: 100%;
  min-height: 16rem;
  border: 2px dashed var(--admin-border-strong);
  border-radius: 0.85rem;
  background: var(--admin-surface-soft);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.75rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 130ms ease, background 130ms ease;
}

.a-file-upload-dropzone__dropzone[data-dragging] {
  border-color: var(--admin-brand);
  background: color-mix(in srgb, var(--admin-surface-soft) 80%, white 20%);
}

.a-file-upload-dropzone__icon-wrap {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-file-upload-dropzone__icon {
  color: var(--admin-muted-2);
}

.a-file-upload-dropzone__copy {
  display: grid;
  gap: 0.2rem;
}

.a-file-upload-dropzone__headline {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
}

.a-file-upload-dropzone__hint {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-dropzone__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
