# Organisation — Types
_Company/organisation record_
**Table:** `organisation`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `title` | `string` | yes | `""` |
| `slug` | `string` | yes | `""` |
| `description` | `string` | no | `""` |
| `website` | `string` | no | `""` |
| `email` | `string` | no | `""` |
| `phone` | `string` | no | `""` |
| `industry` | `string` | no | `""` |
| `size` | `string` | no | `""` |
| `logo` | `string` | no | `""` |
| `address` | `object` | no |  |
| `instances` | `array<string>` | no | `[]` |
| `active` | `boolean` | yes | `true` |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `OrganisationId`
- Exported: yes
- Structure: `"slug"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.