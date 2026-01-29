# BuilderFrame — Types
_Layout frame (rows/columns) for a builder page_
**Table:** `builderFrame`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `page` | `record<builderPage>` | yes | `""` |
| `parent` | `record<builderFrame>` | no | `""` |
| `order` | `number` | yes | `0` |
| `kind` | `enum<"frame" | "row" | "column">` | no | `"frame"` |
| `className` | `string` | no | `""` |
| `wrapperClass` | `string` | no | `""` |
| `elementId` | `string` | no | `""` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `BuilderFrameId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.