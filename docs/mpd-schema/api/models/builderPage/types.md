# BuilderPage — Types
_Page-level container for builder content_
**Table:** `builderPage`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | no | `""` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `BuilderPageId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.