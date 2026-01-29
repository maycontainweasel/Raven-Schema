# ExtensionVariant — Types
_Extension price (days + price)_
**Table:** `extensionVariant`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `productKey` | `string` | yes | `""` |
| `examKey` | `string` | yes | `""` |
| `product` | `record<product>` | yes | `""` |
| `exam` | `record<exam>` | yes | `""` |
| `productVariant` | `record<productVariant>` | yes | `""` |
| `extensionProduct` | `record<extensionProduct>` | yes | `""` |
| `period` | `int` | yes | `0` |
| `currency` | `record<currency>` | yes | `""` |
| `numberOfDays` | `int` | yes | `0` |
| `value` | `number` | yes | `0` |
| `stripePriceID` | `string` | no | `""` |
## ID
- Export name: `ExtensionVariantId`
- Exported: yes
- Structure: `"stringID<productKey, period, currency, numberOfDays>"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.