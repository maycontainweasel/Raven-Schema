import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Account, AccountId, AccountIdSubId } from '@schema/types'
type AccountDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type AccountCreateInput = Pick<Account, 'space' | 'key' | 'name' | 'bankName' | 'accountType' | 'currency' | 'active'> & Partial<Omit<Account, 'id'>>

export type AccountUpdateInput = Partial<Omit<Account, 'id'>>
export type AccountRecordId = NonNullable<Account['id']> | AccountId
export type AccountIdInput = ControllerIdInput<AccountIdSubId, AccountRecordId, Account>

export interface AccountController {
  // Create a new account record.
  create: (payload: AccountCreateInput, options?: ApiOptions) => Promise<Account | null>
  // Create multiple account records in sequence.
  createMany: (payloads: AccountCreateInput[], options?: ApiOptions) => Promise<(Account | null)[]>
  // Update a account by id (record object or sub-id).
  update: (id: AccountIdInput, payload: AccountUpdateInput, options?: ApiOptions) => Promise<Account | null>
  // Update multiple account records in sequence.
  updateMany: (
    items: Array<{ id: AccountIdInput; payload: AccountUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Account | null)[]>
  // Delete a account by id (record object or sub-id).
  delete: (id: AccountIdInput, options?: ApiOptions) => Promise<Account | null>
  // Delete multiple account records in sequence.
  deleteMany: (ids: AccountIdInput[], options?: ApiOptions) => Promise<(Account | null)[]>
  // Fetch a resource view/function for the account.
  get: (id: AccountIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: AccountIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: AccountIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: AccountIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: AccountIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: AccountIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: AccountIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: AccountIdInput, options?: ApiOptions) => Promise<any>
  get: (id: AccountIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: AccountIdInput,
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
  attach: (id: AccountIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: AccountIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: AccountIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: AccountIdInput, options?: ApiOptions) => Promise<AccountDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<AccountDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<AccountDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type AccountControllerOverride = ControllerOverride<AccountController>

export function createGeneratedAccountController(): AccountController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: AccountIdInput) => crud.resolveRecordSubId<AccountIdSubId>(value)

  // Create a account via the TRPC endpoint.
  const create: AccountController['create'] = async (payload, options) => {
    return await $process<AccountCreateInput, Account>('account.create', payload, options)
  }

  // Create multiple account records in sequence.
  const createMany: AccountController['createMany'] = async (payloads, options) => {
    const results: Array<Account | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a account via the TRPC endpoint.
  const update: AccountController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Account update requires a valid id')
    return await $process<{ id: AccountIdSubId; payload: AccountUpdateInput }, Account>(
      'account.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple account records in sequence.
  const updateMany: AccountController['updateMany'] = async (items, options) => {
    const results: Array<Account | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a account via the TRPC endpoint.
  const del: AccountController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Account delete requires a valid id')
    return await $process<{ id: AccountIdSubId }, Account>('account.delete', { id: resolvedId }, options)
  }

  // Delete multiple account records in sequence.
  const deleteMany: AccountController['deleteMany'] = async (ids, options) => {
    const results: Array<Account | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a account.
  const get: AccountController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Account get requires a valid id')
    if (!resourceKey) throw new Error('Account get requires a resource key')
    return await $process('account.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: AccountController['taxonomy'] = (key: string) => {
    const prefix = `account.${key}`
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

  const subtable: AccountController['subtable'] = (key: string) => {
    const prefix = `account.subtables.${key}`
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

  const relation: AccountController['relation'] = (key: string) => {
    const prefix = `account.relations.${key}`
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
  const typesense: AccountController['typesense'] = () => {
    const prefix = `account.typesense`
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
  const refreshTypesenseFor: AccountController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'account',
      id: resolvedId,
      endpoint: 'account.typesense.resource',
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
