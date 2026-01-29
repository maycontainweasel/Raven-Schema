import { describe, it, expect } from 'vitest'
import {
  buildRequiredCreatePayload,
  callDbFunction,
  dbQuery,
  ensureDbFunction,
  expectEdgeExists,
  expectRecordExists,
  expectRecordMissing,
  getRecordRid,
  getRecordSubId,
  getTestInstance,
  getTestInstanceCode,
  getTestMarker,
  getTestPrefix,
  logStep,
  sleep,
} from './helpers'

const ONLY_MODEL = process.env.SCHEMA_TEST_MODEL
const ONLY_PROCESS = process.env.SCHEMA_TEST_PROCESS
const describeModel = !ONLY_MODEL || ONLY_MODEL === 'subtables' ? describe : describe.skip
const itSubtables = !ONLY_PROCESS || ONLY_PROCESS === 'subtables' ? it : it.skip

const buildQuestionPayload = (token: string, qid: number) => {
  const marker = getTestMarker()
  const instanceKey = getTestInstanceCode()
  return {
    qid,
    question: `${marker} What is subtable question ${token}?`,
    instances: [instanceKey],
  }
}

const buildUserPayload = (token: string) => {
  const prefix = getTestPrefix()
  const instanceKey = getTestInstanceCode()
  return {
    email: `${prefix}${token}@example.com`,
    password: `Pass-${token}`,
    firstName: `SchemaTest ${token}`,
    surname: `User ${token}`,
    instances: [instanceKey],
  }
}

describeModel('Subtables capability (functions)', () => {
  itSubtables('Question → QuestionOption (submany) → option records (nested)', async () => {
    await ensureDbFunction('createQuestion')
    await ensureDbFunction('deleteQuestion')
    await ensureDbFunction('createQuestionOption')
    await ensureDbFunction('updateQuestionOption')
    await ensureDbFunction('deleteQuestionOption')
    await ensureDbFunction('createQuestionOptionRecord')
    await ensureDbFunction('deleteQuestionOptionRecord')
    await ensureDbFunction('createUserQuestionOptionRecord')
    await ensureDbFunction('deleteUserQuestionOptionRecord')
    await ensureDbFunction('createUser')
    await ensureDbFunction('deleteUser')

    const token = Math.random().toString(36).slice(2, 8)
    const qid = Math.floor(Math.random() * 900000) + 100000

    const questionPayload = await buildRequiredCreatePayload('question', {
      overrides: buildQuestionPayload(token, qid),
      includeRelations: false,
    })

    logStep('Create Question', questionPayload)
    const question = await callDbFunction('createQuestion', { payload: questionPayload })
    expect(question?.id).toBeTruthy()

    const questionRid = await getRecordRid(question?.id, 'q')

    const optionPayloadA = {
      label: `Option A ${token}`,
      correct: true,
      order: 1,
    }

    logStep('Create QuestionOption A', optionPayloadA)
    const optionA = await callDbFunction('createQuestionOption', {
      PARENT_ID: questionRid,
      payload: optionPayloadA,
    })
    expect(optionA?.id).toBeTruthy()

    const optionARid = await getRecordRid(optionA?.id, 'qOption')
    await expectRecordExists('qOption', getRecordSubId(optionA?.id))
    await expectEdgeExists('QuestionOption', questionRid, optionARid)

    const optionPayloadB = {
      label: `Option B ${token}`,
      correct: false,
      order: 2,
    }

    logStep('Create QuestionOption B', optionPayloadB)
    const optionB = await callDbFunction('createQuestionOption', {
      PARENT_ID: questionRid,
      payload: optionPayloadB,
    })
    const optionBRid = await getRecordRid(optionB?.id, 'qOption')

    logStep('List QuestionOption (submany) via edge')
    const listRes = await dbQuery(
      'RETURN SELECT * FROM qOption WHERE <-(QuestionOption WHERE in = $RID);',
      { RID: questionRid }
    )
    const list = Array.isArray(listRes?.[0]?.result) ? listRes[0].result : []
    expect(list.length).toBeGreaterThanOrEqual(2)

    logStep('Update QuestionOption A')
    await sleep(10)
    const optionAUpdated = await callDbFunction('updateQuestionOption', {
      id: optionARid,
      payload: { correct: false },
    })
    expect(optionAUpdated?.correct).toBe(false)

    logStep('Create QuestionOptionRecord (subsingle under option)')
    const optionRecordPayload = {
      q: questionRid,
      qOption: optionARid,
    }
    const optionRecord = await callDbFunction('createQuestionOptionRecord', {
      PARENT_ID: optionARid,
      payload: optionRecordPayload,
    })
    expect(optionRecord?.id).toBeTruthy()
    await expectRecordExists('qor', getRecordSubId(optionRecord?.id))

    logStep('Create User + UserQuestionOptionRecord (nested submany)')
    const userPayload = await buildRequiredCreatePayload('user', {
      overrides: buildUserPayload(token),
      includeRelations: false,
    })
    const user = await callDbFunction('createUser', { payload: userPayload })
    const userRid = await getRecordRid(user?.id, 'u')

    const uqorPayload = {
      u: userRid,
      qOption: optionARid,
      attempts: 1,
      correct: 1,
    }
    const uqor = await callDbFunction('createUserQuestionOptionRecord', {
      PARENT_ID: optionARid,
      payload: uqorPayload,
    })
    expect(uqor?.id).toBeTruthy()
    await expectRecordExists('uqor', getRecordSubId(uqor?.id))

    logStep('List UserQuestionOptionRecord via edge')
    const uqorListRes = await dbQuery(
      'RETURN SELECT * FROM uqor WHERE <-(UserQuestionOptionRecord WHERE in = $RID);',
      { RID: optionARid }
    )
    const uqorList = Array.isArray(uqorListRes?.[0]?.result) ? uqorListRes[0].result : []
    expect(uqorList.length).toBeGreaterThanOrEqual(1)

    logStep('Cleanup | delete uqor, option records, options, question, user')
    await callDbFunction('deleteUserQuestionOptionRecord', { id: uqor?.id })
    await callDbFunction('deleteQuestionOptionRecord', { id: optionRecord?.id })
    await callDbFunction('deleteQuestionOption', { id: optionARid })
    await callDbFunction('deleteQuestionOption', { id: optionBRid })
    await callDbFunction('deleteQuestion', { id: question?.id })
    await callDbFunction('deleteUser', { id: user?.id })

    await expectRecordMissing('q', getRecordSubId(question?.id))
  })
})
