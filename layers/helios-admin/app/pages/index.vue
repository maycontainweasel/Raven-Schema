<script setup lang="ts">
const dashboardStats = [
  { id: 'records', label: 'Total Records', value: '12,840', delta: '+8.4% this week', tone: 'good' },
  { id: 'drafts', label: 'Draft Queue', value: '184', delta: '23 pending review', tone: 'warn' },
  { id: 'published', label: 'Published Today', value: '67', delta: 'Synced to search index', tone: 'good' },
  { id: 'errors', label: 'Sync Errors', value: '3', delta: 'Needs attention', tone: 'critical' },
]

const quickLinks = [
  { id: 'users', label: 'Manage Users', subtitle: 'Directory + profile workspace', to: '/admin/users' },
  { id: 'posts', label: 'Manage Posts', subtitle: 'Content lifecycle + visibility', to: '/admin/post' },
  { id: 'cars', label: 'Manage Cars', subtitle: 'Inventory and metadata', to: '/admin/car' },
  { id: 'models', label: 'Models', subtitle: 'Generate admin layouts', to: '/models' },
  { id: 'components', label: 'Components', subtitle: 'Field and action primitives', to: '/components' },
]
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero dashboard-hero">
      <div class="dashboard-hero__copy">
        <p class="a-eyebrow">Helios Admin</p>
        <h1 class="a-title">Operations Dashboard</h1>
        <p class="a-copy">
          Opinionated admin framework for rapid schema-driven UI generation. Move from directory views
          into record management pages with predictable workflows.
        </p>
      </div>
      <div class="dashboard-hero__actions">
        <NuxtLink class="a-btn a-btn--subtle" to="/models">
          Open Models
        </NuxtLink>
        <NuxtLink class="a-btn a-btn--primary" to="/fields">
          Fields Lab
        </NuxtLink>
      </div>
    </header>

    <div class="dashboard-stats">
      <article
        v-for="card in dashboardStats"
        :key="card.id"
        class="a-card stat-card"
      >
        <p class="a-eyebrow">{{ card.label }}</p>
        <p class="stat-card__value">{{ card.value }}</p>
        <p class="stat-card__delta" :class="`tone-${card.tone}`">{{ card.delta }}</p>
      </article>
    </div>

    <section class="a-card quick-links">
      <div class="quick-links__header">
        <h2 class="quick-links__title">Quick Access</h2>
        <span class="a-chip a-chip--success">Schema Ready</span>
      </div>
      <div class="quick-links__grid">
        <NuxtLink
          v-for="entry in quickLinks"
          :key="entry.id"
          :to="entry.to"
          class="quick-link"
        >
          <p class="quick-link__title">{{ entry.label }}</p>
          <p class="quick-link__subtitle">{{ entry.subtitle }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="dashboard-lower">
      <article class="a-card">
        <div class="quick-links__header">
          <h2 class="quick-links__title">Current Sprint</h2>
          <span class="a-chip a-chip--brand">Active</span>
        </div>
        <ul class="pulse-list">
          <li>
            <span>Field engine hardening</span>
            <strong>In progress</strong>
          </li>
          <li>
            <span>Directory generator wiring</span>
            <strong>Queued</strong>
          </li>
          <li>
            <span>Record template output</span>
            <strong>Queued</strong>
          </li>
        </ul>
      </article>

      <article class="a-card a-card--soft">
        <h2 class="quick-links__title">Performance Snapshot</h2>
        <p class="a-copy smt-025">Average admin response and indexing throughput.</p>
        <div class="meter-grid">
          <div>
            <p class="meter-grid__label">API latency</p>
            <p class="meter-grid__value">17ms</p>
          </div>
          <div>
            <p class="meter-grid__label">Write success</p>
            <p class="meter-grid__value">99.2%</p>
          </div>
          <div>
            <p class="meter-grid__label">Index lag</p>
            <p class="meter-grid__value">~4s</p>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.dashboard-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.dashboard-hero__copy {
  display: grid;
  gap: 0.45rem;
  max-width: 68ch;
}

.dashboard-hero__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.stat-card {
  display: grid;
  gap: 0.35rem;
}

.stat-card__value {
  margin: 0;
  font-size: var(--fs-150, 1.76rem);
  letter-spacing: -0.02em;
  font-weight: 700;
  color: var(--admin-text);
}

.stat-card__delta {
  margin: 0;
  font-size: var(--fs--075, 0.84rem);
  font-weight: 600;
}

.tone-good {
  color: color-mix(in srgb, var(--admin-success) 84%, black 16%);
}

.tone-warn {
  color: color-mix(in srgb, var(--admin-warning) 82%, #392508 18%);
}

.tone-critical {
  color: color-mix(in srgb, var(--admin-danger) 80%, #2f0e04 20%);
}

.quick-links {
  display: grid;
  gap: 0.7rem;
}

.quick-links__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.quick-links__title {
  margin: 0;
  font-size: var(--fs-050, 1.16rem);
  letter-spacing: -0.01em;
  color: var(--admin-text);
}

.quick-links__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.quick-link {
  display: block;
  text-decoration: none;
  border: 1px solid var(--admin-border-strong);
  border-radius: var(--admin-radius-md);
  background: color-mix(in srgb, var(--admin-surface) 95%, white 5%);
  padding: 0.78rem;
  color: var(--admin-text);
  transition: border-color 150ms ease, background 150ms ease, transform 120ms ease, box-shadow 180ms ease;
}

.quick-link__title {
  margin: 0;
  font-size: var(--fs-0, 1rem);
  font-weight: 700;
}

.quick-link__subtitle {
  margin: 0.24rem 0 0;
  color: var(--admin-muted);
  font-size: var(--fs--075, 0.86rem);
}

.quick-link:hover {
  border-color: color-mix(in srgb, var(--admin-brand) 34%, var(--admin-border) 66%);
  background: color-mix(in srgb, var(--admin-brand-soft) 34%, var(--admin-surface) 66%);
  transform: translateY(-1px);
  box-shadow: var(--admin-shadow-sm);
}

.dashboard-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 0.75rem;
}

.pulse-list {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.45rem;
}

.pulse-list li {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-sm);
  padding: 0.6rem 0.68rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  background: color-mix(in srgb, var(--admin-surface) 95%, white 5%);
  font-size: var(--fs--075, 0.86rem);
}

.pulse-list strong {
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.meter-grid {
  margin-top: 0.82rem;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  overflow: hidden;
}

.meter-grid > div {
  padding: 0.72rem 0.78rem;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  border-bottom: 1px solid var(--admin-border);
}

.meter-grid > div:last-child {
  border-bottom: 0;
}

.meter-grid__label {
  margin: 0;
  font-size: var(--fs--075, 0.84rem);
  color: var(--admin-muted);
}

.meter-grid__value {
  margin: 0;
  font-size: var(--fs-050, 1.18rem);
  font-weight: 700;
  color: var(--admin-text);
}

@media (max-width: 1100px) {
  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .dashboard-hero {
    flex-direction: column;
  }

  .quick-links__grid,
  .dashboard-lower {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .dashboard-stats {
    grid-template-columns: 1fr;
  }
}
</style>
