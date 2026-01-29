# CommunicationTaxonomy — Types
_Communication taxonomy for environments and subcategories_
**Table:** `commTaxonomy`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `"\"\" unique"` |
| `label` | `string` | yes | `""` |
| `type` | `enum<"environment" | "category" | "subcategory">` | yes | `"subcategory"` |
| `category` | `enum<"general" | "help" | "question-feedback">` | no | `""` |
| `sourceChannel` | `enum<"public-contact" | "dashboard-help" | "question-feedback">` | no | `""` |
| `parentKey` | `string` | no | `""` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.