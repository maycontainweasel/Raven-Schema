# Validation Checklist

Use this checklist when advancing the Lyric v2 program.

## Vision and boundary

- Schema v1 and Lyric v2 are described separately.
- The v1/v2 boundary is clear enough that tenant work does not accidentally drift into v2-only assumptions.
- The naming plan does not break current release/adoption tracking.

## Architecture

- The spec layer is explicitly documented as the stable internal contract.
- Plugin boundaries are stated clearly.
- Deterministic generation and agent-assisted generation are documented as separate lanes.

## Documentation and proving ground

- Every new capability documented for Lyric Docs maps to a capability in the inventory.
- Every important capability has a validation story, not just prose.
- Documentation work produces generator feedback, not only screenshots or narrative.
