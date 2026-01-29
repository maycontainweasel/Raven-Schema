import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
import type { Post, PostID, PostIDSubId } from '@schema/types'
type PostDocument = any;
type TypesenseCollectionSchema = any;
import type { ControllerIdInput, ControllerOverride } from '../_shared'

export type PostCreateInput = Partial<Omit<Post, 'id'>>

export type PostUpdateInput = Partial<Omit<Post, 'id'>>
export type PostRecordId = NonNullable<Post['id']> | PostID
export type PostIdInput = ControllerIdInput<PostIDSubId, PostRecordId, Post>

export interface PostController {
  // Create a new post record.
  create: (payload: PostCreateInput, options?: ApiOptions) => Promise<Post | null>
  // Create multiple post records in sequence.
  createMany: (payloads: PostCreateInput[], options?: ApiOptions) => Promise<(Post | null)[]>
  // Update a post by id (record object or sub-id).
  update: (id: PostIdInput, payload: PostUpdateInput, options?: ApiOptions) => Promise<Post | null>
  // Update multiple post records in sequence.
  updateMany: (
    items: Array<{ id: PostIdInput; payload: PostUpdateInput }>,
    options?: ApiOptions
  ) => Promise<(Post | null)[]>
  // Delete a post by id (record object or sub-id).
  delete: (id: PostIdInput, options?: ApiOptions) => Promise<Post | null>
  // Delete multiple post records in sequence.
  deleteMany: (ids: PostIdInput[], options?: ApiOptions) => Promise<(Post | null)[]>
  // Fetch a resource view/function for the post.
  get: (id: PostIdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: PostIdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: PostIdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: PostIdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: PostIdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: PostIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: PostIdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: PostIdInput, options?: ApiOptions) => Promise<any>
  get: (id: PostIdInput, options?: ApiOptions) => Promise<any>
  list: (
    id: PostIdInput,
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
  attach: (id: PostIdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: PostIdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: PostIdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: PostIdInput, options?: ApiOptions) => Promise<PostDocument | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<PostDocument[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<PostDocument[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type PostControllerOverride = ControllerOverride<PostController>

export function createGeneratedPostController(): PostController {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: PostIdInput) => crud.resolveRecordSubId<PostIDSubId>(value)

  // Create a post via the TRPC endpoint.
  const create: PostController['create'] = async (payload, options) => {
    return await $process<PostCreateInput, Post>('post.create', payload, options)
  }

  // Create multiple post records in sequence.
  const createMany: PostController['createMany'] = async (payloads, options) => {
    const results: Array<Post | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a post via the TRPC endpoint.
  const update: PostController['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Post update requires a valid id')
    return await $process<{ id: PostIDSubId; payload: PostUpdateInput }, Post>(
      'post.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple post records in sequence.
  const updateMany: PostController['updateMany'] = async (items, options) => {
    const results: Array<Post | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a post via the TRPC endpoint.
  const del: PostController['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Post delete requires a valid id')
    return await $process<{ id: PostIDSubId }, Post>('post.delete', { id: resolvedId }, options)
  }

  // Delete multiple post records in sequence.
  const deleteMany: PostController['deleteMany'] = async (ids, options) => {
    const results: Array<Post | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a post.
  const get: PostController['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('Post get requires a valid id')
    if (!resourceKey) throw new Error('Post get requires a resource key')
    return await $process('post.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: PostController['taxonomy'] = (key: string) => {
    const prefix = `post.${key}`
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

  const subtable: PostController['subtable'] = (key: string) => {
    const prefix = `post.subtables.${key}`
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

  const relation: PostController['relation'] = (key: string) => {
    const prefix = `post.relations.${key}`
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
  const typesense: PostController['typesense'] = () => {
    const prefix = `post.typesense`
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
  const refreshTypesenseFor: PostController['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: 'p',
      id: resolvedId,
      endpoint: 'post.typesense.resource',
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
