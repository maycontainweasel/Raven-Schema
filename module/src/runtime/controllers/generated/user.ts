import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { User, UserId, UserIdSubId } from '@schema/types'
type UserDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type UserCreateInput = Pick<User, 'email' | 'firstName' | 'surname' | 'role'> & Partial<Omit<User, 'id'>>

export type UserUpdateInput = Partial<Omit<User, 'id'>>
export type UserRecordId = NonNullable<User['id']> | UserId
export type UserIdInput = ControllerIdInput<UserIdSubId, UserRecordId, User>

export interface UserController {
  // Create a new user record.
  create: (payload: UserCreateInput, options?: ApiOptions) => Promise<User | null>
  // Create multiple user records in sequence.
  createMany: (payloads: UserCreateInput[], options?: ApiOptions) => Promise<(User | null)[]>
  // Update a user by id (record object or sub-id).
  update: (id: UserIdInput, payload: UserUpdateInput, options?: ApiOptions) => Promise<User | null>
  // Update multiple user records in sequence.
  updateMany: (
    items: Array<{ id: UserIdInput; payload: UserUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(User | null)[]>
  // Delete a user by id (record object or sub-id).
  delete: (id: UserIdInput, options?: ApiOptions) => Promise<User | null>
  // Delete multiple user records in sequence.
  deleteMany: (ids: UserIdInput[], options?: ApiOptions) => Promise<(User | null)[]>
  // Fetch a resource view/function for the user.
  get: (id: UserIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: UserIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: UserIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: UserIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: UserIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: UserIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: UserIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: UserIdInput, options?: ApiOptions) => Promise<any>
  get: (id: UserIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: UserIdInput,
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
  attach: (id: UserIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: UserIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: UserIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: UserIdInput, options?: ApiOptions) => Promise<UserDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<UserDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<UserDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type UserControllerOverride = ControllerOverride<UserController>

export function createGeneratedUserController(): UserController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: UserIdInput) => crud.resolveRecordSubId<UserIdSubId>(value)

  // Create a user via the TRPC endpoint.
  const create: UserController['create'] = async (payload, options) => {
    return await $process<UserCreateInput, User>('user.create', payload, options)
  }

  // Create multiple user records in sequence.
  const createMany: UserController['createMany'] = async (payloads, options) => {
    const results: Array<User | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a user via the TRPC endpoint.
  const update: UserController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('User update requires a valid id')
    return await $process<{ id: UserIdSubId; payload: UserUpdateInput }, User>(
      'user.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple user records in sequence.
  const updateMany: UserController['updateMany'] = async (items, options) => {
    const results: Array<User | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a user via the TRPC endpoint.
  const del: UserController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('User delete requires a valid id')
    return await $process<{ id: UserIdSubId }, User>('user.delete', { id: resolvedId }, options)
  }

  // Delete multiple user records in sequence.
  const deleteMany: UserController['deleteMany'] = async (ids, options) => {
    const results: Array<User | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a user.
  const get: UserController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('User get requires a valid id')
    if (!resourceKey) throw new Error('User get requires a resource key')
    return await $process('user.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: UserController['taxonomy'] = (key: string) => {
    const prefix = `user.${key}`
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

  const subtable: UserController['subtable'] = (key: string) => {
    const prefix = `user.subtables.${key}`
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

  const relation: UserController['relation'] = (key: string) => {
    const prefix = `user.relations.${key}`
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
  const typesense: UserController['typesense'] = () => {
    const prefix = `user.typesense`
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
  const refreshTypesenseFor: UserController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'u',
      id: resolvedId,
      endpoint: 'user.typesense.resource',
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
