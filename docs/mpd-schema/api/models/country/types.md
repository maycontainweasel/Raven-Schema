# Country — Types
_Primary country entity representing a single country_
**Table:** `country`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | `string` | yes | `""` |
| `code` | `string` | yes | `""` |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.