export type ModelUIComponentSpec = {
  name: string
  options: Record<string, any>
  action?: string
  modelKey?: string
}

export type ModelUIFieldSpec = {
  id: string
  field: string
  label: string
  component: ModelUIComponentSpec
  action?: string
  modelKey?: string
  validation?: Record<string, any>
  class?: string
  meta?: Record<string, any>
}

export type ModelUIFieldLayoutColumnSpec = {
  id: string
  class?: string
  fieldIds: string[]
}

export type ModelUIFieldLayoutRowSpec = {
  id: string
  name?: string
  class?: string
  columns: ModelUIFieldLayoutColumnSpec[]
}

export type ModelUIFieldLayoutSpec = {
  rows: ModelUIFieldLayoutRowSpec[]
}

export type ModelUIWidgetSpec = {
  id: string
  type: 'fields-card' | 'widget'
  name: string
  label: string
  subtitle?: string
  class?: string
  saveLabel?: string
  action?: string
  fields: ModelUIFieldSpec[]
  layout?: ModelUIFieldLayoutSpec
  meta?: Record<string, any>
}

export type ModelUIColumnSpec = {
  id: string
  name: string
  class?: string
  primary: ModelUIWidgetSpec[]
  meta?: Record<string, any>
}

export type ModelUIRowSpec = {
  id: string
  name: string
  class?: string
  columns: ModelUIColumnSpec[]
  meta?: Record<string, any>
}

export type ModelUITabSpec = {
  id: string
  slug: string
  label: string
  primary: ModelUIRowSpec[]
  meta?: Record<string, any>
}

export type DirectoryListingFieldSpec = {
  key: string
  label: string
  class?: string
}

export type DirectoryFilterSpec = {
  key: string
  label: string
  component: ModelUIComponentSpec
}

export type DirectoryCreateDialogSpec = {
  enabled: boolean
  action: string
  title: string
  submitLabel: string
  required: string[]
  fields: ModelUIFieldSpec[]
}

export type ModelLayoutSpec = {
  version: 2
  kind: 'helios-model-ui'
  model: string
  table: string
  label: string
  updatedAt: string
  directory: {
    enabled: boolean
    route: string
    slugPolicy: 'rid' | 'slug' | 'id' | 'custom'
    title: string
    description: string
    typesense: {
      enabled: boolean
      collection: string
      queryBy: string[]
      sortableFields: string[]
      filters: string[]
    }
    listing: {
      fields: DirectoryListingFieldSpec[]
      filters: DirectoryFilterSpec[]
    }
    createDialog: DirectoryCreateDialogSpec
  }
  single: {
    global: {
      enablePostStatus: boolean
      enableInstanceManagement: boolean
      showHeader: boolean
    }
    tabs: ModelUITabSpec[]
  }
}

export type ModelSpecResponse = {
  ok: boolean
  model: {
    modelKey: string
    table: string
    label: string
    directoryRoute?: string
    capabilities: string[]
    hasTypesense: boolean
    typesenseCollection: string | null
    typesenseFields: string[]
    fields: string[]
    requiredFields?: string[]
    canManage: boolean
    hasFragment: boolean
    hasGenerated: boolean
  }
  source: 'fragment' | 'default'
  spec: ModelLayoutSpec
  files: {
    fragment: string
    generated: string
    directoryPage?: string | null
    directoryPageStatus?: 'written' | 'unchanged' | 'skipped' | 'removed' | 'disabled'
    recordPage?: string | null
    recordPageStatus?: 'written' | 'unchanged' | 'skipped' | 'removed' | 'disabled'
    removedRouteFiles?: Array<{
      filePath: string | null
      status: 'written' | 'unchanged' | 'skipped' | 'removed' | 'disabled'
      reason?: string
    }>
  }
}
