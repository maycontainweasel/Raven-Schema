# Post — Types
_A Post is the content connected to a record for use in content management systems._
**Table:** `p`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `contentTable` | `string` | no | `"record::tb($id)"` |
| `contentId` | `string` | no | `"record::id($id)"` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
| `publishedAt` | `datetimee` | no | `null` |
| `title` | `string` | no | `"{\n  $title ?? record::id($id)\n}"` |
| `permalink` | `string` | no | `"{\n  if($title) {\n      string::slug(<string> $title)\n  } else {\n      string::slug(<string> record::id($id))\n  }\n}"` |
| `status` | `enum<"draft" | "publish">` | no | `"draft"` |
## ID
- Export name: `__NAME__ID`
- Exported: yes
- Structure: `"fn::PID($id)"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.