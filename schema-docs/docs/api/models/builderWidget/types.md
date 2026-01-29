# BuilderWidget — Types
_Content widget tied to a frame_
**Table:** `builderWidget`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `frame` | `record<builderFrame>` | yes | `""` |
| `order` | `number` | yes | `0` |
| `type` | `enum<"html" | "heading" | "text" | "spacer" | "list-ordered" | "list-unordered" | "image">` | yes | `"html"` |
| `data` | `object` | no |  |
| `className` | `string` | no | `""` |
| `wrapperClass` | `string` | no | `""` |
| `elementId` | `string` | no | `""` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `BuilderWidgetId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.