<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: '',
    description: '',
  },
)

const hasTitle = computed(() => String(props.title || '').trim().length > 0)
const hasDescription = computed(() => String(props.description || '').trim().length > 0)
const hasHeader = computed(() => hasTitle.value || hasDescription.value)
</script>

<template>
  <article class="a-card field-section-card">
    <div v-if="hasHeader" class="field-section-card__head">
      <h2 v-if="hasTitle" class="field-section-card__title">{{ title }}</h2>
      <p v-if="hasDescription" class="a-copy field-section-card__description">{{ description }}</p>
    </div>
    <div class="field-section-card__body" :class="hasHeader ? 'field-section-card__body--with-head' : ''">
      <slot />
    </div>
  </article>
</template>

<style scoped>
.field-section-card__head {
  display: grid;
  gap: 0.3rem;
}

.field-section-card__title {
  margin: 0;
  font-size: var(--fs-050, 1.16rem);
  letter-spacing: -0.01em;
  color: var(--admin-text);
  font-weight: 600;
}

.field-section-card__description {
  margin: 0;
}

.field-section-card__body {
  margin-top: 0;
}

.field-section-card__body--with-head {
  margin-top: 0.7rem;
}
</style>
