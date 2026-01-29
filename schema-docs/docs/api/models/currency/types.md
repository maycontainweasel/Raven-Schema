# Currency — Types
_Primary currency entity representing a single currency_
**Table:** `currency`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `code` | `string` | yes | `""` |
| `name` | `string` | yes | `""` |
| `symbol` | `string` | yes | `""` |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.