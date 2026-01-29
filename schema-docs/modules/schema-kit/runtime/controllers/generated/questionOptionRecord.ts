import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { QuestionOptionRecord, QuestionOptionRecordId, QuestionOptionRecordIdSubId } from '@schema/types'
type QuestionOptionRecordDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type QuestionOptionRecordCreateInput = Pick<QuestionOptionRecord, 'q' | 'qOption'> & Partial<Omit<QuestionOptionRecord, 'id'>>

export type QuestionOptionRecordUpdateInput = Partial<Omit<QuestionOptionRecord, 'id'>>
export type QuestionOptionRecordRecordId = NonNullable<QuestionOptionRecord['id']> | QuestionOptionRecordId
export type QuestionOptionRecordIdInput = ControllerIdInput<QuestionOptionRecordIdSubId, QuestionOptionRecordRecordId, QuestionOptionRecord>

export interface QuestionOptionRecordController {
  // Create a new questionOptionRecord record.
  create: (payload: QuestionOptionRecordCreateInput, options?: ApiOptions) => Promise<QuestionOptionRecord | null>
  // Create multiple questionOptionRecord records in sequence.
  createMany: (payloads: QuestionOptionRecordCreateInput[], options?: ApiOptions) => Promise<(QuestionOptionRecord | null)[]>
  // Update a questionOptionRecord by id (record object or sub-id).
  update: (id: QuestionOptionRecordIdInput, payload: QuestionOptionRecordUpdateInput, options?: ApiOptions) => Promise<QuestionOptionRecord | null>
  // Update multiple questionOptionRecord records in sequence.
  updateMany: (
    items: Array<{ id: QuestionOptionRecordIdInput; payload: QuestionOptionRecordUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(QuestionOptionRecord | null)[]>
  // Delete a questionOptionRecord by id (record object or sub-id).
  delete: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<QuestionOptionRecord | null>
  // Delete multiple questionOptionRecord records in sequence.
  deleteMany: (ids: QuestionOptionRecordIdInput[], options?: ApiOptions) => Promise<(QuestionOptionRecord | null)[]>
  // Fetch a resource view/function for the questionOptionRecord.
  get: (id: QuestionOptionRecordIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: QuestionOptionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionOptionRecordIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: QuestionOptionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: QuestionOptionRecordIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
  get: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: QuestionOptionRecordIdInput,
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
  attach: (id: QuestionOptionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionOptionRecordIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: QuestionOptionRecordIdInput, options?: ApiOptions) => Promise<QuestionOptionRecordDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionOptionRecordDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionOptionRecordDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type QuestionOptionRecordControllerOverride = ControllerOverride<QuestionOptionRecordController>

export function createGeneratedQuestionOptionRecordController(): QuestionOptionRecordController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: QuestionOptionRecordIdInput) => crud.resolveRecordSubId<QuestionOptionRecordIdSubId>(value)

  // Create a questionOptionRecord via the TRPC endpoint.
  const create: QuestionOptionRecordController['create'] = async (payload, options) => {
    return await $process<QuestionOptionRecordCreateInput, QuestionOptionRecord>('questionOptionRecord.create', payload, options)
  }

  // Create multiple questionOptionRecord records in sequence.
  const createMany: QuestionOptionRecordController['createMany'] = async (payloads, options) => {
    const results: Array<QuestionOptionRecord | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a questionOptionRecord via the TRPC endpoint.
  const update: QuestionOptionRecordController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOptionRecord update requires a valid id')
    return await $process<{ id: QuestionOptionRecordIdSubId; payload: QuestionOptionRecordUpdateInput }, QuestionOptionRecord>(
      'questionOptionRecord.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple questionOptionRecord records in sequence.
  const updateMany: QuestionOptionRecordController['updateMany'] = async (items, options) => {
    const results: Array<QuestionOptionRecord | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a questionOptionRecord via the TRPC endpoint.
  const del: QuestionOptionRecordController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOptionRecord delete requires a valid id')
    return await $process<{ id: QuestionOptionRecordIdSubId }, QuestionOptionRecord>('questionOptionRecord.delete', { id: resolvedId }, options)
  }

  // Delete multiple questionOptionRecord records in sequence.
  const deleteMany: QuestionOptionRecordController['deleteMany'] = async (ids, options) => {
    const results: Array<QuestionOptionRecord | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a questionOptionRecord.
  const get: QuestionOptionRecordController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOptionRecord get requires a valid id')
    if (!resourceKey) throw new Error('QuestionOptionRecord get requires a resource key')
    return await $process('questionOptionRecord.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: QuestionOptionRecordController['taxonomy'] = (key: string) => {
    const prefix = `questionOptionRecord.${key}`
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

  const subtable: QuestionOptionRecordController['subtable'] = (key: string) => {
    const prefix = `questionOptionRecord.subtables.${key}`
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

  const relation: QuestionOptionRecordController['relation'] = (key: string) => {
    const prefix = `questionOptionRecord.relations.${key}`
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
  const typesense: QuestionOptionRecordController['typesense'] = () => {
    const prefix = `questionOptionRecord.typesense`
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
  const refreshTypesenseFor: QuestionOptionRecordController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'qor',
      id: resolvedId,
      endpoint: 'questionOptionRecord.typesense.resource',
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
