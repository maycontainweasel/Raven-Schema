import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { MonthlySnapshot, MonthlySnapshotId, MonthlySnapshotIdSubId } from '@schema/types'
type MonthlySnapshotDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type MonthlySnapshotCreateInput = Pick<MonthlySnapshot, 'space' | 'month' | 'currency' | 'incomeTotal' | 'outflowTotal' | 'netTotal' | 'generatedAt' | 'status'> & Partial<Omit<MonthlySnapshot, 'id'>>

export type MonthlySnapshotUpdateInput = Partial<Omit<MonthlySnapshot, 'id'>>
export type MonthlySnapshotRecordId = NonNullable<MonthlySnapshot['id']> | MonthlySnapshotId
export type MonthlySnapshotIdInput = ControllerIdInput<MonthlySnapshotIdSubId, MonthlySnapshotRecordId, MonthlySnapshot>

export interface MonthlySnapshotController {
  // Create a new monthlySnapshot record.
  create: (payload: MonthlySnapshotCreateInput, options?: ApiOptions) => Promise<MonthlySnapshot | null>
  // Create multiple monthlySnapshot records in sequence.
  createMany: (payloads: MonthlySnapshotCreateInput[], options?: ApiOptions) => Promise<(MonthlySnapshot | null)[]>
  // Update a monthlySnapshot by id (record object or sub-id).
  update: (id: MonthlySnapshotIdInput, payload: MonthlySnapshotUpdateInput, options?: ApiOptions) => Promise<MonthlySnapshot | null>
  // Update multiple monthlySnapshot records in sequence.
  updateMany: (
    items: Array<{ id: MonthlySnapshotIdInput; payload: MonthlySnapshotUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(MonthlySnapshot | null)[]>
  // Delete a monthlySnapshot by id (record object or sub-id).
  delete: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<MonthlySnapshot | null>
  // Delete multiple monthlySnapshot records in sequence.
  deleteMany: (ids: MonthlySnapshotIdInput[], options?: ApiOptions) => Promise<(MonthlySnapshot | null)[]>
  // Fetch a resource view/function for the monthlySnapshot.
  get: (id: MonthlySnapshotIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: MonthlySnapshotIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: MonthlySnapshotIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: MonthlySnapshotIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: MonthlySnapshotIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<any>
  get: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: MonthlySnapshotIdInput,
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
  attach: (id: MonthlySnapshotIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: MonthlySnapshotIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: MonthlySnapshotIdInput, options?: ApiOptions) => Promise<MonthlySnapshotDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<MonthlySnapshotDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<MonthlySnapshotDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type MonthlySnapshotControllerOverride = ControllerOverride<MonthlySnapshotController>

export function createGeneratedMonthlySnapshotController(): MonthlySnapshotController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: MonthlySnapshotIdInput) => crud.resolveRecordSubId<MonthlySnapshotIdSubId>(value)

  // Create a monthlySnapshot via the TRPC endpoint.
  const create: MonthlySnapshotController['create'] = async (payload, options) => {
    return await $process<MonthlySnapshotCreateInput, MonthlySnapshot>('monthlySnapshot.create', payload, options)
  }

  // Create multiple monthlySnapshot records in sequence.
  const createMany: MonthlySnapshotController['createMany'] = async (payloads, options) => {
    const results: Array<MonthlySnapshot | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a monthlySnapshot via the TRPC endpoint.
  const update: MonthlySnapshotController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('MonthlySnapshot update requires a valid id')
    return await $process<{ id: MonthlySnapshotIdSubId; payload: MonthlySnapshotUpdateInput }, MonthlySnapshot>(
      'monthlySnapshot.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple monthlySnapshot records in sequence.
  const updateMany: MonthlySnapshotController['updateMany'] = async (items, options) => {
    const results: Array<MonthlySnapshot | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a monthlySnapshot via the TRPC endpoint.
  const del: MonthlySnapshotController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('MonthlySnapshot delete requires a valid id')
    return await $process<{ id: MonthlySnapshotIdSubId }, MonthlySnapshot>('monthlySnapshot.delete', { id: resolvedId }, options)
  }

  // Delete multiple monthlySnapshot records in sequence.
  const deleteMany: MonthlySnapshotController['deleteMany'] = async (ids, options) => {
    const results: Array<MonthlySnapshot | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a monthlySnapshot.
  const get: MonthlySnapshotController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('MonthlySnapshot get requires a valid id')
    if (!resourceKey) throw new Error('MonthlySnapshot get requires a resource key')
    return await $process('monthlySnapshot.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: MonthlySnapshotController['taxonomy'] = (key: string) => {
    const prefix = `monthlySnapshot.${key}`
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

  const subtable: MonthlySnapshotController['subtable'] = (key: string) => {
    const prefix = `monthlySnapshot.subtables.${key}`
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

  const relation: MonthlySnapshotController['relation'] = (key: string) => {
    const prefix = `monthlySnapshot.relations.${key}`
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
  const typesense: MonthlySnapshotController['typesense'] = () => {
    const prefix = `monthlySnapshot.typesense`
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
  const refreshTypesenseFor: MonthlySnapshotController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'monthlySnapshot',
      id: resolvedId,
      endpoint: 'monthlySnapshot.typesense.resource',
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
