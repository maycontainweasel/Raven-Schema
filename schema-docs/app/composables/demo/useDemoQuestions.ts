import type { Question } from '@schema/types'
import type { QuestionDocument } from '@schema/typesense/collections'
import { models } from '@schema/models'

const questionModel = models.question

type InstanceCode = string

type QuestionCreatePayload = Partial<Question> & {
  qid: number
  question: string
  exams: string[]
  instances?: InstanceCode[]
}

type QuestionUpdatePayload = Partial<Question> & {
  exams?: string[]
}

type TypesenseSearchResult = {
  hits: QuestionDocument[]
  found: number
  facetCounts: any[]
}

const resolveArray = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

const normalizeResult = <T>(input: any): T | null => {
  if (Array.isArray(input)) {
    return (input[0] as T) ?? null
  }
  return (input as T) ?? null
}

export const useDemoQuestions = () => {
  const { $api } = useNuxtApp()
  const { processRecordForInstances, updateTypesenseForRecord, deleteTypesenseDocument, resolveRecordSubId } = useCRUD()
  const typesense = useTypesense()
  const typesenseSearch = useTypesenseSearch()

  const isRemote = questionModel?.data === 'remote'

  const searchQuestions = async (params: {
    query: string
    page?: number
    perPage?: number
    instanceFilter?: string | null
  }): Promise<TypesenseSearchResult> => {
    const queryBy = ['question', 'explanation', 'optionsString']
    const perPage = params.perPage ?? 50
    const page = params.page ?? 1

    const searchParams: Record<string, any> = {
      q: params.query || '*',
      query_by: queryBy.join(','),
      per_page: perPage,
      page,
      sort_by: 'qid:desc',
    }

    if (params.instanceFilter && params.instanceFilter !== 'all') {
      searchParams.filter_by = `instances:=[\"${params.instanceFilter}\"]`
    }

    const response = await typesenseSearch.searchCollection('question', searchParams)
    const hits = Array.isArray(response?.hits)
      ? response.hits.map((hit: any) => hit.document)
      : []

    return {
      hits,
      found: response?.found ?? hits.length,
      facetCounts: response?.facet_counts ?? [],
    }
  }

  const refreshQuestions = async (options: {
    instance?: InstanceCode
    limit?: number
    start?: number
    clear?: boolean
  }) => {
    const limit = typeof options.limit === 'number' ? options.limit : 50
    const start = typeof options.start === 'number' ? options.start : 0

    if (options.clear) {
      await typesense.clearCollection('question')
    } else {
      await typesense.ensureCollection('question')
    }

    const result = await $api.question.typesense.list.query({
      data: {
        limit,
        start,
      },
      instance: options.instance,
    })

    const records = Array.isArray(result) ? result : []
    if (records.length) {
      await typesense.upsertDocuments('question', records, 'upsert')
    }

    return records
  }

  const getQuestion = async (id: string, instance?: InstanceCode) => {
    const result = await $api.question.resource.query({
      data: { id, key: 'Admin' },
      instance,
    })
    return normalizeResult<QuestionDocument>(result)
  }

  const createQuestion = async (payload: QuestionCreatePayload, instances: InstanceCode[]) => {
    const result = await processRecordForInstances({
      endpoint: 'question.create',
      method: 'mutate',
      data: {
        ...payload,
        instances: payload.instances ?? instances,
        exams: resolveArray(payload.exams),
      },
      instances,
      options: {
        bypassMothership: isRemote,
        toast: { action: 'Create', subject: 'Question', perInstance: true },
      },
    })

    if (result.record) {
      await updateTypesenseForRecord({
        collectionId: 'question',
        record: result.record,
        instances,
        bypassMothership: isRemote,
      })
    }

    return result
  }

  const updateQuestion = async (id: string, payload: QuestionUpdatePayload, instances: InstanceCode[]) => {
    const result = await processRecordForInstances({
      endpoint: 'question.update',
      method: 'mutate',
      data: {
        id: resolveRecordSubId(id) ?? id,
        payload: {
          ...payload,
          exams: payload.exams ? resolveArray(payload.exams) : undefined,
        },
      },
      instances,
      options: {
        bypassMothership: isRemote,
        toast: { action: 'Update', subject: 'Question', perInstance: true },
      },
    })

    if (result.record) {
      await updateTypesenseForRecord({
        collectionId: 'question',
        record: result.record,
        instances,
        bypassMothership: isRemote,
      })
    }

    return result
  }

  const deleteQuestion = async (id: string, instances: InstanceCode[]) => {
    const resolvedId = resolveRecordSubId(id) ?? id
    await processRecordForInstances({
      endpoint: 'question.delete',
      method: 'mutate',
      data: { id: resolvedId },
      instances,
      options: {
        bypassMothership: isRemote,
        toast: { action: 'Delete', subject: 'Question', perInstance: true },
      },
    })

    await deleteTypesenseDocument('question', resolvedId)
  }

  return {
    searchQuestions,
    refreshQuestions,
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    isRemote,
  }
}
