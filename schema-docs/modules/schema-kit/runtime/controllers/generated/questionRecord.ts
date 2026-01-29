import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { QuestionRecord, QuestionRecordId, QuestionRecordIdSubId } from '@schema/types'
type QuestionRecordDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type QuestionRecordCreateInput = Partial<Omit<QuestionRecord, 'id'>>

export type QuestionRecordUpdateInput = Partial<Omit<QuestionRecord, 'id'>>
export type QuestionRecordRecordId = NonNullable<QuestionRecord['id']> | QuestionRecordId
export type QuestionRecordIdInput = ControllerIdInput<QuestionRecordIdSubId, QuestionRecordRecordId, QuestionRecord>

export interface QuestionRecordController {
  // Create a new questionRecord record.
  create: (payload: QuestionRecordCreateInput, options?: ApiOptions) => Promise<QuestionRecord | null>
  // Create multiple questionRecord records in sequence.
  createMany: (payloads: QuestionRecordCreateInput[], options?: ApiOptions) => Promise<(QuestionRecord | null)[]>
  // Update a questionRecord by id (record object or sub-id).
  update: (id: QuestionRecordIdInput, payload: QuestionRecordUpdateInput, options?: ApiOptions) => Promise<QuestionRecord | null>
  // Update multiple questionRecord records in sequence.
  updateMany: (
    items: Array<{ id: QuestionRecordIdInput; payload: QuestionRecordUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(QuestionRecord | null)[]>
  // Delete a questionRecord by id (record object or sub-id).
  delete: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<QuestionRecord | null>
  // Delete multiple questionRecord records in sequence.
  deleteMany: (ids: QuestionRecordIdInput[], options?: ApiOptions) => Promise<(QuestionRecord | null)[]>
  // Fetch a resource view/function for the questionRecord.
  get: (id: QuestionRecordIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: QuestionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: QuestionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: QuestionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<any>
  get: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: QuestionRecordIdInput,
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
  attach: (id: QuestionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: QuestionRecordIdInput, options?: ApiOptions) => Promise<QuestionRecordDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionRecordDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionRecordDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type QuestionRecordControllerOverride = ControllerOverride<QuestionRecordController>

export function createGeneratedQuestionRecordController(): QuestionRecordController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: QuestionRecordIdInput) => crud.resolveRecordSubId<QuestionRecordIdSubId>(value)

  // Create a questionRecord via the TRPC endpoint.
  const create: QuestionRecordController['create'] = async (payload, options) => {
    return await $process<QuestionRecordCreateInput, QuestionRecord>('questionRecord.create', payload, options)
  }

  // Create multiple questionRecord records in sequence.
  const createMany: QuestionRecordController['createMany'] = async (payloads, options) => {
    const results: Array<QuestionRecord | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a questionRecord via the TRPC endpoint.
  const update: QuestionRecordController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionRecord update requires a valid id')
    return await $process<{ id: QuestionRecordIdSubId; payload: QuestionRecordUpdateInput }, QuestionRecord>(
      'questionRecord.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple questionRecord records in sequence.
  const updateMany: QuestionRecordController['updateMany'] = async (items, options) => {
    const results: Array<QuestionRecord | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a questionRecord via the TRPC endpoint.
  const del: QuestionRecordController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionRecord delete requires a valid id')
    return await $process<{ id: QuestionRecordIdSubId }, QuestionRecord>('questionRecord.delete', { id: resolvedId }, options)
  }

  // Delete multiple questionRecord records in sequence.
  const deleteMany: QuestionRecordController['deleteMany'] = async (ids, options) => {
    const results: Array<QuestionRecord | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a questionRecord.
  const get: QuestionRecordController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionRecord get requires a valid id')
    if (!resourceKey) throw new Error('QuestionRecord get requires a resource key')
    return await $process('questionRecord.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: QuestionRecordController['taxonomy'] = (key: string) => {
    const prefix = `questionRecord.${key}`
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

  const subtable: QuestionRecordController['subtable'] = (key: string) => {
    const prefix = `questionRecord.subtables.${key}`
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

  const relation: QuestionRecordController['relation'] = (key: string) => {
    const prefix = `questionRecord.relations.${key}`
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
  const typesense: QuestionRecordController['typesense'] = () => {
    const prefix = `questionRecord.typesense`
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
  const refreshTypesenseFor: QuestionRecordController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'qRecord',
      id: resolvedId,
      endpoint: 'questionRecord.typesense.resource',
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
