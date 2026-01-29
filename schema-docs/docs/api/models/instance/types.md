# Instance — Types
_Website instance configuration (module overlay)_
**Table:** `instance`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `""` |
| `instance` | `string` | no | `"$key"` |
| `title` | `string` | yes | `""` |
| `status` | `enum<"active" | "inactive" | "maintenance">` | no | `"active"` |
| `active` | `boolean` | no | `true` |
## ID
- Export name: `InstanceId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.