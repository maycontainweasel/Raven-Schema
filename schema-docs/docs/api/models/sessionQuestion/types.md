# Session Question — Types
_Session-specific question metadata_
**Table:** `SessionQuestions`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
| `q` | `record<q>` | yes | `""` |
| `order` | `number` | yes | `0` |
| `flagged` | `boolean` | no | `false` |
| `complete` | `boolean` | no | `false` |
| `startTS` | `datetime` | no | `""` |
| `answerTS` | `datetime` | no | `""` |
| `totalTime` | `number` | no | `0` |
| `lastUpdated` | `datetime` | no | `""` |
## ID
- Export name: `SessionQuestionId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.