type GuardConfig = {
  protect?: string[] | string
  ignorePaths?: string[]
}

const normalize = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean)
  return [String(value).trim()].filter(Boolean)
}

const matchesPattern = (path: string, pattern: string): boolean => {
  if (!pattern) return false
  if (pattern === '*') return true
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return path.startsWith(prefix)
  }
  return path === pattern
}

export function shouldApplyAuthGuard(path: string, guardConfig: GuardConfig): boolean {
  const ignore = normalize(guardConfig?.ignorePaths)
  if ((guardConfig as any)?.testPageEnabled) {
    ignore.push('/auth-test')
  }
  if (ignore.some((pattern) => matchesPattern(path, pattern))) {
    return false
  }

  const protect = normalize(guardConfig?.protect)
  if (protect.length === 0) {
    return true
  }

  return protect.some((pattern) => matchesPattern(path, pattern))
}
