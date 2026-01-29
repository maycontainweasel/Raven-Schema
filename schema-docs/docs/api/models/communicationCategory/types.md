# CommunicationCategory — Types
_Communication category catalogue (per environment)_
**Table:** `commCategory`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `"\"\" unique"` |
| `label` | `string` | yes | `""` |
| `description` | `string` | no | `""` |
| `sourceChannel` | `enum<"public" | "dashboard" | "session">` | yes | `"public"` |
| `category` | `enum<"general" | "help" | "question-feedback">` | yes | `"general"` |
| `defaultTags` | `array` | no | `[]` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
## ID
- Export name: `CommunicationCategoryId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.