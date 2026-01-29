# Testimonial — Types
_Customer testimonials and quotes_
**Table:** `testimonial`
## Fields
| Field | Type | Required | Default |
| --- | --- | --- | --- |
| `name` | `string` | yes | `""` |
| `role` | `string` | no | `""` |
| `organisation` | `string` | no | `""` |
| `quote` | `string` | yes | `""` |
| `avatar` | `string` | no | `""` |
| `rating` | `number` | no | `0` |
| `order` | `number` | no | `0` |
| `active` | `boolean` | yes | `true` |
| `instances` | `array` | no | `[]` |
## ID
- Export name: `TestimonialId`
- Exported: yes
## Notes
- Types are inferred from the graph + generated specs.
- Record ids returned by SurrealDB are objects; pass the record sub-id (`record.id`) to routers.