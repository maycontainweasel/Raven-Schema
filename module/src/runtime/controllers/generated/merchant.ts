import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Merchant, MerchantId, MerchantIdSubId } from '@schema/types'
type MerchantDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type MerchantCreateInput = Pick<Merchant, 'space' | 'key' | 'name' | 'active'> & Partial<Omit<Merchant, 'id'>>

export type MerchantUpdateInput = Partial<Omit<Merchant, 'id'>>
export type MerchantRecordId = NonNullable<Merchant['id']> | MerchantId
export type MerchantIdInput = ControllerIdInput<MerchantIdSubId, MerchantRecordId, Merchant>

export interface MerchantController {
  // Create a new merchant record.
  create: (payload: MerchantCreateInput, options?: ApiOptions) => Promise<Merchant | null>
  // Create multiple merchant records in sequence.
  createMany: (payloads: MerchantCreateInput[], options?: ApiOptions) => Promise<(Merchant | null)[]>
  // Update a merchant by id (record object or sub-id).
  update: (id: MerchantIdInput, payload: MerchantUpdateInput, options?: ApiOptions) => Promise<Merchant | null>
  // Update multiple merchant records in sequence.
  updateMany: (
    items: Array<{ id: MerchantIdInput; payload: MerchantUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Merchant | null)[]>
  // Delete a merchant by id (record object or sub-id).
  delete: (id: MerchantIdInput, options?: ApiOptions) => Promise<Merchant | null>
  // Delete multiple merchant records in sequence.
  deleteMany: (ids: MerchantIdInput[], options?: ApiOptions) => Promise<(Merchant | null)[]>
  // Fetch a resource view/function for the merchant.
  get: (id: MerchantIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: MerchantIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: MerchantIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: MerchantIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: MerchantIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: MerchantIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: MerchantIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: MerchantIdInput, options?: ApiOptions) => Promise<any>
  get: (id: MerchantIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: MerchantIdInput,
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
  attach: (id: MerchantIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: MerchantIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: MerchantIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: MerchantIdInput, options?: ApiOptions) => Promise<MerchantDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<MerchantDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<MerchantDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type MerchantControllerOverride = ControllerOverride<MerchantController>

export function createGeneratedMerchantController(): MerchantController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: MerchantIdInput) => crud.resolveRecordSubId<MerchantIdSubId>(value)

  // Create a merchant via the TRPC endpoint.
  const create: MerchantController['create'] = async (payload, options) => {
    return await $process<MerchantCreateInput, Merchant>('merchant.create', payload, options)
  }

  // Create multiple merchant records in sequence.
  const createMany: MerchantController['createMany'] = async (payloads, options) => {
    const results: Array<Merchant | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a merchant via the TRPC endpoint.
  const update: MerchantController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Merchant update requires a valid id')
    return await $process<{ id: MerchantIdSubId; payload: MerchantUpdateInput }, Merchant>(
      'merchant.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple merchant records in sequence.
  const updateMany: MerchantController['updateMany'] = async (items, options) => {
    const results: Array<Merchant | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a merchant via the TRPC endpoint.
  const del: MerchantController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Merchant delete requires a valid id')
    return await $process<{ id: MerchantIdSubId }, Merchant>('merchant.delete', { id: resolvedId }, options)
  }

  // Delete multiple merchant records in sequence.
  const deleteMany: MerchantController['deleteMany'] = async (ids, options) => {
    const results: Array<Merchant | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a merchant.
  const get: MerchantController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Merchant get requires a valid id')
    if (!resourceKey) throw new Error('Merchant get requires a resource key')
    return await $process('merchant.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: MerchantController['taxonomy'] = (key: string) => {
    const prefix = `merchant.${key}`
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

  const subtable: MerchantController['subtable'] = (key: string) => {
    const prefix = `merchant.subtables.${key}`
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

  const relation: MerchantController['relation'] = (key: string) => {
    const prefix = `merchant.relations.${key}`
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
  const typesense: MerchantController['typesense'] = () => {
    const prefix = `merchant.typesense`
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
  const refreshTypesenseFor: MerchantController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'merchant',
      id: resolvedId,
      endpoint: 'merchant.typesense.resource',
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
