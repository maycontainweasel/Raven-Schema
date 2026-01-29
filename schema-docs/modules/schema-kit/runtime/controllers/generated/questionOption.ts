import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { QuestionOption, QuestionOptionId, QuestionOptionIdSubId } from '@schema/types'
type QuestionOptionDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type QuestionOptionCreateInput = Pick<QuestionOption, 'label'> & Partial<Omit<QuestionOption, 'id'>>

export type QuestionOptionUpdateInput = Partial<Omit<QuestionOption, 'id'>>
export type QuestionOptionRecordId = NonNullable<QuestionOption['id']> | QuestionOptionId
export type QuestionOptionIdInput = ControllerIdInput<QuestionOptionIdSubId, QuestionOptionRecordId, QuestionOption>

export interface QuestionOptionController {
  // Create a new questionOption record.
  create: (payload: QuestionOptionCreateInput, options?: ApiOptions) => Promise<QuestionOption | null>
  // Create multiple questionOption records in sequence.
  createMany: (payloads: QuestionOptionCreateInput[], options?: ApiOptions) => Promise<(QuestionOption | null)[]>
  // Update a questionOption by id (record object or sub-id).
  update: (id: QuestionOptionIdInput, payload: QuestionOptionUpdateInput, options?: ApiOptions) => Promise<QuestionOption | null>
  // Update multiple questionOption records in sequence.
  updateMany: (
    items: Array<{ id: QuestionOptionIdInput; payload: QuestionOptionUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(QuestionOption | null)[]>
  // Delete a questionOption by id (record object or sub-id).
  delete: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<QuestionOption | null>
  // Delete multiple questionOption records in sequence.
  deleteMany: (ids: QuestionOptionIdInput[], options?: ApiOptions) => Promise<(QuestionOption | null)[]>
  // Fetch a resource view/function for the questionOption.
  get: (id: QuestionOptionIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: QuestionOptionIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionOptionIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: QuestionOptionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: QuestionOptionIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<any>
  get: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<any>
  list: (id: QuestionOptionIdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: QuestionOptionIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: QuestionOptionIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: QuestionOptionIdInput, options?: ApiOptions) => Promise<QuestionOptionDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionOptionDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<QuestionOptionDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type QuestionOptionControllerOverride = ControllerOverride<QuestionOptionController>

export function createGeneratedQuestionOptionController(): QuestionOptionController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: QuestionOptionIdInput) => crud.resolveRecordSubId<QuestionOptionIdSubId>(value)

  // Create a questionOption via the TRPC endpoint.
  const create: QuestionOptionController['create'] = async (payload, options) => {
    return await $process<QuestionOptionCreateInput, QuestionOption>('questionOption.create', payload, options)
  }

  // Create multiple questionOption records in sequence.
  const createMany: QuestionOptionController['createMany'] = async (payloads, options) => {
    const results: Array<QuestionOption | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a questionOption via the TRPC endpoint.
  const update: QuestionOptionController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOption update requires a valid id')
    return await $process<{ id: QuestionOptionIdSubId; payload: QuestionOptionUpdateInput }, QuestionOption>(
      'questionOption.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple questionOption records in sequence.
  const updateMany: QuestionOptionController['updateMany'] = async (items, options) => {
    const results: Array<QuestionOption | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a questionOption via the TRPC endpoint.
  const del: QuestionOptionController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOption delete requires a valid id')
    return await $process<{ id: QuestionOptionIdSubId }, QuestionOption>('questionOption.delete', { id: resolvedId }, options)
  }

  // Delete multiple questionOption records in sequence.
  const deleteMany: QuestionOptionController['deleteMany'] = async (ids, options) => {
    const results: Array<QuestionOption | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a questionOption.
  const get: QuestionOptionController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('QuestionOption get requires a valid id')
    if (!resourceKey) throw new Error('QuestionOption get requires a resource key')
    return await $process('questionOption.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: QuestionOptionController['taxonomy'] = (key: string) => {
    const prefix = `questionOption.${key}`
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

  const subtable: QuestionOptionController['subtable'] = (key: string) => {
    const prefix = `questionOption.subtables.${key}`
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

  const relation: QuestionOptionController['relation'] = (key: string) => {
    const prefix = `questionOption.relations.${key}`
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
  const typesense: QuestionOptionController['typesense'] = () => {
    const prefix = `questionOption.typesense`
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
  const refreshTypesenseFor: QuestionOptionController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'qOption',
      id: resolvedId,
      endpoint: 'questionOption.typesense.resource',
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
