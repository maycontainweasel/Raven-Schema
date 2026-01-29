# Fact — Types
_Short factual content snippets for dashboards and marketing_
**Table:** `fact`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | yes | `""` |
| `body` | `string` | yes | `""` |
| `source` | `string` | no | `""` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
| `instances` | `array` | no | `[]` |
## ID
- Export name: `FactId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.