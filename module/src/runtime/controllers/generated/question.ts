import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Question, QuestionId, QuestionIdSubId } from '@schema/types'
type QuestionDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type QuestionCreateInput = Pick<Question, 'qid' | 'question'> & Partial<Omit<Question, 'id'>>

export type QuestionUpdateInput = Partial<Omit<Question, 'id'>>
export type QuestionRecordId = NonNullable<Question['id']> | QuestionId
export type QuestionIdInput = ControllerIdInput<QuestionIdSubId, QuestionRecordId, Question>

export interface QuestionController {
  // Create a new question record.
  create: (payload: QuestionCreateInput, options?: ApiOptions) => Promise<Question | null>
  // Create multiple question records in sequence.
  createMany: (payloads: QuestionCreateInput[], options?: ApiOptions) => Promise<(Question | null)[]>
  // Update a question by id (record object or sub-id).
  update: (id: QuestionIdInput, payload: QuestionUpdateInput, options?: ApiOptions) => Promise<Question | null>
  // Update multiple question records in sequence.
  updateMany: (
    items: Array<{ id: QuestionIdInput; payload: QuestionUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Question | null)[]>
  // Delete a question by id (record object or sub-id).
  delete: (id: QuestionIdInput, options?: ApiOptions) => Promise<Question | null>
  // Delete multiple question records in sequence.
  deleteMany: (ids: QuestionIdInput[], options?: ApiOptions) => Promise<(Question | null)[]>
  // Fetch a resource view/function for the question.
  get: (id: QuestionIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: QuestionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: QuestionIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: QuestionIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: QuestionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: QuestionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: QuestionIdInput, options?: ApiOptions) => Promise<any>
  get: (id: QuestionIdInput, options?: ApiOptions) => Promise<any>
  list: (id: QuestionIdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: QuestionIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: QuestionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: QuestionIdInput, options?: ApiOptions) => Promise<QuestionDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type QuestionControllerOverride = ControllerOverride<QuestionController>

export function createGeneratedQuestionController(): QuestionController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: QuestionIdInput) => crud.resolveRecordSubId<QuestionIdSubId>(value)

  // Create a question via the TRPC endpoint.
  const create: QuestionController['create'] = async (payload, options) => {
    return await $process<QuestionCreateInput, Question>('question.create', payload, options)
  }

  // Create multiple question records in sequence.
  const createMany: QuestionController['createMany'] = async (payloads, options) => {
    const results: Array<Question | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a question via the TRPC endpoint.
  const update: QuestionController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Question update requires a valid id')
    return await $process<{ id: QuestionIdSubId; payload: QuestionUpdateInput }, Question>(
      'question.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple question records in sequence.
  const updateMany: QuestionController['updateMany'] = async (items, options) => {
    const results: Array<Question | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a question via the TRPC endpoint.
  const del: QuestionController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Question delete requires a valid id')
    return await $process<{ id: QuestionIdSubId }, Question>('question.delete', { id: resolvedId }, options)
  }

  // Delete multiple question records in sequence.
  const deleteMany: QuestionController['deleteMany'] = async (ids, options) => {
    const results: Array<Question | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a question.
  const get: QuestionController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Question get requires a valid id')
    if (!resourceKey) throw new Error('Question get requires a resource key')
    return await $process('question.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: QuestionController['taxonomy'] = (key: string) => {
    const prefix = `question.${key}`
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

  const subtable: QuestionController['subtable'] = (key: string) => {
    const prefix = `question.subtables.${key}`
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

  const relation: QuestionController['relation'] = (key: string) => {
    const prefix = `question.relations.${key}`
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
  const typesense: QuestionController['typesense'] = () => {
    const prefix = `question.typesense`
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
  const refreshTypesenseFor: QuestionController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'q',
      id: resolvedId,
      endpoint: 'question.typesense.resource',
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
