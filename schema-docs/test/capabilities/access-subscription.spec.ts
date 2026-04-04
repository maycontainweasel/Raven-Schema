import { describe, expect, it } from 'vitest'
import {
  buildRequiredCreatePayload,
  callDbFunction,
  callDbFunctionResult,
  dbQuery,
  ensureDbFunction,
  expectEdgeExists,
  expectEdgeMissing,
  getRecordSubId,
  getTestInstanceCode,
  getTestPrefix,
  logStep,
  unwrapResult,
} from './helpers'

const ONLY_MODEL = process.env.SCHEMA_TEST_MODEL
const describeModel = !ONLY_MODEL || ONLY_MODEL === 'access' ? describe : describe.skip

const DAY_MS = 24 * 60 * 60 * 1000

const buildUserPayload = (token: string) => {
  const prefix = getTestPrefix()
  const instanceKey = getTestInstanceCode()
  return {
    email: `${prefix}${token}@example.com`,
    password: `Pass-${token}`,
    firstName: `Access ${token}`,
    surname: `Tester ${token}`,
    instances: [instanceKey],
  }
}

const buildExamPayload = (token: string) => {
  const prefix = getTestPrefix().replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'schema-test-'
  const instanceKey = getTestInstanceCode()
  const qidIndexBase = Number(String(Date.now()).slice(-7))

  return {
    key: `${prefix}exam-${token}`.slice(0, 60),
    title: `Access Exam ${token}`,
    titleShort: `Access ${token}`,
    description: `Exam used for access lifecycle test ${token}`,
    qidIndex: qidIndexBase,
    instances: [instanceKey],
  }
}

const toMs = (value: any) => {
  if (!value) return NaN
  if (value instanceof Date) return value.getTime()
  return new Date(String(value)).getTime()
}

const getExistingUserRole = async () => {
  const result = unwrapResult(await dbQuery('RETURN SELECT VALUE id FROM t_u_role LIMIT 1;'))
  return Array.isArray(result) ? result[0] ?? null : result
}

describeModel('Access/subscription capability (functions)', () => {
  it('Functions: grant, update, extend, reduce, revoke, and read active exam access', async () => {
    await ensureDbFunction('createUser')
    await ensureDbFunction('deleteUser')
    await ensureDbFunction('createExam')
    await ensureDbFunction('deleteExam')
    await ensureDbFunction('ensureUserAccess')
    await ensureDbFunction('createExamAccess')
    await ensureDbFunction('updateExamAccess')
    await ensureDbFunction('extendExamAccess')
    await ensureDbFunction('reduceExamAccess')
    await ensureDbFunction('revokeExamAccess')
    await ensureDbFunction('userAccessibleExamIDs')
    await ensureDbFunction('userAccessibleSubscriptions')
    await ensureDbFunction('UserHasValidSubscriptionForExam')
    await ensureDbFunction('initUserResourcePublic')

    const token = Math.random().toString(36).slice(2, 8)
    const roleId = await getExistingUserRole()
    if (!roleId) {
      throw new Error('Access capability test requires an existing t_u_role record')
    }

    let user: any = null
    let exam: any = null

    try {
      const userPayload = await buildRequiredCreatePayload('user', {
        overrides: { ...buildUserPayload(token), role: roleId },
        includeRelations: false,
      })
      const examPayload = buildExamPayload(token)

      logStep('fn::createUser | payload', userPayload)
      user = await callDbFunction('createUser', { payload: userPayload })
      expect(user?.id).toBeTruthy()

      logStep('fn::createExam | payload', examPayload)
      exam = await callDbFunction('createExam', { payload: examPayload })
      expect(exam?.id).toBeTruthy()

      const accessRecord = await callDbFunction('ensureUserAccess', { UID: user.id })
      const accessId = accessRecord?.id || `uAccess:${getRecordSubId(user.id)}`
      expect(accessRecord?.access).toBe('none')

      const emptyExamIds = await callDbFunctionResult<any[]>('userAccessibleExamIDs', { UID: user.id })
      expect(Array.isArray(emptyExamIds)).toBe(true)
      expect(emptyExamIds).toHaveLength(0)

      const emptySubscriptions = await callDbFunctionResult<any[]>('userAccessibleSubscriptions', { UID: user.id })
      expect(Array.isArray(emptySubscriptions)).toBe(true)
      expect(emptySubscriptions).toHaveLength(0)

      const resourceBefore = await callDbFunction('initUserResourcePublic', { UID: user.id })
      expect(resourceBefore?.access?.access).toBe('none')
      expect(Array.isArray(resourceBefore?.access?.subscriptions)).toBe(true)
      expect(resourceBefore?.access?.subscriptions).toHaveLength(0)

      const startDate = new Date(Date.now() - (5 * 60 * 1000))
      const endDate = new Date(Date.now() + (30 * DAY_MS))
      const grantPayload = {
        UID: user.id,
        EXAM_ID: exam.id,
        START_DATE: startDate,
        END_DATE: endDate,
        SOURCE: 'manual',
        instances: [getTestInstanceCode()],
        METADATA: {
          managedBy: 'schema-capability-test',
          reason: 'grant baseline access',
        },
      }

      logStep('fn::createExamAccess | payload', grantPayload)
      const granted = await callDbFunction('createExamAccess', { R: grantPayload })
      const expectedSubId = await callDbFunction('userSubscriptionID', {
        UID: user.id,
        EXAM_ID: exam.id,
      })

      expect(getRecordSubId(granted?.id)).toBe(getRecordSubId(expectedSubId))
      expect(granted?.state).toBe('active')
      expect(toMs(granted?.expiry_datetime)).toBe(toMs(endDate))

      await expectEdgeExists('Subscriptions', accessId, expectedSubId)

      const canAccessGranted = await callDbFunction('UserHasValidSubscriptionForExam', {
        UID: user.id,
        EXAM_ID: exam.id,
      })
      expect(canAccessGranted).toBe(true)

      const accessibleExamIdsAfterGrant = await callDbFunctionResult<any[]>('userAccessibleExamIDs', { UID: user.id })
      expect(accessibleExamIdsAfterGrant.map(getRecordSubId)).toEqual([getRecordSubId(exam.id)])

      const accessibleSubscriptionsAfterGrant = await callDbFunctionResult<any[]>('userAccessibleSubscriptions', { UID: user.id })
      expect(accessibleSubscriptionsAfterGrant).toHaveLength(1)
      expect(getRecordSubId(accessibleSubscriptionsAfterGrant[0]?.id)).toBe(getRecordSubId(expectedSubId))
      expect(getRecordSubId(accessibleSubscriptionsAfterGrant[0]?.exam?.id || accessibleSubscriptionsAfterGrant[0]?.exam)).toBe(getRecordSubId(exam.id))

      const resourceAfterGrant = await callDbFunction('initUserResourcePublic', { UID: user.id })
      expect(resourceAfterGrant?.access?.access).toBe('subscription')
      expect(resourceAfterGrant?.access?.subscriptions).toHaveLength(1)
      expect(getRecordSubId(resourceAfterGrant?.access?.subscriptions?.[0]?.id)).toBe(getRecordSubId(expectedSubId))

      const updatedEndDate = new Date(endDate.getTime() + (10 * DAY_MS))
      const updated = await callDbFunction('updateExamAccess', {
        R: {
          UID: user.id,
          EXAM_ID: exam.id,
          START_DATE: startDate,
          END_DATE: updatedEndDate,
          SOURCE: 'manual-update',
          METADATA: { reason: 'update entitlement window' },
        },
      })

      expect(getRecordSubId(updated?.id)).toBe(getRecordSubId(expectedSubId))
      expect(toMs(updated?.expiry_datetime)).toBe(toMs(updatedEndDate))
      expect(updated?.state).toBe('active')

      const extended = await callDbFunction('extendExamAccess', {
        R: {
          UID: user.id,
          EXAM_ID: exam.id,
          DAYS: 7,
          SOURCE: 'extension',
          METADATA: { reason: 'extend by seven days' },
        },
      })

      const expectedExtendedEndMs = updatedEndDate.getTime() + (7 * DAY_MS)
      expect(getRecordSubId(extended?.id)).toBe(getRecordSubId(expectedSubId))
      expect(toMs(extended?.expiry_datetime)).toBe(expectedExtendedEndMs)
      expect(extended?.state).toBe('active')

      const reduced = await callDbFunction('reduceExamAccess', {
        R: {
          UID: user.id,
          EXAM_ID: exam.id,
          DAYS: 5,
          SOURCE: 'reduction',
          METADATA: { reason: 'reduce by five days' },
        },
      })

      const expectedReducedEndMs = expectedExtendedEndMs - (5 * DAY_MS)
      expect(getRecordSubId(reduced?.id)).toBe(getRecordSubId(expectedSubId))
      expect(toMs(reduced?.expiry_datetime)).toBe(expectedReducedEndMs)

      const accessibleSubscriptionsBeforeRevoke = await callDbFunctionResult<any[]>('userAccessibleSubscriptions', { UID: user.id })
      expect(accessibleSubscriptionsBeforeRevoke).toHaveLength(1)
      expect(getRecordSubId(accessibleSubscriptionsBeforeRevoke[0]?.id)).toBe(getRecordSubId(expectedSubId))

      const revoked = await callDbFunction('revokeExamAccess', {
        R: {
          UID: user.id,
          EXAM_ID: exam.id,
          SOURCE: 'manual',
          METADATA: { reason: 'revoke for lifecycle test' },
        },
      })

      expect(getRecordSubId(revoked?.id)).toBe(getRecordSubId(expectedSubId))
      expect(revoked?.state).toBe('revoked')

      await expectEdgeMissing('Subscriptions', accessId, expectedSubId)

      const canAccessRevoked = await callDbFunction('UserHasValidSubscriptionForExam', {
        UID: user.id,
        EXAM_ID: exam.id,
      })
      expect(canAccessRevoked).toBe(false)

      const accessibleExamIdsAfterRevoke = await callDbFunctionResult<any[]>('userAccessibleExamIDs', { UID: user.id })
      expect(accessibleExamIdsAfterRevoke).toHaveLength(0)

      const accessibleSubscriptionsAfterRevoke = await callDbFunctionResult<any[]>('userAccessibleSubscriptions', { UID: user.id })
      expect(accessibleSubscriptionsAfterRevoke).toHaveLength(0)

      const resourceAfterRevoke = await callDbFunction('initUserResourcePublic', { UID: user.id })
      expect(resourceAfterRevoke?.access?.access).toBe('none')
      expect(Array.isArray(resourceAfterRevoke?.access?.subscriptions)).toBe(true)
      expect(resourceAfterRevoke?.access?.subscriptions).toHaveLength(0)
    } finally {
      if (exam?.id) {
        try {
          await callDbFunction('deleteExam', { ExamID: exam.id })
        } catch (error) {
          logStep('deleteExam cleanup failed', { error: String((error as Error)?.message || error) })
        }
      }
      if (user?.id) {
        try {
          await callDbFunction('deleteUser', { UserID: user.id })
        } catch (error) {
          logStep('deleteUser cleanup failed', { error: String((error as Error)?.message || error) })
        }
      }
    }
  })
})
