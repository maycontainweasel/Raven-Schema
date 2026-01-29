# Session Log — Types
_Session timeline container_
**Table:** `slog`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
## ID
- Export name: `SessionLogId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.