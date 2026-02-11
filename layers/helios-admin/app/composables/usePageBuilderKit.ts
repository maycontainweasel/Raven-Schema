export type PageBuilderDropPosition = 'before' | 'after'

export const clampPercentWidth = (value: unknown, min = 20, max = 100) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return Math.round((min + max) / 2)
  return Math.max(min, Math.min(max, Math.round(numeric)))
}

export const normalizeClassTokens = (value: unknown) => {
  const tokens = String(value || '')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)
  return Array.from(new Set(tokens)).join(' ')
}

export const buildFrameWidthClass = (width: number) => {
  const clamped = clampPercentWidth(width)
  return normalizeClassTokens(`grow-0 shrink-0 basis-[${clamped}%] max-w-[${clamped}%]`)
}

export const buildFrameClass = (width: number, customClass?: string) => {
  return normalizeClassTokens(`${buildFrameWidthClass(width)} ${String(customClass || '')}`)
}

export const reorderByDrop = <T extends { id: string }>(
  source: T[],
  fromId: string,
  toId: string,
  position: PageBuilderDropPosition,
) => {
  const list = [...source]
  const fromIndex = list.findIndex(entry => entry.id === fromId)
  const toIndex = list.findIndex(entry => entry.id === toId)
  if (fromIndex < 0 || toIndex < 0 || fromId === toId) return list

  const [entry] = list.splice(fromIndex, 1)
  if (!entry) return list
  let targetIndex = list.findIndex(item => item.id === toId)
  if (targetIndex < 0) {
    list.push(entry)
    return list
  }

  if (position === 'after') targetIndex += 1
  list.splice(targetIndex, 0, entry)
  return list
}
