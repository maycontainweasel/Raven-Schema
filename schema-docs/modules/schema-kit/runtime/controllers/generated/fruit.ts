import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Fruit, FruitId, FruitIdSubId } from '@schema/types'
type FruitDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type FruitCreateInput = Pick<Fruit, 'fruitid' | 'name' | 'color' | 'taste' | 'price' | 'quantity'> & Partial<Omit<Fruit, 'id'>>

export type FruitUpdateInput = Partial<Omit<Fruit, 'id'>>
export type FruitRecordId = NonNullable<Fruit['id']> | FruitId
export type FruitIdInput = ControllerIdInput<FruitIdSubId, FruitRecordId, Fruit>

export interface FruitController {
  // Create a new fruit record.
  create: (payload: FruitCreateInput, options?: ApiOptions) => Promise<Fruit | null>
  // Create multiple fruit records in sequence.
  createMany: (payloads: FruitCreateInput[], options?: ApiOptions) => Promise<(Fruit | null)[]>
  // Update a fruit by id (record object or sub-id).
  update: (id: FruitIdInput, payload: FruitUpdateInput, options?: ApiOptions) => Promise<Fruit | null>
  // Update multiple fruit records in sequence.
  updateMany: (
    items: Array<{ id: FruitIdInput; payload: FruitUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Fruit | null)[]>
  // Delete a fruit by id (record object or sub-id).
  delete: (id: FruitIdInput, options?: ApiOptions) => Promise<Fruit | null>
  // Delete multiple fruit records in sequence.
  deleteMany: (ids: FruitIdInput[], options?: ApiOptions) => Promise<(Fruit | null)[]>
  // Fetch a resource view/function for the fruit.
  get: (id: FruitIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: FruitIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: FruitIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: FruitIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: FruitIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: FruitIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: FruitIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: FruitIdInput, options?: ApiOptions) => Promise<any>
  get: (id: FruitIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: FruitIdInput,
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
  attach: (id: FruitIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: FruitIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: FruitIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: FruitIdInput, options?: ApiOptions) => Promise<FruitDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<FruitDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<FruitDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type FruitControllerOverride = ControllerOverride<FruitController>

export function createGeneratedFruitController(): FruitController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: FruitIdInput) => crud.resolveRecordSubId<FruitIdSubId>(value)

  // Create a fruit via the TRPC endpoint.
  const create: FruitController['create'] = async (payload, options) => {
    return await $process<FruitCreateInput, Fruit>('fruit.create', payload, options)
  }

  // Create multiple fruit records in sequence.
  const createMany: FruitController['createMany'] = async (payloads, options) => {
    const results: Array<Fruit | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a fruit via the TRPC endpoint.
  const update: FruitController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Fruit update requires a valid id')
    return await $process<{ id: FruitIdSubId; payload: FruitUpdateInput }, Fruit>(
      'fruit.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple fruit records in sequence.
  const updateMany: FruitController['updateMany'] = async (items, options) => {
    const results: Array<Fruit | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a fruit via the TRPC endpoint.
  const del: FruitController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Fruit delete requires a valid id')
    return await $process<{ id: FruitIdSubId }, Fruit>('fruit.delete', { id: resolvedId }, options)
  }

  // Delete multiple fruit records in sequence.
  const deleteMany: FruitController['deleteMany'] = async (ids, options) => {
    const results: Array<Fruit | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a fruit.
  const get: FruitController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Fruit get requires a valid id')
    if (!resourceKey) throw new Error('Fruit get requires a resource key')
    return await $process('fruit.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: FruitController['taxonomy'] = (key: string) => {
    const prefix = `fruit.${key}`
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

  const subtable: FruitController['subtable'] = (key: string) => {
    const prefix = `fruit.subtables.${key}`
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

  const relation: FruitController['relation'] = (key: string) => {
    const prefix = `fruit.relations.${key}`
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
  const typesense: FruitController['typesense'] = () => {
    const prefix = `fruit.typesense`
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
  const refreshTypesenseFor: FruitController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'fruit',
      id: resolvedId,
      endpoint: 'fruit.typesense.resource',
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
