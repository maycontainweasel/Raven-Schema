# Attempt — Types
_Question attempts (core analytic primitive)_
**Table:** `attempt`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
| `q` | `record<q>` | yes | `""` |
| `u` | `record<u>` | yes | `""` |
| `selectedOptionID` | `record<qo>` | yes | `""` |
| `correct` | `boolean` | no | `false` |
| `order` | `number` | no | `0` |
| `startTS` | `datetime` | no | `""` |
| `answerTS` | `datetime` | no | `""` |
| `totalTime` | `number` | no | `0` |
| `create_at` | `datetime` | no | `""` |
| `exams` | `array<record<exam>>` | no | `[]` |
| `examsTerms` | `array<object>` | no | `[]` |
| `categories` | `array<{ id: record<exam>, categories: record<qt>[] }>` | no | `[]` |
| `_reconciliationKey` | `string` | no | `""` |
## ID
- Export name: `AttemptId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.