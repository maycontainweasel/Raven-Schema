# Session Performance Record — Types
_Aggregate session performance_
**Table:** `spr`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
| `u` | `record<u>` | yes | `""` |
| `qTotal` | `number` | yes | `0` |
| `attempts` | `number` | no | `0` |
| `noCorrect` | `number` | no | `0` |
| `noIncorrect` | `number` | no | `0` |
| `noComplete` | `number` | no | `0` |
| `noIncomplete` | `number` | no | `0` |
| `percComplete` | `number` | no | `0` |
| `percCorrect` | `number` | no | `0` |
| `percCorrectAttempted` | `number` | no | `0` |
| `totalSessionTime` | `number` | no | `0` |
| `averageTimePerQ` | `number` | no | `0` |
## ID
- Export name: `SessionPerformanceRecordId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.