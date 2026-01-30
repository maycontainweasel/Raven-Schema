Title: Redis (Docker)
Scope: local
Applies to: Sessions, caching, background features (optional)

## Prereqs

- Docker running
- A compose file (commonly `docker-compose.redis.yml`) in the app root

## Start

```bash
docker compose -f docker-compose.redis.yml up -d
```

## Check health

```bash
docker compose -f docker-compose.redis.yml ps
docker exec -it schema-kit-redis redis-cli ping
```

Expected response:

```
PONG
```

## Stop

```bash
docker compose -f docker-compose.redis.yml down
```

## Connection defaults (local)

```bash
NUXT_REDIS_HOST=127.0.0.1
NUXT_REDIS_PORT=6379
NUXT_REDIS_PASSWORD=
NUXT_REDIS_FILE_LOGGING_ENABLED=false
```
