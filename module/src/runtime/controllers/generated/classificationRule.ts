import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { ClassificationRule, ClassificationRuleId, ClassificationRuleIdSubId } from '@schema/types'
type ClassificationRuleDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type ClassificationRuleCreateInput = Pick<ClassificationRule, 'space' | 'key' | 'name' | 'matcher' | 'scope' | 'active'> & Partial<Omit<ClassificationRule, 'id'>>

export type ClassificationRuleUpdateInput = Partial<Omit<ClassificationRule, 'id'>>
export type ClassificationRuleRecordId = NonNullable<ClassificationRule['id']> | ClassificationRuleId
export type ClassificationRuleIdInput = ControllerIdInput<ClassificationRuleIdSubId, ClassificationRuleRecordId, ClassificationRule>

export interface ClassificationRuleController {
  // Create a new classificationRule record.
  create: (payload: ClassificationRuleCreateInput, options?: ApiOptions) => Promise<ClassificationRule | null>
  // Create multiple classificationRule records in sequence.
  createMany: (payloads: ClassificationRuleCreateInput[], options?: ApiOptions) => Promise<(ClassificationRule | null)[]>
  // Update a classificationRule by id (record object or sub-id).
  update: (id: ClassificationRuleIdInput, payload: ClassificationRuleUpdateInput, options?: ApiOptions) => Promise<ClassificationRule | null>
  // Update multiple classificationRule records in sequence.
  updateMany: (
    items: Array<{ id: ClassificationRuleIdInput; payload: ClassificationRuleUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(ClassificationRule | null)[]>
  // Delete a classificationRule by id (record object or sub-id).
  delete: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<ClassificationRule | null>
  // Delete multiple classificationRule records in sequence.
  deleteMany: (ids: ClassificationRuleIdInput[], options?: ApiOptions) => Promise<(ClassificationRule | null)[]>
  // Fetch a resource view/function for the classificationRule.
  get: (id: ClassificationRuleIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: ClassificationRuleIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: ClassificationRuleIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: ClassificationRuleIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: ClassificationRuleIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<any>
  get: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: ClassificationRuleIdInput,
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
  attach: (id: ClassificationRuleIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: ClassificationRuleIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: ClassificationRuleIdInput, options?: ApiOptions) => Promise<ClassificationRuleDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<ClassificationRuleDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<ClassificationRuleDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type ClassificationRuleControllerOverride = ControllerOverride<ClassificationRuleController>

export function createGeneratedClassificationRuleController(): ClassificationRuleController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: ClassificationRuleIdInput) => crud.resolveRecordSubId<ClassificationRuleIdSubId>(value)

  // Create a classificationRule via the TRPC endpoint.
  const create: ClassificationRuleController['create'] = async (payload, options) => {
    return await $process<ClassificationRuleCreateInput, ClassificationRule>('classificationRule.create', payload, options)
  }

  // Create multiple classificationRule records in sequence.
  const createMany: ClassificationRuleController['createMany'] = async (payloads, options) => {
    const results: Array<ClassificationRule | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a classificationRule via the TRPC endpoint.
  const update: ClassificationRuleController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClassificationRule update requires a valid id')
    return await $process<{ id: ClassificationRuleIdSubId; payload: ClassificationRuleUpdateInput }, ClassificationRule>(
      'classificationRule.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple classificationRule records in sequence.
  const updateMany: ClassificationRuleController['updateMany'] = async (items, options) => {
    const results: Array<ClassificationRule | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a classificationRule via the TRPC endpoint.
  const del: ClassificationRuleController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClassificationRule delete requires a valid id')
    return await $process<{ id: ClassificationRuleIdSubId }, ClassificationRule>('classificationRule.delete', { id: resolvedId }, options)
  }

  // Delete multiple classificationRule records in sequence.
  const deleteMany: ClassificationRuleController['deleteMany'] = async (ids, options) => {
    const results: Array<ClassificationRule | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a classificationRule.
  const get: ClassificationRuleController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('ClassificationRule get requires a valid id')
    if (!resourceKey) throw new Error('ClassificationRule get requires a resource key')
    return await $process('classificationRule.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: ClassificationRuleController['taxonomy'] = (key: string) => {
    const prefix = `classificationRule.${key}`
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

  const subtable: ClassificationRuleController['subtable'] = (key: string) => {
    const prefix = `classificationRule.subtables.${key}`
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

  const relation: ClassificationRuleController['relation'] = (key: string) => {
    const prefix = `classificationRule.relations.${key}`
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
  const typesense: ClassificationRuleController['typesense'] = () => {
    const prefix = `classificationRule.typesense`
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
  const refreshTypesenseFor: ClassificationRuleController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'classificationRule',
      id: resolvedId,
      endpoint: 'classificationRule.typesense.resource',
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
