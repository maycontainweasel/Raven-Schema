# Role — Types
_Primary Role entity representing a single Role._
**Table:** `role`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `label` | `string` | yes | `""` |
| `key` | `string` | yes | `""` |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.