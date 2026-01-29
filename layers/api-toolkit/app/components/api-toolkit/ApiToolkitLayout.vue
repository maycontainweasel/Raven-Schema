<script setup lang="ts">
const props = withDefaults(defineProps<{
  containerClass?: string
  leftClass?: string
  centerClass?: string
  rightClass?: string
  leftWidth?: string
  rightWidth?: string
}>(), {
  leftWidth: 'w-80',
  rightWidth: 'w-[420px]',
})

const containerClasses = computed(() => [
  'flex h-[calc(100vh-60px)] w-full -m-6 overflow-hidden',
  props.containerClass,
])

const leftClasses = computed(() => [
  'flex h-full flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-surface)]',
  props.leftWidth,
  props.leftClass,
])

const centerClasses = computed(() => [
  'flex min-h-0 min-w-0 flex-1 flex-col',
  props.centerClass,
])

const rightClasses = computed(() => [
  'h-full',
  props.rightWidth,
  props.rightClass,
])
</script>

<template>
  <div :class="containerClasses">
    <aside :class="leftClasses">
      <slot name="left" />
    </aside>

    <section :class="centerClasses">
      <slot name="center" />
    </section>

    <aside :class="rightClasses">
      <slot name="right" />
    </aside>
  </div>
</template>
