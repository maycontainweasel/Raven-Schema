# Validation Checklist

- `repo-registry.yaml` loads and contains every managed child repo.
- `schema:repos:list` prints the registry cleanly.
- `schema:repos:audit -- <repo-key>` reports branch, remote, dirty, and release-marker state.
- `schema:repos:sync -- <repo-key> --apply` refuses unsafe states instead of mutating blindly.
- `schema:repos:fanout` can target multiple child repos from the master repo.
- `schema:repos:promote -- <repo-key>` classifies framework-safe versus app-owned changes.
- `AGENTS.md` and `docs/AI-READ-HERE.md` point fresh AIs to the control-plane files.
- `docs/ai/skills/README.md` exposes the repo-maintenance skills.
