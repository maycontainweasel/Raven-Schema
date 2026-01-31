<template>
  <div class="min-h-screen bg-[#f5f6fb] text-ink type-default">
    <header class="border-b border-border bg-panel/80 backdrop-blur">
      <div class="mx-auto max-w-5xl gp-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-wide text-muted">Helios</div>
          <div class="fs-2 font-600">Utility Reference</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="ui-btn-ghost">Docs</button>
          <a href="/scale" class="ui-btn-primary">Scale setup</a>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl gp-3 flex flex-col g-2">
      <ScaleUtilitiesPanel />
    </main>
  </div>
</template>
