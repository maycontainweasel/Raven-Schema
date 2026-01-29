# ProductVariant — Types
_Price variant (period + currency)_
**Table:** `productVariant`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `productKey` | `string` | yes | `""` |
| `examKey` | `string` | yes | `""` |
| `product` | `record<product>` | yes | `""` |
| `exam` | `record<exam>` | yes | `""` |
| `period` | `int` | yes | `0` |
| `currency` | `record<currency>` | yes | `""` |
| `value` | `number` | yes | `0` |
| `label` | `string` | no | `""` |
| `stripePriceID` | `string` | no | `""` |
## ID
- Export name: `ProductVariantId`
- Exported: yes
- Structure: `"stringID<productKey, period, currency>"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.