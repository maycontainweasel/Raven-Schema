import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Instance, InstanceId, InstanceIdSubId } from '@schema/types'
type InstanceDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type InstanceCreateInput = Pick<Instance, 'key' | 'title'> & Partial<Omit<Instance, 'id'>>

export type InstanceUpdateInput = Partial<Omit<Instance, 'id'>>
export type InstanceRecordId = NonNullable<Instance['id']> | InstanceId
export type InstanceIdInput = ControllerIdInput<InstanceIdSubId, InstanceRecordId, Instance>

export interface InstanceController {
  // Create a new instance record.
  create: (payload: InstanceCreateInput, options?: ApiOptions) => Promise<Instance | null>
  // Create multiple instance records in sequence.
  createMany: (payloads: InstanceCreateInput[], options?: ApiOptions) => Promise<(Instance | null)[]>
  // Update a instance by id (record object or sub-id).
  update: (id: InstanceIdInput, payload: InstanceUpdateInput, options?: ApiOptions) => Promise<Instance | null>
  // Update multiple instance records in sequence.
  updateMany: (
    items: Array<{ id: InstanceIdInput; payload: InstanceUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Instance | null)[]>
  // Delete a instance by id (record object or sub-id).
  delete: (id: InstanceIdInput, options?: ApiOptions) => Promise<Instance | null>
  // Delete multiple instance records in sequence.
  deleteMany: (ids: InstanceIdInput[], options?: ApiOptions) => Promise<(Instance | null)[]>
  // Fetch a resource view/function for the instance.
  get: (id: InstanceIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: InstanceIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: InstanceIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: InstanceIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: InstanceIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: InstanceIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: InstanceIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: InstanceIdInput, options?: ApiOptions) => Promise<any>
  get: (id: InstanceIdInput, options?: ApiOptions) => Promise<any>
  list: (id: InstanceIdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: InstanceIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: InstanceIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: InstanceIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: InstanceIdInput, options?: ApiOptions) => Promise<InstanceDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<InstanceDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<InstanceDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type InstanceControllerOverride = ControllerOverride<InstanceController>

export function createGeneratedInstanceController(): InstanceController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: InstanceIdInput) => crud.resolveRecordSubId<InstanceIdSubId>(value)

  // Create a instance via the TRPC endpoint.
  const create: InstanceController['create'] = async (payload, options) => {
    return await $process<InstanceCreateInput, Instance>('instance.create', payload, options)
  }

  // Create multiple instance records in sequence.
  const createMany: InstanceController['createMany'] = async (payloads, options) => {
    const results: Array<Instance | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a instance via the TRPC endpoint.
  const update: InstanceController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Instance update requires a valid id')
    return await $process<{ id: InstanceIdSubId; payload: InstanceUpdateInput }, Instance>(
      'instance.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple instance records in sequence.
  const updateMany: InstanceController['updateMany'] = async (items, options) => {
    const results: Array<Instance | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a instance via the TRPC endpoint.
  const del: InstanceController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Instance delete requires a valid id')
    return await $process<{ id: InstanceIdSubId }, Instance>('instance.delete', { id: resolvedId }, options)
  }

  // Delete multiple instance records in sequence.
  const deleteMany: InstanceController['deleteMany'] = async (ids, options) => {
    const results: Array<Instance | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a instance.
  const get: InstanceController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Instance get requires a valid id')
    if (!resourceKey) throw new Error('Instance get requires a resource key')
    return await $process('instance.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: InstanceController['taxonomy'] = (key: string) => {
    const prefix = `instance.${key}`
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

  const subtable: InstanceController['subtable'] = (key: string) => {
    const prefix = `instance.subtables.${key}`
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

  const relation: InstanceController['relation'] = (key: string) => {
    const prefix = `instance.relations.${key}`
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
  const typesense: InstanceController['typesense'] = () => {
    const prefix = `instance.typesense`
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
  const refreshTypesenseFor: InstanceController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'instance',
      id: resolvedId,
      endpoint: 'instance.typesense.resource',
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
