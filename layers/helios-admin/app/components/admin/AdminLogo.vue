<template>
  <div class="admin-logo">
    <span class="admin-logo__glyph">
      <AdminIcon name="layers" :size="15" />
    </span>
    <div class="admin-logo__text">
      <p class="admin-logo__kicker">Helios</p>
      <p class="admin-logo__title">Admin Turbo</p>
    </div>
  </div>
</template>

<style scoped>
.admin-logo {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: 0.56rem;
}

.admin-logo__glyph {
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

.admin-logo__text {
  min-width: 0;
}

.admin-logo__kicker {
  margin: 0;
  font-size: var(--fs--1, 0.78rem);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--admin-muted);
  font-weight: 700;
  line-height: 1.05;
}

.admin-logo__title {
  margin: 0.08rem 0 0;
  font-size: var(--fs-025, 1.05rem);
  color: var(--admin-text);
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
