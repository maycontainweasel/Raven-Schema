# ExtensionProduct — Types
_Extension Stripe product per variant_
**Table:** `extensionProduct`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `productKey` | `string` | yes | `""` |
| `examKey` | `string` | yes | `""` |
| `product` | `record<product>` | yes | `""` |
| `exam` | `record<exam>` | yes | `""` |
| `productVariant` | `record<productVariant>` | yes | `""` |
| `period` | `int` | yes | `0` |
| `currency` | `record<currency>` | yes | `""` |
| `stripePID` | `string` | no | `""` |
## ID
- Export name: `ExtensionProductId`
- Exported: yes
- Structure: `"stringID<productKey, period, currency>"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.