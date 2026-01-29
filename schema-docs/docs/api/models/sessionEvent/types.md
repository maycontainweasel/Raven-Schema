# Session Event — Types
_Timeline event for a session_
**Table:** `se`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `action` | `string` | yes | `""` |
| `time` | `datetime` | yes | `""` |
| `payload` | `object` | no |  |
| `q` | `record<q>` | no | `""` |
| `sq` | `record<SessionQuestions>` | no | `""` |
## ID
- Export name: `SessionEventId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.