# Announcement — Types
_Time-bound announcements shown across instances_
**Table:** `announcement`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | yes | `""` |
| `message` | `string` | yes | `""` |
| `style` | `enum<"banner" | "flyout" | "modal">` | yes | `"banner"` |
| `severity` | `enum<"info" | "success" | "warning" | "danger">` | yes | `"info"` |
| `dismissible` | `boolean` | yes | `true` |
| `startsAt` | `datetime` | no | `""` |
| `endsAt` | `datetime` | no | `""` |
| `active` | `boolean` | yes | `true` |
| `instances` | `array` | no | `[]` |
## ID
- Export name: `AnnouncementId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.