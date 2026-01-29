# CommunicationEnvironment — Types
_Communication environment catalogue (public/dashboard/session)_
**Table:** `commEnv`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `"\"\" unique"` |
| `label` | `string` | yes | `""` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
## ID
- Export name: `CommunicationEnvironmentId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.