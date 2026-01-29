# Organisation User — Types
_User membership in an organisation_
**Table:** `OrganisationUsers`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `organisation` | `record<organisation>` | yes | `""` |
| `u` | `record<u>` | yes | `""` |
| `role` | `enum<"member" | "admin" | "owner">` | yes | `"member"` |
| `addedAt` | `datetime` | no | `"time::now()"` |
## ID
- Export name: `OrganisationUserId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.