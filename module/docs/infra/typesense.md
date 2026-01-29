Title: Typesense (Docker)
Scope: local
Applies to: Schema‑kit Typesense collections + admin UI

## Prereqs

- Docker running
- A compose file (commonly `docker-compose.typesense.yml`) in the app root

## Start

```bash
docker compose -f docker-compose.typesense.yml up -d
```

## Check health

```bash
docker compose -f docker-compose.typesense.yml ps
curl http://localhost:8109/health
```

Expected response:

```
{"ok":true}
```

## Stop

```bash
docker compose -f docker-compose.typesense.yml down
```

## Connection defaults (local)

- Host: `http://localhost:8109`
- API key: `TypesenseBurntMyMoustache2025`

## Minimal API smoke test

Create a collection:

```bash
curl -X POST "http://localhost:8109/collections" \
  -H "X-TYPESENSE-API-KEY: TypesenseBurntMyMoustache2025" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "exams",
    "fields": [
      {"name": "id", "type": "string"},
      {"name": "title", "type": "string"}
    ]
  }'
```

Search:

```bash
curl "http://localhost:8109/collections/exams/documents/search?q=man&query_by=title" \
  -H "X-TYPESENSE-API-KEY: TypesenseBurntMyMoustache2025"
```
