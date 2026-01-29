import { appendFile, mkdir } from 'fs/promises'
import { dirname, resolve } from 'path'

type ReportEntry = {
  time: string
  message: string
  data?: any
}

let reportPath = ''
const buffer: ReportEntry[] = []

export const initReport = async () => {
  if (reportPath) return reportPath
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  reportPath = resolve(process.cwd(), `test/capabilities/reports/run-${stamp}.jsonl`)
  await mkdir(dirname(reportPath), { recursive: true })
  return reportPath
}

export const writeReport = (entry: ReportEntry) => {
  buffer.push(entry)
}

export const flushReport = async () => {
  if (!reportPath || buffer.length === 0) return
  const lines = buffer.map((entry) => JSON.stringify(entry)).join('\n') + '\n'
  buffer.length = 0
  await appendFile(reportPath, lines, 'utf-8')
}

export const getReportPath = () => reportPath
