import type { H3Event } from 'h3'

type ContextBase = Record<string, unknown>

// Optional app-specific context additions.
// Return an object whose keys will be merged into the base context.
export async function createContextExt(_event: H3Event, _base: ContextBase) {
  return {}
}
