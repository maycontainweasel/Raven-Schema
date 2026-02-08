import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { defineEventHandler } from 'h3'

type ComboboxSize = 'sm' | 'md' | 'lg'
type ComboboxRadius = 'sm' | 'md' | 'lg'
type ComboboxMode = 'single' | 'multiple'

type CatalogFragment = {
  selected: string[]
  activeComponent: string
}

type ComboboxFragment = {
  componentName: string
  label: string
  helperText: string
  placeholder: string
  mode: ComboboxMode
  size: ComboboxSize
  radius: ComboboxRadius
  clearTrigger: boolean
  itemIndicator: boolean
  emptyText: string
}

type FieldsState = {
  version: number
  catalog: CatalogFragment
  components: {
    combobox: ComboboxFragment
  }
}

const defaultCatalog: CatalogFragment = {
  selected: ['combobox'],
  activeComponent: 'combobox',
}

const defaultCombobox: ComboboxFragment = {
  componentName: 'UiCombobox',
  label: 'Framework',
  helperText: 'Search and choose one option.',
  placeholder: 'Search frameworks...',
  mode: 'single',
  size: 'md',
  radius: 'md',
  clearTrigger: true,
  itemIndicator: true,
  emptyText: 'No options found.',
}

const safeText = (value: unknown, fallback: string) => {
  const next = String(value ?? fallback).trim()
  return next.length > 0 ? next : fallback
}

const normalizeCatalog = (value: any): CatalogFragment => {
  const selectedRaw = Array.isArray(value?.selected) ? value.selected : defaultCatalog.selected
  const selected = selectedRaw
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => entry.length > 0)

  const uniqueSelected = Array.from(new Set(selected))
  const finalSelected = uniqueSelected.length > 0 ? uniqueSelected : [...defaultCatalog.selected]

  const activeCandidate = safeText(value?.activeComponent, defaultCatalog.activeComponent).toLowerCase()
  const activeComponent = finalSelected.includes(activeCandidate)
    ? activeCandidate
    : finalSelected[0] ?? defaultCatalog.activeComponent

  return {
    selected: finalSelected,
    activeComponent,
  }
}

const normalizeCombobox = (value: any): ComboboxFragment => {
  const size = ['sm', 'md', 'lg'].includes(String(value?.size))
    ? (String(value.size) as ComboboxSize)
    : defaultCombobox.size

  const radius = ['sm', 'md', 'lg'].includes(String(value?.radius))
    ? (String(value.radius) as ComboboxRadius)
    : defaultCombobox.radius

  const mode = ['single', 'multiple'].includes(String(value?.mode))
    ? (String(value.mode) as ComboboxMode)
    : defaultCombobox.mode

  return {
    componentName: safeText(value?.componentName, defaultCombobox.componentName),
    label: safeText(value?.label, defaultCombobox.label),
    helperText: safeText(value?.helperText, defaultCombobox.helperText),
    placeholder: safeText(value?.placeholder, defaultCombobox.placeholder),
    mode,
    size,
    radius,
    clearTrigger: value?.clearTrigger !== false,
    itemIndicator: value?.itemIndicator !== false,
    emptyText: safeText(value?.emptyText, defaultCombobox.emptyText),
  }
}

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  }
  catch {
    return null
  }
}

export default defineEventHandler(async () => {
  const rootDir = process.cwd()
  const catalogFile = resolve(rootDir, 'app/fields/fragments/catalog.json')
  const comboboxFile = resolve(rootDir, 'app/fields/fragments/components/combobox.json')

  const [catalogRaw, comboboxRaw] = await Promise.all([
    readJson<CatalogFragment>(catalogFile),
    readJson<ComboboxFragment>(comboboxFile),
  ])

  const state: FieldsState = {
    version: 1,
    catalog: normalizeCatalog(catalogRaw),
    components: {
      combobox: normalizeCombobox(comboboxRaw),
    },
  }

  return {
    ok: true,
    state,
    source: {
      catalog: catalogRaw ? 'fragment' : 'default',
      combobox: comboboxRaw ? 'fragment' : 'default',
    },
  }
})
