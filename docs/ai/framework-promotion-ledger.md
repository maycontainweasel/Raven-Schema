# Framework Promotion Ledger

Use this file to track schema-framework commits that should later be promoted into `origin/main`.

## Rules
- Only record framework-safe schema commits here.
- Keep consumer-app commits out of this ledger unless they were intentionally generalised back into schema.
- Update the ledger when a framework round is committed, and again when it is promoted.

## Columns
- `Commit`: git hash
- `Title`: short commit title
- `Scope`: what changed at framework level
- `Needs App Follow-up`: `yes` or `no`
- `Promoted To origin/main`: `yes` or `no`

## Entries

| Commit | Title | Scope | Needs App Follow-up | Promoted To origin/main |
| --- | --- | --- | --- | --- |
| `TBD` | Initialise MPDG authoring canon and validation | MPDG docs, skills, validation workflow, promotion ledger | yes | no |
