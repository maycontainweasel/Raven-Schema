<template>
  <div class="min-h-screen bg-[var(--ds-bg)] text-ink type-default">
    <header class="border-b border-border bg-panel/80 backdrop-blur">
      <div class="mx-auto max-w-4xl gp-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-wide text-muted">Typography lab</div>
          <div class="fs-2 font-600">Type styles in context</div>
        </div>
        <a href="/scale" class="ui-btn-ghost">Back to scale</a>
      </div>
    </header>

    <main class="mx-auto max-w-4xl gp-3 flex flex-col g-2">
      <section class="ui-card gp-3 flex flex-col g-1">
        <h1 class="fs-6 font-700">Heading one</h1>
        <h2 class="fs-5 font-600">Heading two</h2>
        <h3 class="fs-4 font-600">Heading three</h3>
        <h4 class="fs-3 font-600">Heading four</h4>
        <h5 class="fs-2 font-600">Heading five</h5>
        <h6 class="fs-1 font-600">Heading six</h6>
        <p class="fs-0 text-muted">
          This paragraph uses the scale defaults. Adjust the scale settings to see how the rhythm
          shifts across breakpoints.
        </p>
        <small class="fs--1 text-muted">Small text example</small>
      </section>

      <section class="ui-card gp-3 flex flex-col g-1">
        <div class="text-xs uppercase tracking-wide text-muted">Lists + quotes</div>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante.
        </p>
        <ul class="list-disc pl-4">
          <li>Bullet one uses the base scale.</li>
          <li>Bullet two keeps the grid alignment.</li>
        </ul>
        <blockquote class="border-l-2 border-border pl-3 text-muted">
          “A consistent scale makes typography effortless.”
        </blockquote>
      </section>
    </main>
  </div>
</template>
