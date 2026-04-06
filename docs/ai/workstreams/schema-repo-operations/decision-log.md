# Decision Log

## 2026-04-05

- `apps/schema` remains the only master control plane for schema framework promotion.
- Child schema repos keep both local `main` and local `app`.
- Child `main` mirrors shared `origin/main`.
- Child `app` is the integrated app branch and should always contain the latest shared framework.
- Shared framework releases continue to use the `schema-master-000N` counter.
- The master repo keeps one machine-readable registry at `docs/ai/repo-registry.yaml`.
- Cross-repo maintenance is implemented as scripts plus repo-local skills, not docs alone.
