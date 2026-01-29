# CommunicationThread — Types
_Unified communication thread for admin inbox_
**Table:** `commThread`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `subject` | `string` | yes | `""` |
| `category` | `enum<"general" | "help" | "question-feedback">` | yes | `"general"` |
| `subcategory` | `string` | no | `"other"` |
| `tags` | `array` | no | `[]` |
| `sourceChannel` | `enum<"public" | "dashboard" | "session">` | yes | `"public"` |
| `sourceInstance` | `string` | yes | `""` |
| `sourceContext` | `object` | no |  |
| `contactProfile` | `object` | yes |  |
| `status` | `enum<"new" | "open" | "pending" | "closed" | "archived">` | no | `"new"` |
| `priority` | `enum<"low" | "normal" | "high">` | no | `"normal"` |
| `assignedAdmin` | `record<u>` | no | `""` |
| `unreadAdminCount` | `number` | no | `0` |
| `firstMessage` | `record<commMessage>` | no | `""` |
| `lastMessage` | `record<commMessage>` | no | `""` |
| `messageIds` | `array` | no | `[]` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
| `lastMessageAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `CommunicationThreadId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.