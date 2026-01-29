export type RedirectResolution = { target: string; external: boolean }

const isExternal = (value: string) => /^https?:\/\//i.test(value)

export function resolveAuthRedirect(
  redirectTarget: string | undefined,
  rc: any,
  guardConfig: any
): RedirectResolution {
  const aliases = guardConfig?.redirectAliases || {}
  const rawTarget = redirectTarget || ''
  const resolvedTarget = aliases[rawTarget] || rawTarget
  return {
    target: resolvedTarget,
    external: isExternal(resolvedTarget),
  }
}
