# Fruit — Types
_A basic fruit table_
**Table:** `fruit`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `fruitid` | `string` | yes | `""` |
| `name` | `string` | yes | `""` |
| `color` | `string` | yes | `""` |
| `taste` | `string` | yes | `""` |
| `price` | `number` | yes | `0` |
| `quantity` | `number` | yes | `0` |
## ID
- Export name: `FruitId`
- Exported: yes
- Structure: `"fruitid"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.