import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

type ReleaseEntry = {
  id: string
  date: string
  commit: string
  source: string
  summary: string
  followUp: string
}

type ParsedArgs = {
  json: boolean
  versionOnly: boolean
  limit: number
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const schemaRoot = path.resolve(scriptDir, '..')
const releaseLogPath = path.join(schemaRoot, 'docs/ai/framework-release-log.md')

const args = parseArgs(process.argv.slice(2))
const releaseLog = fs.readFileSync(releaseLogPath, 'utf8')
const unreleasedNotes = parseUnreleasedNotes(releaseLog)
const releases = parseReleaseEntries(releaseLog)
const latestRelease = releases[0] ?? null

const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim() || 'unknown'
const head = runGit(['rev-parse', '--short', 'HEAD']).stdout.trim() || 'unknown'
const originMain = runGitOptional(['rev-parse', '--short', 'origin/main'])
const workingTreeLines = splitLines(runGit(['status', '--short']).stdout)
const aheadCount = originMain.ok ? Number.parseInt(runGit(['rev-list', '--count', 'origin/main..HEAD']).stdout.trim(), 10) || 0 : 0
const aheadCommits = originMain.ok ? splitLines(runGit(['log', '--oneline', '--no-decorate', 'origin/main..HEAD']).stdout) : []

if (args.json) {
  const payload = {
    latestRelease,
    branch,
    head,
    originMain: originMain.ok ? originMain.stdout.trim() : null,
    unreleasedNotes,
    aheadCount,
    aheadCommits,
    workingTreeFiles: workingTreeLines,
    recentReleases: releases.slice(0, args.limit),
    releaseLogPath: path.relative(schemaRoot, releaseLogPath),
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  process.exit(0)
}

if (args.versionOnly) {
  if (!latestRelease) {
    process.stdout.write(`${head}\n`)
    process.exit(0)
  }
  process.stdout.write(`${latestRelease.id} ${head}\n`)
  process.exit(0)
}

printSummary({
  latestRelease,
  branch,
  head,
  originMain: originMain.ok ? originMain.stdout.trim() : null,
  unreleasedNotes,
  aheadCount,
  aheadCommits,
  workingTreeLines,
  releases,
  limit: args.limit,
})

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    json: false,
    versionOnly: false,
    limit: 5,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') {
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--version-only') {
      parsed.versionOnly = true
      continue
    }
    if (arg === '--limit') {
      const next = argv[index + 1]
      if (!next) fail('Missing value for --limit')
      parsed.limit = normalizeLimit(next)
      index += 1
      continue
    }
    if (arg.startsWith('--limit=')) {
      parsed.limit = normalizeLimit(arg.slice('--limit='.length))
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }
    fail(`Unknown argument: ${arg}`)
  }

  return parsed
}

function normalizeLimit(raw: string): number {
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) {
    fail(`Invalid --limit value: ${raw}`)
  }
  return value
}

function parseUnreleasedNotes(markdown: string): string[] {
  const match = markdown.match(/^## Unreleased\s*$([\s\S]*?)^## /m)
  if (!match) return []
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
}

function parseReleaseEntries(markdown: string): ReleaseEntry[] {
  const entries: ReleaseEntry[] = []
  const lines = markdown.split('\n')

  for (const line of lines) {
    if (!line.startsWith('| `schema-master-')) continue
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    if (cells.length < 6) continue
    entries.push({
      id: stripCode(cells[0]),
      date: cells[1],
      commit: stripCode(cells[2]),
      source: cells[3],
      summary: cells[4],
      followUp: cells[5],
    })
  }

  return entries
}

function stripCode(value: string): string {
  return value.replace(/^`/, '').replace(/`$/, '')
}

function runGit(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync('git', ['-C', schemaRoot, ...args], { encoding: 'utf8' })
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || '').trim() || `git ${args.join(' ')} failed`
    fail(message)
  }
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 0,
  }
}

function runGitOptional(args: string[]): { ok: boolean; stdout: string } {
  const result = spawnSync('git', ['-C', schemaRoot, ...args], { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
  }
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
}

function printSummary(input: {
  latestRelease: ReleaseEntry | null
  branch: string
  head: string
  originMain: string | null
  unreleasedNotes: string[]
  aheadCount: number
  aheadCommits: string[]
  workingTreeLines: string[]
  releases: ReleaseEntry[]
  limit: number
}): void {
  const { latestRelease, branch, head, originMain, unreleasedNotes, aheadCount, aheadCommits, workingTreeLines, releases, limit } = input

  console.log('Schema Framework')
  if (latestRelease) {
    console.log(`- latest release: ${latestRelease.id}`)
    console.log(`- release commit: ${latestRelease.commit}`)
    console.log(`- release date: ${latestRelease.date}`)
  } else {
    console.log('- latest release: none recorded')
  }
  console.log(`- branch: ${branch}`)
  console.log(`- head: ${head}`)
  if (originMain) {
    console.log(`- origin/main: ${originMain}`)
  }
  console.log(`- working tree changes: ${workingTreeLines.length}`)
  console.log(`- local commits ahead of origin/main: ${aheadCount}`)
  console.log('')

  console.log('Unreleased')
  if (unreleasedNotes.length === 0) {
    console.log('- none recorded')
  } else {
    for (const note of unreleasedNotes) {
      console.log(`- ${note}`)
    }
  }
  console.log('')

  console.log('Recent Releases')
  for (const entry of releases.slice(0, limit)) {
    console.log(`- ${entry.id} | ${entry.date} | ${entry.commit} | ${entry.source}`)
  }
  console.log('')

  console.log('Local Changes')
  if (workingTreeLines.length === 0) {
    console.log('- working tree clean')
  } else {
    for (const line of workingTreeLines) {
      console.log(`- ${line}`)
    }
  }

  if (aheadCommits.length > 0) {
    console.log('')
    console.log('Local Commits Ahead Of origin/main')
    for (const line of aheadCommits) {
      console.log(`- ${line}`)
    }
  }
}

function printUsage(): void {
  console.log('Usage: node --import tsx scripts/schema-changelog.ts [--json] [--version-only] [--limit N]')
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
