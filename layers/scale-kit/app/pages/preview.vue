<template>
  <div class="min-h-screen bg-[var(--ds-bg)] text-ink type-default">
    <header class="border-b border-border bg-panel/80 backdrop-blur">
      <div class="mx-auto max-w-5xl gp-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-wide text-muted">Helios kit</div>
          <div class="fs-2 font-600">Preview canvas</div>
        </div>
        <div class="flex items-center gap-2">
          <a href="/scale" class="ui-btn-ghost">Scale setup</a>
          <button class="ui-btn-primary">Launch</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl gp-3 flex flex-col g-3">
      <section class="ui-card gp-3 flex flex-col g-1">
        <div class="ui-pill">System preview</div>
        <div class="fs-4 font-600">
          Build layouts entirely from atomic tokens.
        </div>
        <div class="text-muted fs-1">
          The typography, spacing, and component system are driven by the scale and design tokens.
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="ui-btn-primary">Primary</button>
          <button class="ui-btn-soft">Soft</button>
          <button class="ui-btn-ghost">Ghost</button>
        </div>
      </section>

      <section class="grid gap-3 md:grid-cols-3">
        <div class="ui-card gp-2 flex flex-col g-1 shadow-ds-sm">
          <div class="text-xs uppercase tracking-wide text-muted">Token</div>
          <div class="fs-2 font-600">Shadows</div>
          <div class="text-muted">Shadow depth is bound to design tokens.</div>
        </div>
        <div class="ui-card gp-2 flex flex-col g-1 shadow-ds-md">
          <div class="text-xs uppercase tracking-wide text-muted">Token</div>
          <div class="fs-2 font-600">Radii</div>
          <div class="text-muted">Radii update everywhere with one tweak.</div>
        </div>
        <div class="ui-card gp-2 flex flex-col g-1 shadow-ds-lg">
          <div class="text-xs uppercase tracking-wide text-muted">Token</div>
          <div class="fs-2 font-600">Colors</div>
          <div class="text-muted">Color variables drive all utilities.</div>
        </div>
      </section>

      <section class="ui-card gp-3 flex flex-col g-2">
        <div class="fs-2 font-600">Admin-style stack</div>
        <div class="grid gap-2 md:grid-cols-[220px,1fr]">
          <div class="ui-card gp-2 flex flex-col g-1">
            <div class="text-xs uppercase tracking-wide text-muted">Navigation</div>
            <div class="flex flex-col g-05">
              <button class="ui-btn-ghost justify-start">Dashboard</button>
              <button class="ui-btn-ghost justify-start">Billing</button>
              <button class="ui-btn-ghost justify-start">Settings</button>
            </div>
          </div>
          <div class="ui-card gp-2 flex flex-col g-1">
            <div class="text-xs uppercase tracking-wide text-muted">Overview</div>
            <div class="fs-3 font-600">Card preview</div>
            <div class="text-muted">All spacing is driven by scale utilities like gp-2 and g-1.</div>
            <div class="flex flex-wrap gap-2">
              <div class="ui-pill">Scale aware</div>
              <div class="ui-pill">Tokens synced</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
