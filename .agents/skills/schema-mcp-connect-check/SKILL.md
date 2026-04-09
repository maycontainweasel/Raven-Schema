---
name: schema-mcp-connect-check
description: Use when a schema-controlled MCP server must be verified for connectivity, configuration, and safe usage assumptions.
---

# Schema MCP Connect Check

## Goal
Verify that an MCP server used by the schema ecosystem is configured and reachable in the intended way.

## Use when
- Adding or changing MCP configuration.
- Debugging database-backed schema tooling that depends on MCP.
- Verifying repo-local MCP export output.

## Do not use when
- The task is unrelated to MCP connectivity or usage.

## Read first
1. `docs/ai/workstreams/schema-operating-system/implementation-plan.md`
2. `docs/ai/versioning-model.md`

## Default behavior
- Identify the MCP server name, source config, and expected endpoint.
- Verify configuration before claiming connectivity.
- Report whether the MCP server is schema-managed or tenant-local.

## Ask first if
- Verification would touch production credentials or endpoints.
- The MCP endpoint is shared across multiple environments and the safe target is unclear.

## Validation
- The config source is correct.
- The expected endpoint is reachable.
- Any approval-mode or tool-surface assumptions are reported explicitly.

## Definition of done
- Connectivity/config state is explicit.
- The MCP server is either usable or the failure point is concrete.
