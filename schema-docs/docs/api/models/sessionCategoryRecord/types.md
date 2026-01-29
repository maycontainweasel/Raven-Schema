# Session Category Record — Types
_Per-category performance in a session_
**Table:** `scr`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
| `qt` | `record<qt>` | yes | `""` |
| `attempts` | `number` | no | `0` |
| `noCorrect` | `number` | no | `0` |
| `noIncorrect` | `number` | no | `0` |
| `percCorrect` | `number` | no | `0` |
| `averageTime` | `number` | no | `0` |
| `totalTime` | `number` | no | `0` |
## ID
- Export name: `SessionCategoryRecordId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.