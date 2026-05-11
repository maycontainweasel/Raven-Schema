import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { FinancialSpace, FinancialSpaceId, FinancialSpaceIdSubId } from '@schema/types'
type FinancialSpaceDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type FinancialSpaceCreateInput = Pick<FinancialSpace, 'key' | 'name' | 'spaceType' | 'currency' | 'active'> & Partial<Omit<FinancialSpace, 'id'>>

export type FinancialSpaceUpdateInput = Partial<Omit<FinancialSpace, 'id'>>
export type FinancialSpaceRecordId = NonNullable<FinancialSpace['id']> | FinancialSpaceId
export type FinancialSpaceIdInput = ControllerIdInput<FinancialSpaceIdSubId, FinancialSpaceRecordId, FinancialSpace>

export interface FinancialSpaceController {
  // Create a new financialSpace record.
  create: (payload: FinancialSpaceCreateInput, options?: ApiOptions) => Promise<FinancialSpace | null>
  // Create multiple financialSpace records in sequence.
  createMany: (payloads: FinancialSpaceCreateInput[], options?: ApiOptions) => Promise<(FinancialSpace | null)[]>
  // Update a financialSpace by id (record object or sub-id).
  update: (id: FinancialSpaceIdInput, payload: FinancialSpaceUpdateInput, options?: ApiOptions) => Promise<FinancialSpace | null>
  // Update multiple financialSpace records in sequence.
  updateMany: (
    items: Array<{ id: FinancialSpaceIdInput; payload: FinancialSpaceUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(FinancialSpace | null)[]>
  // Delete a financialSpace by id (record object or sub-id).
  delete: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<FinancialSpace | null>
  // Delete multiple financialSpace records in sequence.
  deleteMany: (ids: FinancialSpaceIdInput[], options?: ApiOptions) => Promise<(FinancialSpace | null)[]>
  // Fetch a resource view/function for the financialSpace.
  get: (id: FinancialSpaceIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: FinancialSpaceIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: FinancialSpaceIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: FinancialSpaceIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: FinancialSpaceIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<any>
  get: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: FinancialSpaceIdInput,
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
  attach: (id: FinancialSpaceIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: FinancialSpaceIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: FinancialSpaceIdInput, options?: ApiOptions) => Promise<FinancialSpaceDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<FinancialSpaceDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<FinancialSpaceDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type FinancialSpaceControllerOverride = ControllerOverride<FinancialSpaceController>

export function createGeneratedFinancialSpaceController(): FinancialSpaceController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: FinancialSpaceIdInput) => crud.resolveRecordSubId<FinancialSpaceIdSubId>(value)

  // Create a financialSpace via the TRPC endpoint.
  const create: FinancialSpaceController['create'] = async (payload, options) => {
    return await $process<FinancialSpaceCreateInput, FinancialSpace>('financialSpace.create', payload, options)
  }

  // Create multiple financialSpace records in sequence.
  const createMany: FinancialSpaceController['createMany'] = async (payloads, options) => {
    const results: Array<FinancialSpace | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a financialSpace via the TRPC endpoint.
  const update: FinancialSpaceController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('FinancialSpace update requires a valid id')
    return await $process<{ id: FinancialSpaceIdSubId; payload: FinancialSpaceUpdateInput }, FinancialSpace>(
      'financialSpace.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple financialSpace records in sequence.
  const updateMany: FinancialSpaceController['updateMany'] = async (items, options) => {
    const results: Array<FinancialSpace | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a financialSpace via the TRPC endpoint.
  const del: FinancialSpaceController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('FinancialSpace delete requires a valid id')
    return await $process<{ id: FinancialSpaceIdSubId }, FinancialSpace>('financialSpace.delete', { id: resolvedId }, options)
  }

  // Delete multiple financialSpace records in sequence.
  const deleteMany: FinancialSpaceController['deleteMany'] = async (ids, options) => {
    const results: Array<FinancialSpace | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a financialSpace.
  const get: FinancialSpaceController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('FinancialSpace get requires a valid id')
    if (!resourceKey) throw new Error('FinancialSpace get requires a resource key')
    return await $process('financialSpace.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: FinancialSpaceController['taxonomy'] = (key: string) => {
    const prefix = `financialSpace.${key}`
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

  const subtable: FinancialSpaceController['subtable'] = (key: string) => {
    const prefix = `financialSpace.subtables.${key}`
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

  const relation: FinancialSpaceController['relation'] = (key: string) => {
    const prefix = `financialSpace.relations.${key}`
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
  const typesense: FinancialSpaceController['typesense'] = () => {
    const prefix = `financialSpace.typesense`
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
  const refreshTypesenseFor: FinancialSpaceController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'financialSpace',
      id: resolvedId,
      endpoint: 'financialSpace.typesense.resource',
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
