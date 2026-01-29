# Question — Types
_A basic question table_
**Table:** `q`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `qid` | `number` | yes | `0` |
| `qCode` | `string` | no | `""` |
| `question` | `string` | yes | `""` |
| `explanation` | `string` | no | `""` |
| `explanationRef` | `string` | no | `""` |
| `source` | `string` | no | `""` |
| `instances` | `array<string>` | no | `[]` |
| `testobject` | `object` | no |  |
| `tags` | `array<record<term>>` | no |  |
## ID
- Export name: `QuestionId`
- Exported: yes
- Structure: `"qid"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.