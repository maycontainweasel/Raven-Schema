import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { StatementRow, StatementRowId, StatementRowIdSubId } from '@schema/types'
type StatementRowDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type StatementRowCreateInput = Pick<StatementRow, 'space' | 'account' | 'statementImport' | 'rowNumber' | 'description' | 'amount' | 'currency' | 'direction' | 'status'> & Partial<Omit<StatementRow, 'id'>>

export type StatementRowUpdateInput = Partial<Omit<StatementRow, 'id'>>
export type StatementRowRecordId = NonNullable<StatementRow['id']> | StatementRowId
export type StatementRowIdInput = ControllerIdInput<StatementRowIdSubId, StatementRowRecordId, StatementRow>

export interface StatementRowController {
  // Create a new statementRow record.
  create: (payload: StatementRowCreateInput, options?: ApiOptions) => Promise<StatementRow | null>
  // Create multiple statementRow records in sequence.
  createMany: (payloads: StatementRowCreateInput[], options?: ApiOptions) => Promise<(StatementRow | null)[]>
  // Update a statementRow by id (record object or sub-id).
  update: (id: StatementRowIdInput, payload: StatementRowUpdateInput, options?: ApiOptions) => Promise<StatementRow | null>
  // Update multiple statementRow records in sequence.
  updateMany: (
    items: Array<{ id: StatementRowIdInput; payload: StatementRowUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(StatementRow | null)[]>
  // Delete a statementRow by id (record object or sub-id).
  delete: (id: StatementRowIdInput, options?: ApiOptions) => Promise<StatementRow | null>
  // Delete multiple statementRow records in sequence.
  deleteMany: (ids: StatementRowIdInput[], options?: ApiOptions) => Promise<(StatementRow | null)[]>
  // Fetch a resource view/function for the statementRow.
  get: (id: StatementRowIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: StatementRowIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: StatementRowIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: StatementRowIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: StatementRowIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: StatementRowIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: StatementRowIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: StatementRowIdInput, options?: ApiOptions) => Promise<any>
  get: (id: StatementRowIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: StatementRowIdInput,
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
  attach: (id: StatementRowIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: StatementRowIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: StatementRowIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: StatementRowIdInput, options?: ApiOptions) => Promise<StatementRowDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<StatementRowDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<StatementRowDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type StatementRowControllerOverride = ControllerOverride<StatementRowController>

export function createGeneratedStatementRowController(): StatementRowController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: StatementRowIdInput) => crud.resolveRecordSubId<StatementRowIdSubId>(value)

  // Create a statementRow via the TRPC endpoint.
  const create: StatementRowController['create'] = async (payload, options) => {
    return await $process<StatementRowCreateInput, StatementRow>('statementRow.create', payload, options)
  }

  // Create multiple statementRow records in sequence.
  const createMany: StatementRowController['createMany'] = async (payloads, options) => {
    const results: Array<StatementRow | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a statementRow via the TRPC endpoint.
  const update: StatementRowController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementRow update requires a valid id')
    return await $process<{ id: StatementRowIdSubId; payload: StatementRowUpdateInput }, StatementRow>(
      'statementRow.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple statementRow records in sequence.
  const updateMany: StatementRowController['updateMany'] = async (items, options) => {
    const results: Array<StatementRow | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a statementRow via the TRPC endpoint.
  const del: StatementRowController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementRow delete requires a valid id')
    return await $process<{ id: StatementRowIdSubId }, StatementRow>('statementRow.delete', { id: resolvedId }, options)
  }

  // Delete multiple statementRow records in sequence.
  const deleteMany: StatementRowController['deleteMany'] = async (ids, options) => {
    const results: Array<StatementRow | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a statementRow.
  const get: StatementRowController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('StatementRow get requires a valid id')
    if (!resourceKey) throw new Error('StatementRow get requires a resource key')
    return await $process('statementRow.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: StatementRowController['taxonomy'] = (key: string) => {
    const prefix = `statementRow.${key}`
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

  const subtable: StatementRowController['subtable'] = (key: string) => {
    const prefix = `statementRow.subtables.${key}`
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

  const relation: StatementRowController['relation'] = (key: string) => {
    const prefix = `statementRow.relations.${key}`
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
  const typesense: StatementRowController['typesense'] = () => {
    const prefix = `statementRow.typesense`
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
  const refreshTypesenseFor: StatementRowController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'statementRow',
      id: resolvedId,
      endpoint: 'statementRow.typesense.resource',
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
