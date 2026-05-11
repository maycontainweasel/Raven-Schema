import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Category, CategoryId, CategoryIdSubId } from '@schema/types'
type CategoryDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type CategoryCreateInput = Pick<Category, 'space' | 'key' | 'name' | 'categoryKind' | 'active'> & Partial<Omit<Category, 'id'>>

export type CategoryUpdateInput = Partial<Omit<Category, 'id'>>
export type CategoryRecordId = NonNullable<Category['id']> | CategoryId
export type CategoryIdInput = ControllerIdInput<CategoryIdSubId, CategoryRecordId, Category>

export interface CategoryController {
  // Create a new category record.
  create: (payload: CategoryCreateInput, options?: ApiOptions) => Promise<Category | null>
  // Create multiple category records in sequence.
  createMany: (payloads: CategoryCreateInput[], options?: ApiOptions) => Promise<(Category | null)[]>
  // Update a category by id (record object or sub-id).
  update: (id: CategoryIdInput, payload: CategoryUpdateInput, options?: ApiOptions) => Promise<Category | null>
  // Update multiple category records in sequence.
  updateMany: (
    items: Array<{ id: CategoryIdInput; payload: CategoryUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Category | null)[]>
  // Delete a category by id (record object or sub-id).
  delete: (id: CategoryIdInput, options?: ApiOptions) => Promise<Category | null>
  // Delete multiple category records in sequence.
  deleteMany: (ids: CategoryIdInput[], options?: ApiOptions) => Promise<(Category | null)[]>
  // Fetch a resource view/function for the category.
  get: (id: CategoryIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: CategoryIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: CategoryIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: CategoryIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: CategoryIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: CategoryIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: CategoryIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: CategoryIdInput, options?: ApiOptions) => Promise<any>
  get: (id: CategoryIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: CategoryIdInput,
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
  attach: (id: CategoryIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: CategoryIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: CategoryIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: CategoryIdInput, options?: ApiOptions) => Promise<CategoryDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<CategoryDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<CategoryDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type CategoryControllerOverride = ControllerOverride<CategoryController>

export function createGeneratedCategoryController(): CategoryController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: CategoryIdInput) => crud.resolveRecordSubId<CategoryIdSubId>(value)

  // Create a category via the TRPC endpoint.
  const create: CategoryController['create'] = async (payload, options) => {
    return await $process<CategoryCreateInput, Category>('category.create', payload, options)
  }

  // Create multiple category records in sequence.
  const createMany: CategoryController['createMany'] = async (payloads, options) => {
    const results: Array<Category | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a category via the TRPC endpoint.
  const update: CategoryController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Category update requires a valid id')
    return await $process<{ id: CategoryIdSubId; payload: CategoryUpdateInput }, Category>(
      'category.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple category records in sequence.
  const updateMany: CategoryController['updateMany'] = async (items, options) => {
    const results: Array<Category | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a category via the TRPC endpoint.
  const del: CategoryController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Category delete requires a valid id')
    return await $process<{ id: CategoryIdSubId }, Category>('category.delete', { id: resolvedId }, options)
  }

  // Delete multiple category records in sequence.
  const deleteMany: CategoryController['deleteMany'] = async (ids, options) => {
    const results: Array<Category | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a category.
  const get: CategoryController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Category get requires a valid id')
    if (!resourceKey) throw new Error('Category get requires a resource key')
    return await $process('category.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: CategoryController['taxonomy'] = (key: string) => {
    const prefix = `category.${key}`
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

  const subtable: CategoryController['subtable'] = (key: string) => {
    const prefix = `category.subtables.${key}`
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

  const relation: CategoryController['relation'] = (key: string) => {
    const prefix = `category.relations.${key}`
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
  const typesense: CategoryController['typesense'] = () => {
    const prefix = `category.typesense`
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
  const refreshTypesenseFor: CategoryController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'category',
      id: resolvedId,
      endpoint: 'category.typesense.resource',
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
