# Notification — Types
_Dashboard notifications and updates_
**Table:** `notification`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | yes | `""` |
| `summary` | `string` | no | `""` |
| `body` | `string` | yes | `""` |
| `image` | `string` | no | `""` |
| `ctaLabel` | `string` | no | `""` |
| `ctaUrl` | `string` | no | `""` |
| `publishAt` | `datetime` | no | `""` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
| `instances` | `array` | no | `[]` |
## ID
- Export name: `NotificationId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.