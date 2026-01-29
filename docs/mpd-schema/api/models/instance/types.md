# Instance — Types
_Website instance configuration (deployment settings)_
**Table:** `instance`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `key` | `string` | yes | `""` |
| `instance` | `string` | yes | `""` |
| `title` | `string` | yes | `""` |
| `status` | `enum<"active" | "inactive" | "maintenance">` | yes | `"active"` |
| `active` | `boolean` | yes | `true` |
| `flag` | `string` | no | `""` |
| `description` | `string` | no | `""` |
| `domains` | `array<string>` | no | `[]` |
| `primaryDomain` | `string` | no | `""` |
| `locale` | `string` | no | `"en-GB"` |
| `timezone` | `string` | no | `"Europe/London"` |
| `currency` | `string` | no | `"GBP"` |
| `currencies` | `array<string>` | no | `[]` |
| `pricingOptions` | `array<number>` | no | `[]` |
| `apiKeys` | `object` | no |  |
| `surrealdb` | `object` | no |  |
| `redis` | `object` | no |  |
| `content` | `object` | no |  |
| `createdAt` | `datetime` | no | `"time::now()"` |
| `updatedAt` | `datetime` | no | `"time::now()"` |
| `createdBy` | `string` | no | `""` |
| `instances` | `array<string>` | no | `"[select value instance from only type::record(\"instance\", \"local\")]"` |
## ID
- Export name: `InstanceId`
- Exported: yes
- Structure: `"key"`
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.