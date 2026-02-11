<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
import { formatFileSize } from '../../composables/useFileUploadHelpers'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    accept?: string
    uploadLabel?: string
    replaceLabel?: string
  }>(),
  {
    label: 'Profile Image',
    helperText: '',
    accept: 'image/*',
    uploadLabel: 'Upload image',
    replaceLabel: 'Change image',
  },
)

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, 1)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-basic"
    :max-files="1"
    :accept="props.accept"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <p class="a-file-upload-basic__label">{{ props.label }}</p>

    <FileUpload.Context v-slot="context">
      <div class="a-file-upload-basic__row">
        <div class="a-file-upload-basic__avatar">
          <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0">
            <FileUpload.Item :file="context.acceptedFiles[0]">
              <FileUpload.ItemPreview type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-basic__avatar-image" />
              </FileUpload.ItemPreview>
            </FileUpload.Item>
          </FileUpload.ItemGroup>

          <i
            v-else
            class="i-lucide-user h-5 w-5 a-file-upload-basic__avatar-icon"
            aria-hidden="true"
          />
        </div>

        <FileUpload.Trigger class="a-file-upload-basic__trigger">
          {{ context.acceptedFiles.length > 0 ? props.replaceLabel : props.uploadLabel }}
        </FileUpload.Trigger>
      </div>

      <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0" class="a-file-upload-basic__meta">
        <FileUpload.Item :file="context.acceptedFiles[0]" class="a-file-upload-basic__meta-row">
          <FileUpload.ItemName class="a-file-upload-basic__name" />
          <span class="a-file-upload-basic__size">{{ formatFileSize(context.acceptedFiles[0].size) }}</span>
          <FileUpload.ItemDeleteTrigger class="a-file-upload-basic__remove">
            Remove
          </FileUpload.ItemDeleteTrigger>
        </FileUpload.Item>
      </FileUpload.ItemGroup>

      <p v-if="props.helperText" class="a-file-upload-basic__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-basic {
  display: grid;
  gap: 0.45rem;
}

.a-file-upload-basic__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-basic__row {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.a-file-upload-basic__avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.8rem;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.a-file-upload-basic__avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-basic__avatar-icon {
  color: var(--admin-muted-2);
}

.a-file-upload-basic__trigger {
  border: 1px solid var(--admin-brand);
  background: var(--admin-brand);
  color: #fff;
  border-radius: var(--admin-radius-md);
  padding: 0.45rem 0.72rem;
  font-size: var(--fs--1, 0.78rem);
  font-weight: 600;
  cursor: pointer;
}

.a-file-upload-basic__trigger:hover {
  filter: brightness(0.96);
}

.a-file-upload-basic__meta {
  display: grid;
}

.a-file-upload-basic__meta-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.a-file-upload-basic__name {
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
  max-width: 16rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.a-file-upload-basic__size {
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-file-upload-basic__remove {
  border: 0;
  background: transparent;
  color: #b42318;
  font-size: var(--fs--1, 0.78rem);
  cursor: pointer;
}

.a-file-upload-basic__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
