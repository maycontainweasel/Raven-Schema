# StripePrice — Types
_Stripe price payload snapshot_
**Table:** `stripePrice`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `stripePID` | `string` | yes | `""` |
| `product` | `record<product>` | yes | `""` |
| `connectionType` | `enum<"variant" | "extension">` | yes | `"variant"` |
| `price` | `object` | yes |  |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.