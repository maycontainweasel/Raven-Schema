# CommunicationMessage — Types
_Message inside a communication thread_
**Table:** `commMessage`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `thread` | `record<commThread>` | yes | `""` |
| `direction` | `enum<"inbound" | "outbound" | "system">` | no | `"inbound"` |
| `authorProfile` | `object` | no |  |
| `body` | `string` | yes | `""` |
| `richBody` | `object` | no |  |
| `metadata` | `object` | no |  |
| `tags` | `array` | no | `[]` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `readAt` | `datetime` | no | `""` |
## ID
- Export name: `CommunicationMessageId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.