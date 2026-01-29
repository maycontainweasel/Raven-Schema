# Session Charter — Types
_Session creation settings (optional)_
**Table:** `sc`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `s` | `record<s>` | yes | `""` |
| `mode` | `enum<"learn" | "exam">` | yes | `"learn"` |
| `familiarity` | `enum<"all" | "new" | "incorrect">` | yes | `"all"` |
| `qTotal` | `number` | yes | `0` |
| `exams` | `array<record<exam>>` | no | `[]` |
| `categories` | `array<{ id: record<exam>, categories: record<qt>[] }>` | no | `[]` |
| `timing` | `object` | no |  |
## ID
- Export name: `SessionCharterId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.