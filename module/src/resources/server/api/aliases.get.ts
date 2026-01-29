export default defineEventHandler(() => {
  const config: any = typeof useRuntimeConfig === 'function' ? useRuntimeConfig() : {}
  return {
    ok: true,
    aliases: config?.schemaKit?.aliasStatus ?? [],
  }
})
