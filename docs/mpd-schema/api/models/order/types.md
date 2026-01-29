# Order — Types
_Stripe-backed order record (single-item default)_
**Table:** `order`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `u` | `record<u>` | yes | `""` |
| `uSubscription` | `record<uSubscription>` | no | `""` |
| `exam` | `record<exam>` | no | `""` |
| `productID` | `record<product>` | no | `""` |
| `variantID` | `record<productVariant>` | no | `""` |
| `extensionID` | `record<extensionVariant>` | no | `""` |
| `type` | `enum<"product" | "subscribe" | "dashboard" | "extension" | "trial">` | no | `"product"` |
| `status` | `enum<"processing" | "completed" | "requires_action" | "refunded" | "cancelled" | "pending" | "paid" | "failed" | "canceled">` | no | `"processing"` |
| `currency` | `record<currency>` | no | `""` |
| `amountSubtotal` | `number` | no | `0` |
| `amountTax` | `number` | no | `0` |
| `amountDiscount` | `number` | no | `0` |
| `amountTotal` | `number` | no | `0` |
| `amountRefunded` | `number` | no | `0` |
| `stripeID` | `string` | no | `""` |
| `stripeOrderID` | `string` | no | `""` |
| `paymentIntentID` | `string` | no | `""` |
| `checkoutSessionID` | `string` | no | `""` |
| `chargeID` | `string` | no | `""` |
| `customerID` | `string` | no | `""` |
| `invoiceID` | `string` | no | `""` |
| `paymentMethodID` | `string` | no | `""` |
| `stripePriceID` | `string` | no | `""` |
| `stripeProductID` | `string` | no | `""` |
| `subscriptionID` | `string` | no | `""` |
| `receiptURL` | `string` | no | `""` |
| `couponApplied` | `boolean` | no | `false` |
| `couponCode` | `string` | no | `""` |
| `items` | `array` | no | `[]` |
| `access` | `object` | no |  |
| `userSnapshot` | `object` | no |  |
| `paymentSnapshot` | `object` | no |  |
| `events` | `array` | no | `[]` |
| `metadata` | `object` | no |  |
| `stripePayload` | `object` | no |  |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
| `instances` | `array<string>` | no | `[]` |
## ID
- Export name: `OrderId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.