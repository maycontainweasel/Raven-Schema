# Session — Types
_Core session record (user-specific)_
**Table:** `s`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `uuid` | `string` | yes | `""` |
| `title` | `string` | yes | `"New Session"` |
| `mode` | `enum<"learn" | "exam">` | yes | `"learn"` |
| `state` | `enum<"untouched" | "in-progress" | "paused" | "complete">` | yes | `"untouched"` |
| `active` | `boolean` | yes | `true` |
| `dateCreated` | `datetime` | yes | `""` |
| `dateLastActive` | `datetime` | no | `""` |
| `dateLastTouch` | `datetime` | no | `""` |
| `dateCompleted` | `datetime` | no | `""` |
| `index` | `number` | no | `0` |
| `qTotal` | `number` | yes | `0` |
| `familiarity` | `enum<"all" | "new" | "incorrect">` | yes | `"all"` |
| `u` | `record<u>` | yes | `""` |
| `exams` | `array<record<exam>>` | no | `[]` |
| `categories` | `array<{ id: record<exam>, categories: record<qt>[] }>` | no | `[]` |
| `timing` | `object` | no |  |
| `qids` | `array<record<q>>` | no | `[]` |
| `qidsInit` | `boolean` | no | `false` |
| `qActiveID` | `record<q>` | no | `""` |
## ID
- Export name: `SessionId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.