# FAQ — Types
_Primary FAQ entity representing a single FAQ_
**Table:** `faq`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `question` | `string` | yes | `""` |
| `answer` | `string` | yes | `""` |
| `category` | `string` | yes | `""` |
| `faqCategorys` | `array` | no | `[]` |
| `instances` | `array` | no | `[]` |
## ID
- Export name: `FAQId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.