import type { H3Event } from 'h3'

export async function createContextExt(event: H3Event) {
  const ctx = (event as any).context
  const schemaExt = ctx?.schemaExt
  if (schemaExt && typeof schemaExt === 'object') {
    return schemaExt as Record<string, unknown>
  }
  return {}
}
