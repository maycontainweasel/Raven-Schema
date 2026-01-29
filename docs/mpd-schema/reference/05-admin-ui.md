Title: Admin UI Generation
Scope: global
Applies to: Admin UI, UI specs

Admin UI pages are generated from `config/ui/*.ui.yaml`.

Key concepts:
- **Overview pages** = Typesense directory
- **Single pages** = tabbed model editor
- **Overrides** = `app/components/models/<model>/overrides/*`

The generator merges UI specs with overrides so you can customize without losing regeneration.
