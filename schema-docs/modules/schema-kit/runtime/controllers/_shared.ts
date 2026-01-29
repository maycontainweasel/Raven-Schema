export type ControllerIdInput<TSubId, TRecordId, TRecord> =
  | TSubId
  | TRecordId
  | TRecord
  | { id: TSubId | TRecordId }
  | { tb: string; id: TSubId | TRecordId }

export type ControllerOverride<T> = Partial<T> | ((base: T) => Partial<T>)

export function mergeController<T extends Record<string, any>>(
  base: T,
  override?: ControllerOverride<T>
): T {
  if (!override) return base
  const patch = typeof override === 'function' ? override(base) : override
  return { ...base, ...(patch ?? {}) }
}
