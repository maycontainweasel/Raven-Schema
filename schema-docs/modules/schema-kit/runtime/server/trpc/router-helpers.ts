// packages/pmv2shared/trpc/router-helpers.ts
import { router as rtr, mergeRouters } from './base'
import type { AnyRouter } from '@trpc/server'

/**
 * Merge a map of routers, allowing apps to override or exclude keys.
 * - base: shared routers (e.g. auth, users, redis)
 * - overrides: app-provided replacements for some routers
 * - exclude: router names to omit entirely
 */
export function buildAppRouter<
  TBase extends Record<string, AnyRouter | any>,
  TOverrides extends Partial<TBase> = {},
  TExclude extends keyof TBase = never
>(opts: {
  base: TBase
  overrides?: TOverrides
  exclude?: TExclude[]
}) {
  const { base, overrides = {} as TOverrides, exclude = [] } = opts
  const names = new Set([...Object.keys(base), ...Object.keys(overrides)])
  const parts: any[] = []

  for (const name of names) {
    if (exclude.includes(name as TExclude)) continue
    const chosen = overrides[name as keyof TOverrides] ?? base[name]
    if (!chosen) continue
    parts.push(rtr({ [name]: chosen }))
  }

  if (parts.length === 0) return rtr({})
  
  // The merged result will have proper type inference
  return parts.reduce((acc, cur) => mergeRouters(acc, cur))
}