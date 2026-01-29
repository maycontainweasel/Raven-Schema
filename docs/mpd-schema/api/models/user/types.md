# User — Types
_A basic user table_
**Table:** `u`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `email` | `email` | yes | `""` |
| `password` | `password` | yes | `""` |
| `firstName` | `string` | yes | `""` |
| `surname` | `string` | yes | `""` |
| `role` | `record<role>` | no | `"student"` |
| `uniqueId` | `md5<$email>` | no |  |
| `customerId` | `string` | no | `""` |
| `instances` | `array<string>` | no | `"[select value instance from only type::record(\"instance\", \"local\")]"` |
## ID
- Export name: `UserId`
- Exported: yes
- Structure: `"email"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.