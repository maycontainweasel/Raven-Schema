import { useTypesense } from './useTypesense'

type SearchParams = Record<string, any>

const extractFacetFields = (schema: any): string[] => {
  const fields = schema?.fields ?? schema?.schema?.fields ?? []
  const facets = new Set<string>()

  const walk = (list: any[], prefix?: string) => {
    for (const field of list ?? []) {
      const qualified = prefix ? `${prefix}.${field.name}` : field.name
      if (field.facet) {
        facets.add(qualified)
      }
      if (field.fields) {
        walk(field.fields, qualified)
      }
    }
  }

  walk(fields)
  return Array.from(facets)
}

export function useTypesenseSearch() {
  const typesense = useTypesense()

  const resolveCollectionName = (key: string) => typesense.getCollectionName(key)

  const getLocalSchema = (key: string) => typesense.getCollectionSchema(key)

  const getRemoteSchema = async (key: string) => {
    return await typesense.getRemoteSchema(key)
  }

  const getAvailableFacetFields = async (key: string, fallback: string[] = []) => {
    try {
      const remoteSchema = await getRemoteSchema(key)
      const facets = extractFacetFields(remoteSchema)
      return facets.length ? facets : fallback
    }
    catch (error) {
      console.warn('Unable to retrieve remote Typesense schema, defaulting facets.', error)
      return fallback
    }
  }

  const searchCollection = async (key: string, params: SearchParams) => {
    return await typesense.search(key, params)
  }

  const getQueryByFields = (key: string, preferred: string[] = []) => {
    const schema = getLocalSchema(key)
    const fields = Array.isArray(schema?.fields) ? schema.fields : []
    const fieldNames = new Set(fields.map((field: any) => field.name))
    const resolvedPreferred = preferred.filter(name => fieldNames.has(name))
    if (resolvedPreferred.length > 0) return resolvedPreferred
    return Array.from(fieldNames).filter(name => name !== 'id')
  }

  return {
    resolveCollectionName,
    getLocalSchema,
    getRemoteSchema,
    getAvailableFacetFields,
    extractFacetFields,
    searchCollection,
    getQueryByFields,
  }
}
