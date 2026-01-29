export type SchemaTaxonomySpec = {
  key: string
  labelSingular: string
  labelPlural: string
  description?: string
  hierarchical?: boolean
}

export type SchemaFieldSpec = {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean'
  typeRaw?: string
  isArray?: boolean
  isRecord?: boolean
  required?: boolean
  isId?: boolean
}

export type SchemaSubtableSpec = {
  label: string
  model: string
  parent?: string
  autoCreate?: boolean
  tableType: string
  routerName: string
  endpoints: string[]
  fields: SchemaFieldSpec[]
}

export type SchemaModelSpec = {
  modelKey: string
  table: string
  routerName: string
  fields: SchemaFieldSpec[]
  taxonomies: SchemaTaxonomySpec[]
  subTables: SchemaSubtableSpec[]
  resources: string[]
}

export const useSchemaSpec = (modelKey: string | Ref<string>) => {
  const key = computed(() => (typeof modelKey === 'string' ? modelKey : modelKey.value))
  return useFetch<SchemaModelSpec>(() => `/api/schema/models/${key.value}`, {
    watch: [key],
  })
}
