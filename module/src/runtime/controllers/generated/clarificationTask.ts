import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { ClarificationTask, ClarificationTaskId, ClarificationTaskIdSubId } from '@schema/types'
type ClarificationTaskDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type ClarificationTaskCreateInput = Pick<ClarificationTask, 'space' | 'key' | 'transaction' | 'status' | 'question'> & Partial<Omit<ClarificationTask, 'id'>>

export type ClarificationTaskUpdateInput = Partial<Omit<ClarificationTask, 'id'>>
export type ClarificationTaskRecordId = NonNullable<ClarificationTask['id']> | ClarificationTaskId
export type ClarificationTaskIdInput = ControllerIdInput<ClarificationTaskIdSubId, ClarificationTaskRecordId, ClarificationTask>

export interface ClarificationTaskController {
  // Create a new clarificationTask record.
  create: (payload: ClarificationTaskCreateInput, options?: ApiOptions) => Promise<ClarificationTask | null>
  // Create multiple clarificationTask records in sequence.
  createMany: (payloads: ClarificationTaskCreateInput[], options?: ApiOptions) => Promise<(ClarificationTask | null)[]>
  // Update a clarificationTask by id (record object or sub-id).
  update: (id: ClarificationTaskIdInput, payload: ClarificationTaskUpdateInput, options?: ApiOptions) => Promise<ClarificationTask | null>
  // Update multiple clarificationTask records in sequence.
  updateMany: (
    items: Array<{ id: ClarificationTaskIdInput; payload: ClarificationTaskUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(ClarificationTask | null)[]>
  // Delete a clarificationTask by id (record object or sub-id).
  delete: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<ClarificationTask | null>
  // Delete multiple clarificationTask records in sequence.
  deleteMany: (ids: ClarificationTaskIdInput[], options?: ApiOptions) => Promise<(ClarificationTask | null)[]>
  // Fetch a resource view/function for the clarificationTask.
  get: (id: ClarificationTaskIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: ClarificationTaskIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: ClarificationTaskIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: ClarificationTaskIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: ClarificationTaskIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<any>
  get: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: ClarificationTaskIdInput,
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
  attach: (id: ClarificationTaskIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: ClarificationTaskIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: ClarificationTaskIdInput, options?: ApiOptions) => Promise<ClarificationTaskDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<ClarificationTaskDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<ClarificationTaskDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type ClarificationTaskControllerOverride = ControllerOverride<ClarificationTaskController>

export function createGeneratedClarificationTaskController(): ClarificationTaskController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: ClarificationTaskIdInput) => crud.resolveRecordSubId<ClarificationTaskIdSubId>(value)

  // Create a clarificationTask via the TRPC endpoint.
  const create: ClarificationTaskController['create'] = async (payload, options) => {
    return await $process<ClarificationTaskCreateInput, ClarificationTask>('clarificationTask.create', payload, options)
  }

  // Create multiple clarificationTask records in sequence.
  const createMany: ClarificationTaskController['createMany'] = async (payloads, options) => {
    const results: Array<ClarificationTask | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a clarificationTask via the TRPC endpoint.
  const update: ClarificationTaskController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClarificationTask update requires a valid id')
    return await $process<{ id: ClarificationTaskIdSubId; payload: ClarificationTaskUpdateInput }, ClarificationTask>(
      'clarificationTask.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple clarificationTask records in sequence.
  const updateMany: ClarificationTaskController['updateMany'] = async (items, options) => {
    const results: Array<ClarificationTask | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a clarificationTask via the TRPC endpoint.
  const del: ClarificationTaskController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClarificationTask delete requires a valid id')
    return await $process<{ id: ClarificationTaskIdSubId }, ClarificationTask>('clarificationTask.delete', { id: resolvedId }, options)
  }

  // Delete multiple clarificationTask records in sequence.
  const deleteMany: ClarificationTaskController['deleteMany'] = async (ids, options) => {
    const results: Array<ClarificationTask | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a clarificationTask.
  const get: ClarificationTaskController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClarificationTask get requires a valid id')
    if (!resourceKey) throw new Error('ClarificationTask get requires a resource key')
    return await $process('clarificationTask.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: ClarificationTaskController['taxonomy'] = (key: string) => {
    const prefix = `clarificationTask.${key}`
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

  const subtable: ClarificationTaskController['subtable'] = (key: string) => {
    const prefix = `clarificationTask.subtables.${key}`
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

  const relation: ClarificationTaskController['relation'] = (key: string) => {
    const prefix = `clarificationTask.relations.${key}`
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
  const typesense: ClarificationTaskController['typesense'] = () => {
    const prefix = `clarificationTask.typesense`
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
  const refreshTypesenseFor: ClarificationTaskController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'clarificationTask',
      id: resolvedId,
      endpoint: 'clarificationTask.typesense.resource',
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
