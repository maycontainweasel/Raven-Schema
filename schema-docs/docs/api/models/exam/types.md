# Exam — Types
_Primary exam entity representing a single exam and its display metadata_
**Table:** `exam`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `""` |
| `title` | `string` | yes | `""` |
| `titleShort` | `string` | no | `""` |
| `description` | `string` | no | `""` |
| `college` | `string` | no | `""` |
| `sheetId` | `string` | no | `""` |
| `qidIndex` | `number` | yes | `0` |
| `order` | `number` | no | `0` |
| `instances` | `array` | no | `[]` |
| `colours` | `object` | no |  |
## ID
- Export name: `ExamId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.