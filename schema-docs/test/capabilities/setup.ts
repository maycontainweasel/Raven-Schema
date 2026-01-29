import { beforeAll, afterAll, afterEach } from 'vitest'
import { defaultDbInstance } from './runtime'
import { initTestRuntime, closeTestRuntime, logStep, getTestInstance, cleanupTestArtifacts, ensureTaxonomies } from './helpers'
import { initReport, flushReport, getReportPath } from './report'

beforeAll(async () => {
  process.env.SCHEMA_TEST_LAYER ||= 'functions'
  if (!process.env.SCHEMA_TEST_INSTANCE && defaultDbInstance) {
    process.env.SCHEMA_TEST_INSTANCE = defaultDbInstance as string
  }
  await initReport()
  logStep(`Schema capability tests starting (instance: ${getTestInstance()}, layer: ${process.env.SCHEMA_TEST_LAYER})`)
  await initTestRuntime()
  await ensureTaxonomies()
  await cleanupTestArtifacts()
})

afterEach(async () => {
  await flushReport()
})

afterAll(async () => {
  await closeTestRuntime()
  await flushReport()
  const report = getReportPath()
  if (report) {
    console.log(`Report saved: ${report}`)
  }
})
