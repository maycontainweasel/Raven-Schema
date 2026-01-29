import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { InstanceSettings, InstanceSettingsID, InstanceSettingsIDSubId } from '@schema/types'
type InstanceSettingsDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type InstanceSettingsCreateInput = Partial<Omit<InstanceSettings, 'id'>>

export type InstanceSettingsUpdateInput = Partial<Omit<InstanceSettings, 'id'>>
export type InstanceSettingsRecordId = NonNullable<InstanceSettings['id']> | InstanceSettingsID
export type InstanceSettingsIdInput = ControllerIdInput<InstanceSettingsIDSubId, InstanceSettingsRecordId, InstanceSettings>

export interface InstanceSettingsController {
  // Create a new settings record.
  create: (payload: InstanceSettingsCreateInput, options?: ApiOptions) => Promise<InstanceSettings | null>
  // Create multiple settings records in sequence.
  createMany: (payloads: InstanceSettingsCreateInput[], options?: ApiOptions) => Promise<(InstanceSettings | null)[]>
  // Update a settings by id (record object or sub-id).
  update: (id: InstanceSettingsIdInput, payload: InstanceSettingsUpdateInput, options?: ApiOptions) => Promise<InstanceSettings | null>
  // Update multiple settings records in sequence.
  updateMany: (
    items: Array<{ id: InstanceSettingsIdInput; payload: InstanceSettingsUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(InstanceSettings | null)[]>
  // Delete a settings by id (record object or sub-id).
  delete: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<InstanceSettings | null>
  // Delete multiple settings records in sequence.
  deleteMany: (ids: InstanceSettingsIdInput[], options?: ApiOptions) => Promise<(InstanceSettings | null)[]>
  // Fetch a resource view/function for the settings.
  get: (id: InstanceSettingsIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: InstanceSettingsIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: InstanceSettingsIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: InstanceSettingsIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: InstanceSettingsIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<any>
  get: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<any>
  list: (id: InstanceSettingsIdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: InstanceSettingsIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: InstanceSettingsIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: InstanceSettingsIdInput, options?: ApiOptions) => Promise<InstanceSettingsDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<InstanceSettingsDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<InstanceSettingsDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type InstanceSettingsControllerOverride = ControllerOverride<InstanceSettingsController>

export function createGeneratedInstanceSettingsController(): InstanceSettingsController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: InstanceSettingsIdInput) => crud.resolveRecordSubId<InstanceSettingsIDSubId>(value)

  // Create a settings via the TRPC endpoint.
  const create: InstanceSettingsController['create'] = async (payload, options) => {
    return await $process<InstanceSettingsCreateInput, InstanceSettings>('settings.create', payload, options)
  }

  // Create multiple settings records in sequence.
  const createMany: InstanceSettingsController['createMany'] = async (payloads, options) => {
    const results: Array<InstanceSettings | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a settings via the TRPC endpoint.
  const update: InstanceSettingsController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('InstanceSettings update requires a valid id')
    return await $process<{ id: InstanceSettingsIDSubId; payload: InstanceSettingsUpdateInput }, InstanceSettings>(
      'settings.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple settings records in sequence.
  const updateMany: InstanceSettingsController['updateMany'] = async (items, options) => {
    const results: Array<InstanceSettings | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a settings via the TRPC endpoint.
  const del: InstanceSettingsController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('InstanceSettings delete requires a valid id')
    return await $process<{ id: InstanceSettingsIDSubId }, InstanceSettings>('settings.delete', { id: resolvedId }, options)
  }

  // Delete multiple settings records in sequence.
  const deleteMany: InstanceSettingsController['deleteMany'] = async (ids, options) => {
    const results: Array<InstanceSettings | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a settings.
  const get: InstanceSettingsController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('InstanceSettings get requires a valid id')
    if (!resourceKey) throw new Error('InstanceSettings get requires a resource key')
    return await $process('settings.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: InstanceSettingsController['taxonomy'] = (key: string) => {
    const prefix = `settings.${key}`
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

  const subtable: InstanceSettingsController['subtable'] = (key: string) => {
    const prefix = `settings.subtables.${key}`
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

  const relation: InstanceSettingsController['relation'] = (key: string) => {
    const prefix = `settings.relations.${key}`
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
  const typesense: InstanceSettingsController['typesense'] = () => {
    const prefix = `settings.typesense`
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
  const refreshTypesenseFor: InstanceSettingsController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'instanceSettings',
      id: resolvedId,
      endpoint: 'settings.typesense.resource',
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
