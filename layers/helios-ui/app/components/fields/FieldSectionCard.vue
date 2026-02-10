<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '',
  },
)
</script>

<template>
  <article class="a-card field-section-card">
    <h2 class="field-section-card__title">{{ title }}</h2>
    <p v-if="description" class="a-copy">{{ description }}</p>
    <div class="field-section-card__body">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.field-section-card__title {
  margin: 0;
  font-size: var(--fs-050, 1.16rem);
  letter-spacing: -0.01em;
  color: var(--admin-text);
  font-weight: 600;
}

.field-section-card__body {
  margin-top: 0.7rem;
}
</style>
