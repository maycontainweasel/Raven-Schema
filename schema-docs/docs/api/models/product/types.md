# Product — Types
_Exam product (local, Stripe-linked)_
**Table:** `product`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `""` |
| `slug` | `string` | no | `""` |
| `title` | `string` | yes | `""` |
| `description` | `string` | no | `""` |
| `stripePID` | `string` | no | `""` |
| `instances` | `array<string>` | no | `[]` |
## ID
- Export name: `ProductId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.