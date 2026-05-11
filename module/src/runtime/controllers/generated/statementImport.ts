import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { StatementImport, StatementImportId, StatementImportIdSubId } from '@schema/types'
type StatementImportDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type StatementImportCreateInput = Pick<StatementImport, 'space' | 'account' | 'key' | 'sourceFileName' | 'sourceFormat' | 'importedAt' | 'status'> & Partial<Omit<StatementImport, 'id'>>

export type StatementImportUpdateInput = Partial<Omit<StatementImport, 'id'>>
export type StatementImportRecordId = NonNullable<StatementImport['id']> | StatementImportId
export type StatementImportIdInput = ControllerIdInput<StatementImportIdSubId, StatementImportRecordId, StatementImport>

export interface StatementImportController {
  // Create a new statementImport record.
  create: (payload: StatementImportCreateInput, options?: ApiOptions) => Promise<StatementImport | null>
  // Create multiple statementImport records in sequence.
  createMany: (payloads: StatementImportCreateInput[], options?: ApiOptions) => Promise<(StatementImport | null)[]>
  // Update a statementImport by id (record object or sub-id).
  update: (id: StatementImportIdInput, payload: StatementImportUpdateInput, options?: ApiOptions) => Promise<StatementImport | null>
  // Update multiple statementImport records in sequence.
  updateMany: (
    items: Array<{ id: StatementImportIdInput; payload: StatementImportUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(StatementImport | null)[]>
  // Delete a statementImport by id (record object or sub-id).
  delete: (id: StatementImportIdInput, options?: ApiOptions) => Promise<StatementImport | null>
  // Delete multiple statementImport records in sequence.
  deleteMany: (ids: StatementImportIdInput[], options?: ApiOptions) => Promise<(StatementImport | null)[]>
  // Fetch a resource view/function for the statementImport.
  get: (id: StatementImportIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: StatementImportIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: StatementImportIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: StatementImportIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: StatementImportIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: StatementImportIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: StatementImportIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: StatementImportIdInput, options?: ApiOptions) => Promise<any>
  get: (id: StatementImportIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: StatementImportIdInput,
    params?: {
      start?: number;
      limit?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
      filters?: Record<string, any>;
    },
    options?: ApiOptions
  ) => Promise<any>
}

export interface RelationController {
  attach: (id: StatementImportIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: StatementImportIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: StatementImportIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: StatementImportIdInput, options?: ApiOptions) => Promise<StatementImportDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<StatementImportDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<StatementImportDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type StatementImportControllerOverride = ControllerOverride<StatementImportController>

export function createGeneratedStatementImportController(): StatementImportController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: StatementImportIdInput) => crud.resolveRecordSubId<StatementImportIdSubId>(value)

  // Create a statementImport via the TRPC endpoint.
  const create: StatementImportController['create'] = async (payload, options) => {
    return await $process<StatementImportCreateInput, StatementImport>('statementImport.create', payload, options)
  }

  // Create multiple statementImport records in sequence.
  const createMany: StatementImportController['createMany'] = async (payloads, options) => {
    const results: Array<StatementImport | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a statementImport via the TRPC endpoint.
  const update: StatementImportController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementImport update requires a valid id')
    return await $process<{ id: StatementImportIdSubId; payload: StatementImportUpdateInput }, StatementImport>(
      'statementImport.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple statementImport records in sequence.
  const updateMany: StatementImportController['updateMany'] = async (items, options) => {
    const results: Array<StatementImport | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a statementImport via the TRPC endpoint.
  const del: StatementImportController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementImport delete requires a valid id')
    return await $process<{ id: StatementImportIdSubId }, StatementImport>('statementImport.delete', { id: resolvedId }, options)
  }

  // Delete multiple statementImport records in sequence.
  const deleteMany: StatementImportController['deleteMany'] = async (ids, options) => {
    const results: Array<StatementImport | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a statementImport.
  const get: StatementImportController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementImport get requires a valid id')
    if (!resourceKey) throw new Error('StatementImport get requires a resource key')
    return await $process('statementImport.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: StatementImportController['taxonomy'] = (key: string) => {
    const prefix = `statementImport.${key}`
    return {
      createTaxonomy: (payload, options) =>
        $process(`${prefix}.createTaxonomy`, payload, options),
      addTerm: (payload, options) =>
        $process(`${prefix}.addTerm`, payload, options),
      removeTerm: (term, options) =>
        $process(`${prefix}.removeTerm`, term, options),
      attach: (id, term, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.attach requires a valid id')
        return $process(`${prefix}.attach`, { id: resolvedId, term }, options)
      },
      detach: (id, term, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.detach requires a valid id')
        return $process(`${prefix}.detach`, { id: resolvedId, term }, options)
      },
      getTerms: (options) =>
        $process(`${prefix}.getTerms`, {}, options),
      getRecordTerms: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.getRecordTerms requires a valid id')
        return $process(`${prefix}.getRecordTerms`, { id: resolvedId }, options)
      },
    }
  }

  const subtable: StatementImportController['subtable'] = (key: string) => {
    const prefix = `statementImport.subtables.${key}`
    return {
      create: (id, payload, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.create requires a valid id')
        return $process(`${prefix}.create`, { id: resolvedId, payload }, options)
      },
      update: (id, payload, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.update requires a valid id')
        return $process(`${prefix}.update`, { id: resolvedId, payload }, options)
      },
      delete: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.delete requires a valid id')
        return $process(`${prefix}.delete`, { id: resolvedId }, options)
      },
      get: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.get requires a valid id')
        return $process(`${prefix}.get`, { id: resolvedId }, options)
      },
      list: (id, params, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.list requires a valid id')
        return $process(`${prefix}.list`, { id: resolvedId, ...(params ?? {}) }, options)
      },
    }
  }

  const relation: StatementImportController['relation'] = (key: string) => {
    const prefix = `statementImport.relations.${key}`
    return {
      attach: (id, target, options) => {
        const resolvedId = resolveSubId(id)
        const resolvedTarget = resolveSubId(target)
        if (!resolvedId || !resolvedTarget) throw new Error('relation.attach requires id and target')
        return $process(`${prefix}.attach`, { id: resolvedId, target: resolvedTarget }, options)
      },
      detach: (id, target, options) => {
        const resolvedId = resolveSubId(id)
        const resolvedTarget = resolveSubId(target)
        if (!resolvedId || !resolvedTarget) throw new Error('relation.detach requires id and target')
        return $process(`${prefix}.detach`, { id: resolvedId, target: resolvedTarget }, options)
      },
      list: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('relation.list requires a valid id')
        return $process(`${prefix}.list`, { id: resolvedId }, options)
      },
    }
  }

  // Typesense helper wrapper for this model.
  const typesense: StatementImportController['typesense'] = () => {
    const prefix = `statementImport.typesense`
    return {
      get: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('typesense.get requires a valid id')
        return $process(`${prefix}.resource`, { id: resolvedId }, options)
      },
      list: (params, options) =>
        $process(`${prefix}.list`, { ...(params ?? {}) }, options),
      refresh: (params, options) =>
        $process(`${prefix}.refresh`, { ...(params ?? {}) }, options),
      count: (options) =>
        $process(`${prefix}.count`, {}, options),
      collection: (options) =>
        $process(`${prefix}.collection`, {}, options),
    }
  }

  // Refresh Typesense for a single record id.
  const refreshTypesenseFor: StatementImportController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'statementImport',
      id: resolvedId,
      endpoint: 'statementImport.typesense.resource',
      instance: options?.instance,
      instances: options?.instances,
      bypassMothership: options?.bypassMothership,
    })
  }

  return {
    create,
    createMany,
    update,
    updateMany,
    delete: del,
    deleteMany,
    get,
    taxonomy,
    subtable,
    relation,
    typesense,
    refreshTypesenseFor,
  }
}
