# Decision Log

## 2026-04-09

### Schema v1.5 established

- Created `schema-v1-5` as the hardening lane between current Schema v1 delivery and the longer-term Lyric v2 redesign.

### Design dump terminology

- Chosen term: `design-dumps`
- Purpose: capture important problems, nuances, and ideas quickly before they are fully consolidated into canon docs.

### Anti-pattern tracking

- Added an explicit anti-pattern surface so recurring mistakes can be documented and reviewed rather than rediscovered repeatedly.

### Router flow hardening direction

- Router and request-shape problems should be treated as end-to-end contract issues, not only isolated Surreal function issues.
- The preferred response is to verify helper, router, controller, and end-to-end layers together.
