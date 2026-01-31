import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Car, CarId, CarIdSubId } from '@schema/types'
type CarDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type CarCreateInput = Pick<Car, 'carid' | 'name' | 'color' | 'taste' | 'price' | 'quantity'> & Partial<Omit<Car, 'id'>>

export type CarUpdateInput = Partial<Omit<Car, 'id'>>
export type CarRecordId = NonNullable<Car['id']> | CarId
export type CarIdInput = ControllerIdInput<CarIdSubId, CarRecordId, Car>

export interface CarController {
  // Create a new car record.
  create: (payload: CarCreateInput, options?: ApiOptions) => Promise<Car | null>
  // Create multiple car records in sequence.
  createMany: (payloads: CarCreateInput[], options?: ApiOptions) => Promise<(Car | null)[]>
  // Update a car by id (record object or sub-id).
  update: (id: CarIdInput, payload: CarUpdateInput, options?: ApiOptions) => Promise<Car | null>
  // Update multiple car records in sequence.
  updateMany: (
    items: Array<{ id: CarIdInput; payload: CarUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Car | null)[]>
  // Delete a car by id (record object or sub-id).
  delete: (id: CarIdInput, options?: ApiOptions) => Promise<Car | null>
  // Delete multiple car records in sequence.
  deleteMany: (ids: CarIdInput[], options?: ApiOptions) => Promise<(Car | null)[]>
  // Fetch a resource view/function for the car.
  get: (id: CarIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: CarIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: CarIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: CarIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: CarIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: CarIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: CarIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: CarIdInput, options?: ApiOptions) => Promise<any>
  get: (id: CarIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: CarIdInput,
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
  attach: (id: CarIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: CarIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: CarIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: CarIdInput, options?: ApiOptions) => Promise<CarDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<CarDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<CarDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type CarControllerOverride = ControllerOverride<CarController>

export function createGeneratedCarController(): CarController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: CarIdInput) => crud.resolveRecordSubId<CarIdSubId>(value)

  // Create a car via the TRPC endpoint.
  const create: CarController['create'] = async (payload, options) => {
    return await $process<CarCreateInput, Car>('car.create', payload, options)
  }

  // Create multiple car records in sequence.
  const createMany: CarController['createMany'] = async (payloads, options) => {
    const results: Array<Car | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a car via the TRPC endpoint.
  const update: CarController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Car update requires a valid id')
    return await $process<{ id: CarIdSubId; payload: CarUpdateInput }, Car>(
      'car.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple car records in sequence.
  const updateMany: CarController['updateMany'] = async (items, options) => {
    const results: Array<Car | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a car via the TRPC endpoint.
  const del: CarController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Car delete requires a valid id')
    return await $process<{ id: CarIdSubId }, Car>('car.delete', { id: resolvedId }, options)
  }

  // Delete multiple car records in sequence.
  const deleteMany: CarController['deleteMany'] = async (ids, options) => {
    const results: Array<Car | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a car.
  const get: CarController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Car get requires a valid id')
    if (!resourceKey) throw new Error('Car get requires a resource key')
    return await $process('car.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: CarController['taxonomy'] = (key: string) => {
    const prefix = `car.${key}`
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

  const subtable: CarController['subtable'] = (key: string) => {
    const prefix = `car.subtables.${key}`
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

  const relation: CarController['relation'] = (key: string) => {
    const prefix = `car.relations.${key}`
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
  const typesense: CarController['typesense'] = () => {
    const prefix = `car.typesense`
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
  const refreshTypesenseFor: CarController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'car',
      id: resolvedId,
      endpoint: 'car.typesense.resource',
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
