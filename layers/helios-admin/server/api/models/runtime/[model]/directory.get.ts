import { createError, defineEventHandler, getQuery } from 'h3'
import {
  findModelManagerModel,
  listModelManagerModels,
  readModelSpec,
} from '../../../../utils/model-manager'
import { readModelDirectoryRecords } from '../../../../utils/model-runtime-manager'

const parseOptionalNumber = (value: unknown, fallback: number) => {
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

export default defineEventHandler(async (event) => {
  const modelParam = String(event.context.params?.model ?? '').trim()
  if (!modelParam) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Model is required.',
    })
  }

  const models = await listModelManagerModels()
  const model = findModelManagerModel(models, modelParam)
  if (!model) {
    throw createError({
      statusCode: 404,
      statusMessage: `Unknown model "${modelParam}".`,
    })
  }

  const specState = await readModelSpec(model)
  const query = getQuery(event)
  const limit = parseOptionalNumber(query.limit, 250)
  const start = parseOptionalNumber(query.start, 0)
  const search = String(query.search ?? '').trim()
  const filterBy = String(query.filterBy ?? '').trim()
  const sortBy = String(query.sortBy ?? '').trim()

  try {
    const directory = await readModelDirectoryRecords(event, model, specState.spec, {
      limit,
      start,
      query: search,
      filterBy: filterBy || undefined,
      sortBy: sortBy || undefined,
    })
    return {
      ok: true,
      model,
      source: specState.source,
      spec: {
        route: specState.spec.directory.route,
        slugPolicy: specState.spec.directory.slugPolicy,
        typesenseEnabled: specState.spec.directory.typesense.enabled,
      },
      records: directory.records,
      count: directory.count,
      runtime: {
        source: directory.source,
        collection: directory.collection,
        queryBy: directory.queryBy,
      },
      limit,
      start,
    }
  }
  catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message ?? 'Failed to read model directory records.',
    })
  }
})
