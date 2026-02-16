<template>
  <span class="admin-logo-icon" aria-hidden="true">
    <AdminIcon name="layers" :size="15" />
  </span>
</template>

<style scoped>
.admin-logo-icon {
  width: 2rem;
  height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  color: #ffffff;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--admin-brand) 86%, white 14%) 0%,
      color-mix(in srgb, var(--admin-brand) 60%, #20255a 40%) 100%
    );
  box-shadow:
    0 7px 18px color-mix(in srgb, var(--admin-brand) 25%, transparent),
    inset 0 0 0 1px rgba(255, 255, 255, 0.26);
}
</style>
