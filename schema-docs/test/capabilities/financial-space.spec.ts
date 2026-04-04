import { describe, it, expect } from 'vitest'
import {
  callDbFunction,
  ensureDbFunction,
  expectEdgeExists,
  expectEdgeMissing,
  expectRecordExists,
  expectRecordMissing,
  getRecordRid,
  getRecordSubId,
  logStep,
  selectViewRecord,
  sleep,
} from './helpers'

const ONLY_MODEL = process.env.SCHEMA_TEST_MODEL
const ONLY_PROCESS = process.env.SCHEMA_TEST_PROCESS
const describeModel = !ONLY_MODEL || ONLY_MODEL === 'financialSpace' ? describe : describe.skip
const itCrud = !ONLY_PROCESS || ONLY_PROCESS === 'crud' ? it : it.skip

const makeToken = () => Math.random().toString(36).slice(2, 8)

const buildSpacePayload = (token: string) => ({
  key: `raven-${token}`,
  name: `Raven Business ${token}`,
  spaceType: 'business' as const,
  currency: 'ZAR',
  description: `Raven truth layer test space ${token}`,
  active: true,
})

const buildAccountPayload = (token: string, spaceKeyOrRid: any) => ({
  space: spaceKeyOrRid,
  key: `main-${token}`,
  name: `MPIRE Current ${token}`,
  bankName: 'MPIRE Bank',
  accountType: 'current' as const,
  currency: 'ZAR',
  accountNumberLast4: '1234',
  openingBalance: 0,
  active: true,
  notes: `Raven truth layer test account ${token}`,
})

const stripBackticks = (value: any) => {
  if (typeof value === 'string') return value.replace(/`/g, '')
  if (value && typeof value === 'object' && typeof value.id === 'string') {
    return { ...value, id: value.id.replace(/`/g, '') }
  }
  return value
}

const ridToken = (value: any) => String(getRecordSubId(value)).replace(/`/g, '')

const cleanupTruthLayer = async (spaceId: any, accountId: any) => {
  if (accountId) {
    try {
      await callDbFunction('deleteAccount', { AccountID: stripBackticks(accountId) })
    } catch {
      // best effort cleanup
    }
  }

  if (spaceId) {
    try {
      await callDbFunction('deleteFinancialSpace', { FinancialSpaceID: stripBackticks(spaceId) })
    } catch {
      // best effort cleanup
    }
  }
}

describeModel('Raven truth layer (functions)', () => {
  itCrud('rejects incomplete inputs before creating records', async () => {
    await ensureDbFunction('createFinancialSpace')
    await ensureDbFunction('createAccount')

    const token = makeToken()

    await expect(
      callDbFunction('createFinancialSpace', {
        payload: {
          key: `raven-${token}`,
          spaceType: 'business',
          currency: 'ZAR',
          active: true,
        },
      })
    ).rejects.toThrow(/requires name/)

    await expect(
      callDbFunction('createAccount', {
        payload: {
          key: `main-${token}`,
          name: `MPIRE Current ${token}`,
          bankName: 'MPIRE Bank',
          accountType: 'current',
          currency: 'ZAR',
          active: true,
        },
      })
    ).rejects.toThrow(/requires space/)
  })

  itCrud('creates a financial space, links an account, and cleans up again', async () => {
    await ensureDbFunction('createFinancialSpace')
    await ensureDbFunction('updateFinancialSpace')
    await ensureDbFunction('deleteFinancialSpace')
    await ensureDbFunction('createAccount')
    await ensureDbFunction('updateAccount')
    await ensureDbFunction('deleteAccount')
    await ensureDbFunction('createEdge')

    const token = makeToken()
    const spacePayload = buildSpacePayload(token)

    logStep('fn::createFinancialSpace | payload', spacePayload)
    const createdSpace = await callDbFunction('createFinancialSpace', { payload: spacePayload })
    expect(createdSpace?.id).toBeTruthy()
    expect(createdSpace?.key).toBe(spacePayload.key)
    expect(createdSpace?.spaceType).toBe('business')
    expect(createdSpace?.currency).toBe('ZAR')
    expect(createdSpace?.active).toBe(true)

    const spaceRid = await getRecordRid(stripBackticks(createdSpace?.id), 'financialSpace')
    const spaceSubId = ridToken(createdSpace?.id)

    await expectRecordExists('financialSpace', spaceSubId)
    const spaceView = await selectViewRecord('financialSpace', 'Admin', createdSpace?.id)
    expect(spaceView).toBeTruthy()

    await sleep(10)
    const updatedSpace = await callDbFunction('updateFinancialSpace', {
      FinancialSpaceID: createdSpace?.id,
      payload: {
        description: `Updated ${token}`,
      },
    })
    expect(updatedSpace?.description).toContain(`Updated ${token}`)

    const accountPayload = buildAccountPayload(token, createdSpace?.key)
    logStep('fn::createAccount | payload', accountPayload)
    const createdAccount = await callDbFunction('createAccount', { payload: accountPayload })
    expect(createdAccount?.id).toBeTruthy()
    expect(createdAccount?.key).toBe(accountPayload.key)
    expect(createdAccount?.name).toContain(token)
    expect(createdAccount?.accountType).toBe('current')
    expect(createdAccount?.currency).toBe('ZAR')
    expect(createdAccount?.active).toBe(true)

    const accountRid = await getRecordRid(stripBackticks(createdAccount?.id), 'account')
    const accountSubId = ridToken(createdAccount?.id)

    await expectRecordExists('account', accountSubId)
    expect(ridToken(createdAccount?.space)).toBe(spaceSubId)
    const accountView = await selectViewRecord('account', 'Admin', createdAccount?.id)
    expect(accountView).toBeTruthy()

    logStep('fn::createEdge | FinancialSpaceAccounts relation')
    const relation = await callDbFunction('createEdge', {
      in: spaceRid,
      edgeTable: 'FinancialSpaceAccounts',
      out: accountRid,
      options: {
        boundId: true,
        overwrite: false,
        skipExists: false,
        data: {
          source: 'schema-docs capability test',
          kind: 'environment-account-link',
        },
      },
    })
    expect(relation).toBeTruthy()

    const edge = await expectEdgeExists('FinancialSpaceAccounts', spaceRid, accountRid)
    expect(edge?.id).toBeTruthy()

    await sleep(10)
    const updatedAccount = await callDbFunction('updateAccount', {
      AccountID: createdAccount?.id,
      payload: {
        notes: `Updated ${token}`,
      },
    })
    expect(updatedAccount?.notes).toContain(`Updated ${token}`)

    logStep('Cleanup | delete account then environment')
    await cleanupTruthLayer(createdSpace?.id, createdAccount?.id)

    await expectEdgeMissing('FinancialSpaceAccounts', spaceRid, accountRid)
    await expectRecordMissing('account', accountSubId)
    await expectRecordMissing('financialSpace', spaceSubId)
  })
})
