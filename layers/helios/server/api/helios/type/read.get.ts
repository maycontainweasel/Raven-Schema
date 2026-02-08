import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { defineEventHandler } from 'h3'

type HeliosTypeConfig = {
  baseFontPx: number
  typeRatio: number
  gridRatio: number
  spaceRatio: number
  minStep: number
  maxStep: number
  step: number
  brandColor: string
}

const defaultConfig: HeliosTypeConfig = {
  baseFontPx: 16,
  typeRatio: 1.2,
  gridRatio: 1.4,
  spaceRatio: 1.25,
  minStep: -2,
  maxStep: 6,
  step: 0.25,
  brandColor: '#2858ff',
}

const settingsPath = (rootDir: string) => resolve(rootDir, 'app/helios/generated/type.settings.json')
const fragmentPath = (rootDir: string) => resolve(rootDir, 'app/helios/fragments/type.json')

const normalize = (value: any): HeliosTypeConfig => {
  const next: HeliosTypeConfig = {
    baseFontPx: Number(value?.baseFontPx ?? defaultConfig.baseFontPx),
    typeRatio: Number(value?.typeRatio ?? defaultConfig.typeRatio),
    gridRatio: Number(value?.gridRatio ?? defaultConfig.gridRatio),
    spaceRatio: Number(value?.spaceRatio ?? defaultConfig.spaceRatio),
    minStep: Number(value?.minStep ?? defaultConfig.minStep),
    maxStep: Number(value?.maxStep ?? defaultConfig.maxStep),
    step: Number(value?.step ?? defaultConfig.step),
    brandColor: String(value?.brandColor ?? defaultConfig.brandColor),
  }

  if (!Number.isFinite(next.baseFontPx) || next.baseFontPx < 8) next.baseFontPx = defaultConfig.baseFontPx
  if (!Number.isFinite(next.typeRatio) || next.typeRatio <= 1) next.typeRatio = defaultConfig.typeRatio
  if (!Number.isFinite(next.gridRatio) || next.gridRatio <= 0.5) next.gridRatio = defaultConfig.gridRatio
  if (!Number.isFinite(next.spaceRatio) || next.spaceRatio <= 1) next.spaceRatio = defaultConfig.spaceRatio
  if (!Number.isFinite(next.minStep)) next.minStep = defaultConfig.minStep
  if (!Number.isFinite(next.maxStep)) next.maxStep = defaultConfig.maxStep
  if (next.maxStep <= next.minStep) {
    next.minStep = defaultConfig.minStep
    next.maxStep = defaultConfig.maxStep
  }
  if (!Number.isFinite(next.step) || next.step <= 0) next.step = defaultConfig.step
  const rawBrand = String(value?.brandColor ?? defaultConfig.brandColor).trim()
  next.brandColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(rawBrand)
    ? rawBrand
    : defaultConfig.brandColor

  return next
}

export default defineEventHandler(async () => {
  const rootDir = process.cwd()

  try {
    const raw = await fs.readFile(fragmentPath(rootDir), 'utf-8')
    const parsed = JSON.parse(raw)
    return {
      ok: true,
      config: normalize(parsed),
      source: 'fragment',
    }
  }
  catch {
    try {
      const raw = await fs.readFile(settingsPath(rootDir), 'utf-8')
      const parsed = JSON.parse(raw)
      return {
        ok: true,
        config: normalize(parsed?.config),
        source: 'settings',
      }
    }
    catch {
      return {
        ok: true,
        config: { ...defaultConfig },
        source: 'default',
      }
    }
  }
})
