<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <Toaster
    position="top-right"
    rich-colors
    close-button
    :expand="false"
    :visible-toasts="6"
    :duration="2800"
    :toast-options="{
      class: 'helios-toast',
    }"
  />
</template>
