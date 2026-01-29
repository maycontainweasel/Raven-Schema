import { describe, it, expect } from 'vitest'
import {
  buildRequiredCreatePayload,
  callDbFunction,
  ensureDbFunction,
  expectInstanceLinked,
  expectInstanceMissing,
  expectPostLinked,
  expectPostMissing,
  expectRecordExists,
  expectRecordMissing,
  getRecordSubId,
  getTestInstance,
  getTestInstanceCode,
  getTestMarker,
  logStep,
  sleep,
  selectViewRecord,
} from './helpers'

const ONLY_MODEL = process.env.SCHEMA_TEST_MODEL
const ONLY_PROCESS = process.env.SCHEMA_TEST_PROCESS
const describeModel = !ONLY_MODEL || ONLY_MODEL === 'question' ? describe : describe.skip
const itCrud = !ONLY_PROCESS || ONLY_PROCESS === 'crud' ? it : it.skip

const buildQuestionPayload = (token: string, qid: number) => {
  const marker = getTestMarker()
  const instanceKey = getTestInstanceCode()
  return {
    qid,
    question: `${marker} What is QA question ${token}?`,
    instances: [instanceKey],
    testobject: {
      testobjectnumber: 7,
      testobjectstring: `Obj ${token}`,
      testobjectdarray: [`opt-${token}`],
      testobjectobject: {
        testobjectobjectnumber: 3,
        testobjectobjectstring: `Nested ${token}`,
        testobjectobjectarray: [`nest-${token}`],
      },
    },
  }
}

describeModel('Question capability (functions)', () => {
  itCrud('Functions: CRUD round-trip + view + type checks', async () => {
    await ensureDbFunction('createQuestion')
    await ensureDbFunction('updateQuestion')
    await ensureDbFunction('deleteQuestion')
    await ensureDbFunction('viewQuestionAdmin')

    const token = Math.random().toString(36).slice(2, 8)
    const qid = Math.floor(Math.random() * 900000) + 100000
    const payload = await buildRequiredCreatePayload('question', {
      overrides: buildQuestionPayload(token, qid),
      includeRelations: false,
    })

    logStep('fn::createQuestion | payload', payload)
    const created = await callDbFunction('createQuestion', { payload })
    expect(created).toBeTruthy()
    expect(created?.id).toBeTruthy()

    const subId = getRecordSubId(created?.id)
    await expectRecordExists('q', subId)

    logStep('Post + Instance linkage | verifying edges + post record')
    const postLink = await expectPostLinked(created?.id, 'q')
    await expectInstanceLinked(created?.id, 'q', getTestInstanceCode())

    logStep('Type checks | arrays + objects')
    expect(Array.isArray(created?.instances)).toBe(true)
    expect(typeof created?.testobject).toBe('object')
    expect(Array.isArray(created?.testobject?.testobjectdarray)).toBe(true)
    expect(typeof created?.testobject?.testobjectobject).toBe('object')
    expect(Array.isArray(created?.testobject?.testobjectobject?.testobjectobjectarray)).toBe(true)

    logStep('fn::updateQuestion | updating explanation')
    await sleep(10)
    const updated = await callDbFunction('updateQuestion', {
      id: created?.id,
      payload: { explanation: `Updated ${token}` },
    })
    expect(updated?.explanation).toContain('Updated')

    logStep('Post timestamps | updatedAt should change')
    const postAfter = await expectRecordExists('p', getRecordSubId(postLink.pid))
    expect(postAfter?.updatedAt).not.toBe(postLink.postRecord?.updatedAt)

    logStep('fn::viewQuestionAdmin | Admin view')
    const adminView = await selectViewRecord('question', 'Admin', created?.id)
    expect(adminView).toBeTruthy()

    logStep('fn::deleteQuestion | deleting question')
    await callDbFunction('deleteQuestion', { id: created?.id })
    await expectRecordMissing('q', subId)
    await expectPostMissing(created?.id, 'q')
    await expectInstanceMissing(created?.id, 'q', getTestInstanceCode())
  })
})
