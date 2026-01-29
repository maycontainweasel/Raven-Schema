# StripeProduct — Types
_Stripe product payload snapshot_
**Table:** `stripeProduct`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `product` | `record<product>` | yes | `""` |
| `productVariant` | `record<productVariant>` | no | `""` |
| `stripeProduct` | `object` | yes |  |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.