<script setup lang="ts">
import { FileUpload } from '@ark-ui/vue/file-upload'
import { computed } from 'vue'

const model = defineModel<File[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    helperText?: string
    accept?: string
    size?: number
  }>(),
  {
    label: 'Avatar',
    helperText: '',
    accept: 'image/*',
    size: 96,
  },
)

const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const onFileChange = (details: { acceptedFiles: File[] }) => {
  model.value = details.acceptedFiles.slice(0, 1)
}
</script>

<template>
  <FileUpload.Root
    class="a-file-upload-avatar"
    :max-files="1"
    :accept="props.accept"
    :accepted-files="model"
    @file-change="onFileChange"
  >
    <p class="a-file-upload-avatar__label">{{ props.label }}</p>

    <FileUpload.Context v-slot="context">
      <div class="a-file-upload-avatar__frame" :style="avatarStyle">
        <FileUpload.Trigger class="a-file-upload-avatar__trigger">
          <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0">
            <FileUpload.Item :file="context.acceptedFiles[0]">
              <FileUpload.ItemPreview type="image/*">
                <FileUpload.ItemPreviewImage class="a-file-upload-avatar__image" />
              </FileUpload.ItemPreview>
            </FileUpload.Item>
          </FileUpload.ItemGroup>

          <i
            v-else
            class="i-lucide-user h-6 w-6 a-file-upload-avatar__placeholder"
            aria-hidden="true"
          />
        </FileUpload.Trigger>

        <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0">
          <FileUpload.Item :file="context.acceptedFiles[0]">
            <FileUpload.ItemDeleteTrigger class="a-file-upload-avatar__delete" aria-label="Remove avatar">
              <i class="i-lucide-x h-4 w-4" aria-hidden="true" />
            </FileUpload.ItemDeleteTrigger>
          </FileUpload.Item>
        </FileUpload.ItemGroup>
      </div>

      <FileUpload.ItemGroup v-if="context.acceptedFiles.length > 0" class="a-file-upload-avatar__name-wrap">
        <FileUpload.Item :file="context.acceptedFiles[0]">
          <FileUpload.ItemName class="a-file-upload-avatar__name" />
        </FileUpload.Item>
      </FileUpload.ItemGroup>

      <p v-if="props.helperText" class="a-file-upload-avatar__helper">{{ props.helperText }}</p>
    </FileUpload.Context>

    <FileUpload.HiddenInput />
  </FileUpload.Root>
</template>

<style scoped>
.a-file-upload-avatar {
  display: grid;
  justify-items: start;
  gap: 0.45rem;
}

.a-file-upload-avatar__label {
  margin: 0;
  color: var(--admin-text);
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
}

.a-file-upload-avatar__frame {
  position: relative;
}

.a-file-upload-avatar__trigger {
  width: 100%;
  height: 100%;
  border-radius: 1rem;
  border: 2px dashed var(--admin-border-strong);
  background: var(--admin-surface-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.a-file-upload-avatar__trigger:hover {
  background: color-mix(in srgb, var(--admin-surface-soft) 86%, white 14%);
}

.a-file-upload-avatar__placeholder {
  color: var(--admin-muted-2);
}

.a-file-upload-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.a-file-upload-avatar__delete {
  position: absolute;
  top: -0.45rem;
  right: -0.45rem;
  width: 1.55rem;
  height: 1.55rem;
  border: 0;
  border-radius: 999px;
  background: #0f172a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.a-file-upload-avatar__name-wrap {
  max-width: 10rem;
}

.a-file-upload-avatar__name {
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.a-file-upload-avatar__helper {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}
</style>
