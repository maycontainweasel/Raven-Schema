import { describe, it, expect } from 'vitest'
import {
  buildRequiredCreatePayload,
  callDbFunction,
  dbQuery,
  ensureDbFunction,
  expectInstanceLinked,
  expectInstanceMissing,
  expectPostLinked,
  expectPostMissing,
  expectRecordExists,
  expectRecordMissing,
  ensureUserRoleTerm,
  getRecordSubId,
  getTestInstance,
  getTestInstanceCode,
  getTestPrefix,
  logStep,
  sleep,
  selectViewRecord,
  unwrapResult,
} from './helpers'

const ONLY_MODEL = process.env.SCHEMA_TEST_MODEL
const ONLY_PROCESS = process.env.SCHEMA_TEST_PROCESS
const describeModel = !ONLY_MODEL || ONLY_MODEL === 'user' ? describe : describe.skip
const itCrud = !ONLY_PROCESS || ONLY_PROCESS === 'crud' ? it : it.skip

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

describeModel('User capability (functions)', () => {
  itCrud('Functions: CRUD round-trip + view + type checks', async () => {
    await ensureDbFunction('createUser')
    await ensureDbFunction('updateUser')
    await ensureDbFunction('deleteUser')

    const token = Math.random().toString(36).slice(2, 8)
    const roleKey = `qa-${token}`
    const roleReady = await ensureUserRoleTerm(roleKey, `QA ${token}`)
    if (!roleReady) {
      logStep('Skipping user CRUD test; role taxonomy unavailable')
      return
    }

    const payload = await buildRequiredCreatePayload('user', {
      overrides: { ...buildUserPayload(token), role: roleKey },
      includeRelations: false,
    })

    logStep('fn::createUser | payload', payload)
    const created = await callDbFunction('createUser', { payload })
    expect(created).toBeTruthy()
    expect(created?.id).toBeTruthy()

    const subId = getRecordSubId(created?.id)
    await expectRecordExists('u', subId)

    logStep('Post + Instance linkage | verifying edges + post record')
    const postLink = await expectPostLinked(created?.id, 'u')
    await expectInstanceLinked(created?.id, 'u', getTestInstanceCode())

    logStep('fn::updateUser | updating surname')
    await sleep(10)
    const updated = await callDbFunction('updateUser', { id: created?.id, payload: { surname: `Updated ${token}` } })
    expect(updated?.surname).toContain('Updated')

    logStep('Post timestamps | updatedAt should change')
    const postAfter = await expectRecordExists('p', getRecordSubId(postLink.pid))
    expect(postAfter?.updatedAt).not.toBe(postLink.postRecord?.updatedAt)

    logStep('fn::view(User Admin) | fetching Admin view')
    const adminView = await selectViewRecord('user', 'Admin', created?.id)
    expect(adminView).toBeTruthy()

    logStep('Type checks | uniqueId + password + instances')
    const md5Res = await dbQuery('RETURN crypto::md5($email);', { email: payload.email })
    const expectedMd5 = unwrapResult(md5Res)
    expect(created?.uniqueId).toBe(expectedMd5)
    expect(created?.password).not.toBe(payload.password)
    expect(Array.isArray(created?.instances)).toBe(true)
    expect(created?.instances).toContain(getTestInstanceCode())

    logStep('fn::deleteUser | deleting user')
    await callDbFunction('deleteUser', { id: created?.id })
    await expectRecordMissing('u', subId)
    await expectPostMissing(created?.id, 'u')
    await expectInstanceMissing(created?.id, 'u', getTestInstanceCode())
  })
})
