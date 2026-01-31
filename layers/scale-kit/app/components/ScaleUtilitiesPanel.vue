<template>
  <section class="ui-card gp-3 flex flex-col g-1">
    <div class="text-xs uppercase tracking-wide text-muted">Typography</div>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">Font sizes (fs-*)</div>
        <div class="fs-4 font-700">fs-4 The quick brown fox</div>
        <div class="fs-3 font-600">fs-3 The quick brown fox</div>
        <div class="fs-2 font-600">fs-2 The quick brown fox</div>
        <div class="fs-1">fs-1 The quick brown fox</div>
        <div class="fs-0 text-muted">fs-0 The quick brown fox</div>
        <div class="fs--05 text-muted">fs--05 The quick brown fox</div>
      </div>
      <div class="flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">Line height (lh-*)</div>
        <p class="fs-1 lh-0 text-muted">lh-0 line height example to show baseline rhythm.</p>
        <p class="fs-1 lh-05 text-muted">lh-05 slightly taller rhythm line height.</p>
        <p class="fs-1 lh-1 text-muted">lh-1 full grid unit + one step.</p>
      </div>
    </div>
  </section>

  <section class="ui-card gp-3 flex flex-col g-1">
    <div class="text-xs uppercase tracking-wide text-muted">Grid units (v-*)</div>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-panelSoft gp-1 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">v-1 height</div>
        <div class="bg-accentSoft rounded-md w-full" style="height: var(--v-1)"></div>
        <div class="text-xs text-muted">height: v-1</div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft gp-1 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">v-2 height</div>
        <div class="bg-accentSoft rounded-md w-full" style="height: var(--v-2)"></div>
        <div class="text-xs text-muted">height: v-2</div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft gp-1 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">v-3 height</div>
        <div class="bg-accentSoft rounded-md w-full" style="height: var(--v-3)"></div>
        <div class="text-xs text-muted">height: v-3</div>
      </div>
    </div>
  </section>

  <section class="ui-card gp-3 flex flex-col g-1">
    <div class="text-xs uppercase tracking-wide text-muted">Grid spacing (gp / gm / g)</div>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-panelSoft gp-2 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">gp-2</div>
        <div class="bg-accentSoft rounded-md h-8"></div>
        <div class="text-xs text-muted">padding via grid units</div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft gp-1 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">g-1 gap</div>
        <div class="flex flex-col g-1">
          <div class="bg-accentSoft rounded-md h-6"></div>
          <div class="bg-accentSoft rounded-md h-6"></div>
        </div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft gp-1">
        <div class="text-xs uppercase tracking-wide text-muted">gm-1 margin</div>
        <div class="bg-accentSoft rounded-md h-6 gm-1"></div>
      </div>
    </div>
  </section>

  <section class="ui-card gp-3 flex flex-col g-1">
    <div class="text-xs uppercase tracking-wide text-muted">Spacing scale (sp / sm / sg)</div>
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-panelSoft sp-2 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">sp-2</div>
        <div class="bg-accentSoft rounded-md h-8"></div>
        <div class="text-xs text-muted">padding via spacing scale</div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft sp-1 flex flex-col sg-1">
        <div class="bg-accentSoft rounded-md h-6"></div>
        <div class="bg-accentSoft rounded-md h-6"></div>
        <div class="text-xs text-muted">sg-1 gap</div>
      </div>
      <div class="rounded-lg border border-border bg-panelSoft sp-1">
        <div class="text-xs uppercase tracking-wide text-muted">sm-1 margin</div>
        <div class="bg-accentSoft rounded-md h-6 sm-1"></div>
      </div>
    </div>
  </section>
</template>
