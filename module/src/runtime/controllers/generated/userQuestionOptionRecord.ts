import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { UserQuestionOptionRecord, UserQuestionOptionRecordId, UserQuestionOptionRecordIdSubId } from '@schema/types'
type UserQuestionOptionRecordDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type UserQuestionOptionRecordCreateInput = Pick<UserQuestionOptionRecord, 'u' | 'qOption'> & Partial<Omit<UserQuestionOptionRecord, 'id'>>

export type UserQuestionOptionRecordUpdateInput = Partial<Omit<UserQuestionOptionRecord, 'id'>>
export type UserQuestionOptionRecordRecordId = NonNullable<UserQuestionOptionRecord['id']> | UserQuestionOptionRecordId
export type UserQuestionOptionRecordIdInput = ControllerIdInput<UserQuestionOptionRecordIdSubId, UserQuestionOptionRecordRecordId, UserQuestionOptionRecord>

export interface UserQuestionOptionRecordController {
  // Create a new userQuestionOptionRecord record.
  create: (payload: UserQuestionOptionRecordCreateInput, options?: ApiOptions) => Promise<UserQuestionOptionRecord | null>
  // Create multiple userQuestionOptionRecord records in sequence.
  createMany: (payloads: UserQuestionOptionRecordCreateInput[], options?: ApiOptions) => Promise<(UserQuestionOptionRecord | null)[]>
  // Update a userQuestionOptionRecord by id (record object or sub-id).
  update: (id: UserQuestionOptionRecordIdInput, payload: UserQuestionOptionRecordUpdateInput, options?: ApiOptions) => Promise<UserQuestionOptionRecord | null>
  // Update multiple userQuestionOptionRecord records in sequence.
  updateMany: (
    items: Array<{ id: UserQuestionOptionRecordIdInput; payload: UserQuestionOptionRecordUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(UserQuestionOptionRecord | null)[]>
  // Delete a userQuestionOptionRecord by id (record object or sub-id).
  delete: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<UserQuestionOptionRecord | null>
  // Delete multiple userQuestionOptionRecord records in sequence.
  deleteMany: (ids: UserQuestionOptionRecordIdInput[], options?: ApiOptions) => Promise<(UserQuestionOptionRecord | null)[]>
  // Fetch a resource view/function for the userQuestionOptionRecord.
  get: (id: UserQuestionOptionRecordIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: UserQuestionOptionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: UserQuestionOptionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: UserQuestionOptionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: UserQuestionOptionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
  get: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
  list: (id: UserQuestionOptionRecordIdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: UserQuestionOptionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: UserQuestionOptionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: UserQuestionOptionRecordIdInput, options?: ApiOptions) => Promise<UserQuestionOptionRecordDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<UserQuestionOptionRecordDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<UserQuestionOptionRecordDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type UserQuestionOptionRecordControllerOverride = ControllerOverride<UserQuestionOptionRecordController>

export function createGeneratedUserQuestionOptionRecordController(): UserQuestionOptionRecordController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: UserQuestionOptionRecordIdInput) => crud.resolveRecordSubId<UserQuestionOptionRecordIdSubId>(value)

  // Create a userQuestionOptionRecord via the TRPC endpoint.
  const create: UserQuestionOptionRecordController['create'] = async (payload, options) => {
    return await $process<UserQuestionOptionRecordCreateInput, UserQuestionOptionRecord>('userQuestionOptionRecord.create', payload, options)
  }

  // Create multiple userQuestionOptionRecord records in sequence.
  const createMany: UserQuestionOptionRecordController['createMany'] = async (payloads, options) => {
    const results: Array<UserQuestionOptionRecord | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a userQuestionOptionRecord via the TRPC endpoint.
  const update: UserQuestionOptionRecordController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('UserQuestionOptionRecord update requires a valid id')
    return await $process<{ id: UserQuestionOptionRecordIdSubId; payload: UserQuestionOptionRecordUpdateInput }, UserQuestionOptionRecord>(
      'userQuestionOptionRecord.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple userQuestionOptionRecord records in sequence.
  const updateMany: UserQuestionOptionRecordController['updateMany'] = async (items, options) => {
    const results: Array<UserQuestionOptionRecord | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a userQuestionOptionRecord via the TRPC endpoint.
  const del: UserQuestionOptionRecordController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('UserQuestionOptionRecord delete requires a valid id')
    return await $process<{ id: UserQuestionOptionRecordIdSubId }, UserQuestionOptionRecord>('userQuestionOptionRecord.delete', { id: resolvedId }, options)
  }

  // Delete multiple userQuestionOptionRecord records in sequence.
  const deleteMany: UserQuestionOptionRecordController['deleteMany'] = async (ids, options) => {
    const results: Array<UserQuestionOptionRecord | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a userQuestionOptionRecord.
  const get: UserQuestionOptionRecordController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('UserQuestionOptionRecord get requires a valid id')
    if (!resourceKey) throw new Error('UserQuestionOptionRecord get requires a resource key')
    return await $process('userQuestionOptionRecord.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: UserQuestionOptionRecordController['taxonomy'] = (key: string) => {
    const prefix = `userQuestionOptionRecord.${key}`
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

  const subtable: UserQuestionOptionRecordController['subtable'] = (key: string) => {
    const prefix = `userQuestionOptionRecord.subtables.${key}`
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

  const relation: UserQuestionOptionRecordController['relation'] = (key: string) => {
    const prefix = `userQuestionOptionRecord.relations.${key}`
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
  const typesense: UserQuestionOptionRecordController['typesense'] = () => {
    const prefix = `userQuestionOptionRecord.typesense`
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
  const refreshTypesenseFor: UserQuestionOptionRecordController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'uqor',
      id: resolvedId,
      endpoint: 'userQuestionOptionRecord.typesense.resource',
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
