import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Transaction, TransactionId, TransactionIdSubId } from '@schema/types'
type TransactionDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type TransactionCreateInput = Pick<Transaction, 'space' | 'account' | 'key' | 'postedAt' | 'description' | 'amount' | 'currency' | 'direction' | 'status'> & Partial<Omit<Transaction, 'id'>>

export type TransactionUpdateInput = Partial<Omit<Transaction, 'id'>>
export type TransactionRecordId = NonNullable<Transaction['id']> | TransactionId
export type TransactionIdInput = ControllerIdInput<TransactionIdSubId, TransactionRecordId, Transaction>

export interface TransactionController {
  // Create a new transaction record.
  create: (payload: TransactionCreateInput, options?: ApiOptions) => Promise<Transaction | null>
  // Create multiple transaction records in sequence.
  createMany: (payloads: TransactionCreateInput[], options?: ApiOptions) => Promise<(Transaction | null)[]>
  // Update a transaction by id (record object or sub-id).
  update: (id: TransactionIdInput, payload: TransactionUpdateInput, options?: ApiOptions) => Promise<Transaction | null>
  // Update multiple transaction records in sequence.
  updateMany: (
    items: Array<{ id: TransactionIdInput; payload: TransactionUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Transaction | null)[]>
  // Delete a transaction by id (record object or sub-id).
  delete: (id: TransactionIdInput, options?: ApiOptions) => Promise<Transaction | null>
  // Delete multiple transaction records in sequence.
  deleteMany: (ids: TransactionIdInput[], options?: ApiOptions) => Promise<(Transaction | null)[]>
  // Fetch a resource view/function for the transaction.
  get: (id: TransactionIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: TransactionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: TransactionIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: TransactionIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: TransactionIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: TransactionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: TransactionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: TransactionIdInput, options?: ApiOptions) => Promise<any>
  get: (id: TransactionIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: TransactionIdInput,
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
  attach: (id: TransactionIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: TransactionIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: TransactionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: TransactionIdInput, options?: ApiOptions) => Promise<TransactionDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<TransactionDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<TransactionDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type TransactionControllerOverride = ControllerOverride<TransactionController>

export function createGeneratedTransactionController(): TransactionController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: TransactionIdInput) => crud.resolveRecordSubId<TransactionIdSubId>(value)

  // Create a transaction via the TRPC endpoint.
  const create: TransactionController['create'] = async (payload, options) => {
    return await $process<TransactionCreateInput, Transaction>('transaction.create', payload, options)
  }

  // Create multiple transaction records in sequence.
  const createMany: TransactionController['createMany'] = async (payloads, options) => {
    const results: Array<Transaction | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a transaction via the TRPC endpoint.
  const update: TransactionController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Transaction update requires a valid id')
    return await $process<{ id: TransactionIdSubId; payload: TransactionUpdateInput }, Transaction>(
      'transaction.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple transaction records in sequence.
  const updateMany: TransactionController['updateMany'] = async (items, options) => {
    const results: Array<Transaction | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a transaction via the TRPC endpoint.
  const del: TransactionController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Transaction delete requires a valid id')
    return await $process<{ id: TransactionIdSubId }, Transaction>('transaction.delete', { id: resolvedId }, options)
  }

  // Delete multiple transaction records in sequence.
  const deleteMany: TransactionController['deleteMany'] = async (ids, options) => {
    const results: Array<Transaction | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a transaction.
  const get: TransactionController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Transaction get requires a valid id')
    if (!resourceKey) throw new Error('Transaction get requires a resource key')
    return await $process('transaction.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: TransactionController['taxonomy'] = (key: string) => {
    const prefix = `transaction.${key}`
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

  const subtable: TransactionController['subtable'] = (key: string) => {
    const prefix = `transaction.subtables.${key}`
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

  const relation: TransactionController['relation'] = (key: string) => {
    const prefix = `transaction.relations.${key}`
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
  const typesense: TransactionController['typesense'] = () => {
    const prefix = `transaction.typesense`
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
  const refreshTypesenseFor: TransactionController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'transaction',
      id: resolvedId,
      endpoint: 'transaction.typesense.resource',
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
