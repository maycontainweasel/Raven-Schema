Title: Local Infra (Docker)
Scope: local
Applies to: Typesense, Redis (optional), local dev

This folder contains quick primers for infra services that Schema‑kit can use.

If a compose file is present in the target app root, you can start it with:

```bash
docker compose -f <compose-file> up -d
```

Stop it with:

```bash
docker compose -f <compose-file> down
```

See:
- `typesense.md`
- `redis.md`
