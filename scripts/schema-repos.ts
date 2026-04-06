import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

type RemoteConfig = {
  name: string
  url: string
  branch: string
}

type RepoStatus = {
  expected_release_id?: string
  last_verified_at?: string
  last_verified_by?: string
  local_main_commit?: string
  remote_main_commit?: string
  local_app_commit?: string
  remote_app_commit?: string
  sync_state?: string
  notes?: string[]
}

type RepoEntry = {
  name: string
  turbo_repo_path: string
  schema_repo_path: string
  shared_remote: RemoteConfig
  app_remote: RemoteConfig
  local_branches: {
    main: string
    app: string
  }
  release_marker_path: string
  projects?: string[]
  status?: RepoStatus
}

type PromotionRules = {
  app_owned_exact?: string[]
  app_owned_prefixes?: string[]
  framework_safe_exact?: string[]
  framework_safe_prefixes?: string[]
  framework_review_exact?: string[]
  framework_review_prefixes?: string[]
}

type Registry = {
  version: number
  master: {
    repo_root: string
    shared_remote: RemoteConfig
    legacy_remote?: { name: string; url: string }
    release_log_path: string
    promotion_ledger_path: string
    control_plane_doc_path: string
    release_marker_path: string
  }
  promotion_rules?: PromotionRules
  repos: Record<string, RepoEntry>
}

type LatestRelease = {
  id: string
  date: string
  commit: string
  source: string
  summary: string
}

type AuditResult = {
  repoKey: string
  repoName: string
  schemaRepoPath: string
  currentBranch: string
  dirtyCount: number
  sharedRemoteUrl: string
  appRemoteUrl: string
  sharedRemoteMatches: boolean
  appRemoteMatches: boolean
  localMainCommit: string
  remoteMainCommit: string
  localAppCommit: string
  remoteAppCommit: string
  mainMatchesRemote: boolean
  appContainsShared: boolean
  appAheadBy: number | null
  appBehindBy: number | null
  latestReleaseId: string
  latestReleaseCommit: string
  releaseMarkerPath: string
  releaseMarkerExists: boolean
  releaseMarkerReleaseId: string
  releaseMarkerSharedHead: string
  syncState: string
  notes: string[]
}

type PromoteBucket = 'framework-safe' | 'framework-review' | 'app-owned' | 'unknown'

type PromoteRecord = {
  path: string
  status: string
  bucket: PromoteBucket
  sources: string[]
}

type ParsedArgs = {
  command: string
  positionals: string[]
  registryPath: string
  json: boolean
  verify: boolean
  refresh: boolean
  apply: boolean
  applySafe: boolean
  pushApp: boolean
  updateRegistry: boolean
  allowDirty: boolean
  sourceRef: string
  compareRef: string
}

type RunResult = {
  status: number
  stdout: string
  stderr: string
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const schemaRoot = path.resolve(scriptDir, '..')
const defaultRegistryPath = path.join(schemaRoot, 'docs/ai/repo-registry.yaml')

const argv = process.argv.slice(2)
const parsedArgs = parseArgs(argv)

if (!parsedArgs.command || parsedArgs.command === 'help' || parsedArgs.command === '--help' || parsedArgs.command === '-h') {
  printUsage()
  process.exit(0)
}

const registry = loadRegistry(parsedArgs.registryPath)
const latestRelease = loadLatestRelease(registry)

try {
  switch (parsedArgs.command) {
    case 'list':
      handleList(parsedArgs, registry, latestRelease)
      break
    case 'audit':
      handleAudit(parsedArgs, registry, latestRelease)
      break
    case 'sync':
      handleSync(parsedArgs, registry, latestRelease)
      break
    case 'fanout':
      handleFanout(parsedArgs, registry, latestRelease)
      break
    case 'promote':
      handlePromote(parsedArgs, registry, latestRelease)
      break
    default:
      fail(`Unknown command: ${parsedArgs.command}`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  fail(message)
}

function parseArgs(args: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    command: '',
    positionals: [],
    registryPath: defaultRegistryPath,
    json: false,
    verify: false,
    refresh: false,
    apply: false,
    applySafe: false,
    pushApp: false,
    updateRegistry: false,
    allowDirty: false,
    sourceRef: 'HEAD',
    compareRef: '',
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]

    if (arg === '--') {
      continue
    }

    if (!parsed.command && !arg.startsWith('-')) {
      parsed.command = arg
      continue
    }

    if (arg === '--registry') {
      const next = args[i + 1]
      if (!next) fail('Missing value for --registry')
      parsed.registryPath = path.resolve(process.cwd(), next)
      i += 1
      continue
    }
    if (arg.startsWith('--registry=')) {
      parsed.registryPath = path.resolve(process.cwd(), arg.slice('--registry='.length))
      continue
    }
    if (arg === '--json') {
      parsed.json = true
      continue
    }
    if (arg === '--verify') {
      parsed.verify = true
      continue
    }
    if (arg === '--refresh') {
      parsed.refresh = true
      continue
    }
    if (arg === '--apply') {
      parsed.apply = true
      continue
    }
    if (arg === '--apply-safe') {
      parsed.applySafe = true
      continue
    }
    if (arg === '--push-app') {
      parsed.pushApp = true
      continue
    }
    if (arg === '--update-registry') {
      parsed.updateRegistry = true
      continue
    }
    if (arg === '--allow-dirty') {
      parsed.allowDirty = true
      continue
    }
    if (arg === '--source-ref') {
      const next = args[i + 1]
      if (!next) fail('Missing value for --source-ref')
      parsed.sourceRef = next
      i += 1
      continue
    }
    if (arg.startsWith('--source-ref=')) {
      parsed.sourceRef = arg.slice('--source-ref='.length)
      continue
    }
    if (arg === '--compare-ref') {
      const next = args[i + 1]
      if (!next) fail('Missing value for --compare-ref')
      parsed.compareRef = next
      i += 1
      continue
    }
    if (arg.startsWith('--compare-ref=')) {
      parsed.compareRef = arg.slice('--compare-ref='.length)
      continue
    }

    parsed.positionals.push(arg)
  }

  return parsed
}

function printUsage() {
  console.log(
    [
      'Usage: pnpm run schema:repos -- <command> [options] [repo-key ...]',
      '   or: node --import tsx scripts/schema-repos.ts <command> [options] [repo-key ...]',
      '',
      'Commands:',
      '  list            Show registered child repos',
      '  audit           Audit one child repo',
      '  sync            Bring one child repo main/app up to date',
      '  fanout          Run sync across multiple child repos',
      '  promote         Classify child repo changes for master promotion',
      '',
      'Options:',
      '  --registry <path>        Use a custom repo registry file',
      '  --json                   Emit JSON output',
      '  --verify                 For list, audit live child repo state',
      '  --refresh                Fetch child remotes before audit/sync',
      '  --apply                  Apply sync mutations',
      '  --apply-safe             For promote, copy framework-safe files into master working tree',
      '  --push-app               Push child app branch after sync',
      '  --update-registry        Persist current audit/sync result into repo-registry.yaml',
      '  --allow-dirty            Allow sync even if the child working tree is dirty',
      '  --source-ref <ref>       For promote, compare against a specific child ref',
      '  --compare-ref <ref>      For promote, override the comparison base ref',
    ].join('\n')
  )
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function loadRegistry(registryPath: string): Registry {
  if (!fs.existsSync(registryPath)) {
    fail(`Registry not found: ${registryPath}`)
  }
  const raw = fs.readFileSync(registryPath, 'utf8')
  return parse(raw) as Registry
}

function loadLatestRelease(registry: Registry): LatestRelease {
  const releaseLogPath = path.join(registry.master.repo_root, registry.master.release_log_path)
  const raw = fs.readFileSync(releaseLogPath, 'utf8')
  const rows = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('| `schema-master-'))

  const first = rows[0]
  if (!first) fail(`No shared release entries found in ${releaseLogPath}`)

  const parts = first
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length < 6) {
    fail(`Could not parse latest shared release row: ${first}`)
  }

  return {
    id: stripBackticks(parts[0]),
    date: parts[1],
    commit: stripBackticks(parts[2]),
    source: parts[3],
    summary: parts[4],
  }
}

function stripBackticks(value: string): string {
  return value.replace(/^`/, '').replace(/`$/, '')
}

function handleList(args: ParsedArgs, loadedRegistry: Registry, release: LatestRelease) {
  const repoKeys = Object.keys(loadedRegistry.repos)
  const rows = repoKeys.map((repoKey) => {
    const entry = loadedRegistry.repos[repoKey]
    const base = {
      repoKey,
      name: entry.name,
      schemaRepoPath: entry.schema_repo_path,
      expectedReleaseId: entry.status?.expected_release_id ?? '',
      recordedState: entry.status?.sync_state ?? '',
    }

    if (!args.verify) return base

    const audit = auditRepo(repoKey, entry, loadedRegistry, release, args.refresh)
    return {
      ...base,
      liveState: audit.syncState,
      currentBranch: audit.currentBranch,
      dirtyCount: audit.dirtyCount,
      localMainCommit: audit.localMainCommit,
      localAppCommit: audit.localAppCommit,
    }
  })

  if (args.json) {
    console.log(JSON.stringify({ latestRelease: release, repos: rows }, null, 2))
    return
  }

  console.log(`Latest shared release: ${release.id} (${release.commit})`)
  console.log('')
  for (const row of rows) {
    console.log(`${row.repoKey} | ${row.name}`)
    console.log(`  schema: ${row.schemaRepoPath}`)
    console.log(`  expected release: ${row.expectedReleaseId || 'unset'}`)
    console.log(`  recorded state: ${row.recordedState || 'unset'}`)
    if ('liveState' in row) {
      console.log(`  live state: ${row.liveState}`)
      console.log(`  current branch: ${row.currentBranch}`)
      console.log(`  dirty count: ${row.dirtyCount}`)
      console.log(`  main: ${row.localMainCommit || 'missing'}`)
      console.log(`  app: ${row.localAppCommit || 'missing'}`)
    }
    console.log('')
  }
}

function handleAudit(args: ParsedArgs, loadedRegistry: Registry, release: LatestRelease) {
  const repoKey = args.positionals[0]
  if (!repoKey) fail('audit requires a repo key')
  const entry = loadedRegistry.repos[repoKey]
  if (!entry) fail(`Unknown repo key: ${repoKey}`)

  const audit = auditRepo(repoKey, entry, loadedRegistry, release, args.refresh)
  if (args.updateRegistry) {
    persistRegistryStatus(args.registryPath, repoKey, audit, release, 'schema:repos:audit')
  }

  if (args.json) {
    console.log(JSON.stringify(audit, null, 2))
    return
  }

  printAudit(audit)
}

function handleSync(args: ParsedArgs, loadedRegistry: Registry, release: LatestRelease) {
  const repoKey = args.positionals[0]
  if (!repoKey) fail('sync requires a repo key')
  const entry = loadedRegistry.repos[repoKey]
  if (!entry) fail(`Unknown repo key: ${repoKey}`)

  if (!args.apply) {
    const audit = auditRepo(repoKey, entry, loadedRegistry, release, args.refresh)
    if (args.updateRegistry) {
      persistRegistryStatus(args.registryPath, repoKey, audit, release, 'schema:repos:sync(dry-run)')
    }
    const response = {
      mode: 'dry-run',
      repoKey,
      latestReleaseId: release.id,
      audit,
      recommendedCommand: `pnpm run schema:repos:sync -- ${repoKey} --apply --push-app --update-registry`,
    }
    if (args.json) {
      console.log(JSON.stringify(response, null, 2))
    } else {
      console.log(`Dry run for ${repoKey}`)
      printAudit(audit)
      console.log(`Recommended apply command:`)
      console.log(`  ${response.recommendedCommand}`)
    }
    return
  }

  const result = syncRepo(repoKey, entry, loadedRegistry, release, {
    refresh: args.refresh,
    pushApp: args.pushApp,
    allowDirty: args.allowDirty,
  })

  if (args.updateRegistry) {
    persistRegistryStatus(args.registryPath, repoKey, result.audit, release, 'schema:repos:sync')
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(`Synced ${repoKey}`)
  console.log(`  main: ${result.audit.localMainCommit}`)
  console.log(`  app: ${result.audit.localAppCommit}`)
  console.log(`  state: ${result.audit.syncState}`)
  console.log(`  pushed app: ${result.pushedApp ? 'yes' : 'no'}`)
}

function handleFanout(args: ParsedArgs, loadedRegistry: Registry, release: LatestRelease) {
  const repoKeys = args.positionals.length > 0 ? args.positionals : Object.keys(loadedRegistry.repos)
  const results: Array<{ repoKey: string; ok: boolean; message: string; state?: string }> = []

  for (const repoKey of repoKeys) {
    const entry = loadedRegistry.repos[repoKey]
    if (!entry) {
      results.push({ repoKey, ok: false, message: 'unknown repo key' })
      continue
    }

    try {
      if (!args.apply) {
        const audit = auditRepo(repoKey, entry, loadedRegistry, release, args.refresh)
        results.push({
          repoKey,
          ok: true,
          message: 'dry-run',
          state: audit.syncState,
        })
        continue
      }

      const result = syncRepo(repoKey, entry, loadedRegistry, release, {
        refresh: args.refresh,
        pushApp: args.pushApp,
        allowDirty: args.allowDirty,
      })
      if (args.updateRegistry) {
        persistRegistryStatus(args.registryPath, repoKey, result.audit, release, 'schema:repos:fanout')
      }
      results.push({
        repoKey,
        ok: true,
        message: result.pushedApp ? 'synced-and-pushed' : 'synced',
        state: result.audit.syncState,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ repoKey, ok: false, message })
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ latestRelease: release, results }, null, 2))
    return
  }

  console.log(`Fanout target release: ${release.id} (${release.commit})`)
  console.log('')
  for (const result of results) {
    console.log(`${result.repoKey}: ${result.ok ? 'ok' : 'failed'} | ${result.message}${result.state ? ` | ${result.state}` : ''}`)
  }
}

function handlePromote(args: ParsedArgs, loadedRegistry: Registry, release: LatestRelease) {
  const repoKey = args.positionals[0]
  if (!repoKey) fail('promote requires a repo key')
  const entry = loadedRegistry.repos[repoKey]
  if (!entry) fail(`Unknown repo key: ${repoKey}`)

  const report = buildPromoteReport(repoKey, entry, loadedRegistry, args)

  if (args.applySafe) {
    applySafePromotion(report, loadedRegistry)
  }

  if (args.json) {
    console.log(JSON.stringify({ latestRelease: release, ...report }, null, 2))
    return
  }

  console.log(`Promotion report for ${repoKey}`)
  console.log(`  source ref: ${report.sourceRef}`)
  console.log(`  compare ref: ${report.compareRef}`)
  console.log(`  framework-safe: ${report.frameworkSafe.length}`)
  console.log(`  framework-review: ${report.frameworkReview.length}`)
  console.log(`  app-owned: ${report.appOwned.length}`)
  console.log(`  unknown: ${report.unknown.length}`)
  console.log('')
  printPromoteBucket('Framework-safe', report.frameworkSafe)
  printPromoteBucket('Framework-review', report.frameworkReview)
  printPromoteBucket('App-owned', report.appOwned)
  printPromoteBucket('Unknown', report.unknown)
  if (args.applySafe) {
    console.log('')
    console.log(`Applied strictly framework-safe files into the master working tree.`)
  }
}

function auditRepo(
  repoKey: string,
  entry: RepoEntry,
  loadedRegistry: Registry,
  release: LatestRelease,
  refresh: boolean
): AuditResult {
  const schemaRepoPath = entry.schema_repo_path
  const notes: string[] = []

  if (!fs.existsSync(schemaRepoPath)) {
    return {
      repoKey,
      repoName: entry.name,
      schemaRepoPath,
      currentBranch: '',
      dirtyCount: 0,
      sharedRemoteUrl: '',
      appRemoteUrl: '',
      sharedRemoteMatches: false,
      appRemoteMatches: false,
      localMainCommit: '',
      remoteMainCommit: '',
      localAppCommit: '',
      remoteAppCommit: '',
      mainMatchesRemote: false,
      appContainsShared: false,
      appAheadBy: null,
      appBehindBy: null,
      latestReleaseId: release.id,
      latestReleaseCommit: release.commit,
      releaseMarkerPath: path.join(schemaRepoPath, entry.release_marker_path),
      releaseMarkerExists: false,
      releaseMarkerReleaseId: '',
      releaseMarkerSharedHead: '',
      syncState: 'missing-path',
      notes: ['Schema repo path is missing'],
    }
  }

  if (!isGitRepo(schemaRepoPath)) {
    return {
      repoKey,
      repoName: entry.name,
      schemaRepoPath,
      currentBranch: '',
      dirtyCount: 0,
      sharedRemoteUrl: '',
      appRemoteUrl: '',
      sharedRemoteMatches: false,
      appRemoteMatches: false,
      localMainCommit: '',
      remoteMainCommit: '',
      localAppCommit: '',
      remoteAppCommit: '',
      mainMatchesRemote: false,
      appContainsShared: false,
      appAheadBy: null,
      appBehindBy: null,
      latestReleaseId: release.id,
      latestReleaseCommit: release.commit,
      releaseMarkerPath: path.join(schemaRepoPath, entry.release_marker_path),
      releaseMarkerExists: false,
      releaseMarkerReleaseId: '',
      releaseMarkerSharedHead: '',
      syncState: 'not-git',
      notes: ['Schema repo path is not a git repo'],
    }
  }

  if (refresh) {
    git(schemaRepoPath, ['fetch', entry.shared_remote.name], { check: false })
    git(schemaRepoPath, ['fetch', entry.app_remote.name], { check: false })
  }

  const currentBranch = git(schemaRepoPath, ['branch', '--show-current'], { check: false }).stdout.trim()
  const dirtyCount = countDirtyEntries(schemaRepoPath)
  const sharedRemoteUrl = git(schemaRepoPath, ['remote', 'get-url', entry.shared_remote.name], { check: false }).stdout.trim()
  const appRemoteUrl = git(schemaRepoPath, ['remote', 'get-url', entry.app_remote.name], { check: false }).stdout.trim()

  const localMainRef = `refs/heads/${entry.local_branches.main}`
  const remoteMainRef = `refs/remotes/${entry.shared_remote.name}/${entry.shared_remote.branch}`
  const localAppRef = `refs/heads/${entry.local_branches.app}`
  const remoteAppRef = `refs/remotes/${entry.app_remote.name}/${entry.app_remote.branch}`

  const localMainCommit = resolveCommit(schemaRepoPath, localMainRef)
  const remoteMainCommit = resolveCommit(schemaRepoPath, remoteMainRef)
  const localAppCommit = resolveCommit(schemaRepoPath, localAppRef)
  const remoteAppCommit = resolveCommit(schemaRepoPath, remoteAppRef)

  const sharedRemoteMatches = sharedRemoteUrl === entry.shared_remote.url
  const appRemoteMatches = appRemoteUrl === entry.app_remote.url
  const mainMatchesRemote = Boolean(localMainCommit && remoteMainCommit && localMainCommit === remoteMainCommit)
  const appContainsShared =
    Boolean(localAppCommit && remoteMainCommit) && isAncestor(schemaRepoPath, remoteMainRef, localAppRef)

  const [appAheadBy, appBehindBy] = localAppCommit && remoteAppCommit ? countAheadBehind(schemaRepoPath, remoteAppRef, localAppRef) : [null, null]

  const releaseMarkerPath = path.join(schemaRepoPath, entry.release_marker_path)
  const releaseMarker = loadReleaseMarker(schemaRepoPath, entry.release_marker_path, [localAppRef, remoteAppRef])

  let syncState = 'in-sync'

  if (!sharedRemoteMatches || !appRemoteMatches) {
    syncState = 'remote-mismatch'
  } else if (!localMainCommit || !remoteMainCommit) {
    syncState = 'missing-main'
  } else if (!mainMatchesRemote) {
    syncState = 'needs-main-sync'
  } else if (!localAppCommit) {
    syncState = 'missing-app'
  } else if (!appContainsShared) {
    syncState = 'needs-app-sync'
  } else if (remoteAppCommit && localAppCommit !== remoteAppCommit) {
    if (appAheadBy !== null && appBehindBy !== null && appAheadBy > 0 && appBehindBy === 0) {
      syncState = 'app-unpushed'
    } else if (appAheadBy !== null && appBehindBy !== null && appAheadBy === 0 && appBehindBy > 0) {
      syncState = 'needs-app-fast-forward'
    } else {
      syncState = 'app-diverged'
    }
  } else if (!releaseMarker.exists) {
    syncState = 'needs-marker-update'
  } else if (releaseMarker.releaseId !== release.id || releaseMarker.sharedHeadCommit !== remoteMainCommit) {
    syncState = 'needs-marker-update'
  } else if (dirtyCount > 0) {
    syncState = 'dirty-working-tree'
  }

  if (!sharedRemoteMatches) notes.push(`Expected ${entry.shared_remote.name} -> ${entry.shared_remote.url}`)
  if (!appRemoteMatches) notes.push(`Expected ${entry.app_remote.name} -> ${entry.app_remote.url}`)
  if (dirtyCount > 0) notes.push(`Working tree is dirty with ${dirtyCount} change(s)`)
  if (currentBranch === entry.local_branches.main || currentBranch === entry.local_branches.app) {
    notes.push(`Current branch is ${currentBranch}; sync should avoid rewriting a checked-out branch`)
  }
  if (!releaseMarker.exists) notes.push(`Release marker is missing at ${releaseMarkerPath}`)
  if (releaseMarker.exists && releaseMarker.releaseId !== release.id) {
    notes.push(`Release marker is on ${releaseMarker.releaseId}, latest shared release is ${release.id}`)
  }

  return {
    repoKey,
    repoName: entry.name,
    schemaRepoPath,
    currentBranch,
    dirtyCount,
    sharedRemoteUrl,
    appRemoteUrl,
    sharedRemoteMatches,
    appRemoteMatches,
    localMainCommit,
    remoteMainCommit,
    localAppCommit,
    remoteAppCommit,
    mainMatchesRemote,
    appContainsShared,
    appAheadBy,
    appBehindBy,
    latestReleaseId: release.id,
    latestReleaseCommit: release.commit,
    releaseMarkerPath,
    releaseMarkerExists: releaseMarker.exists,
    releaseMarkerReleaseId: releaseMarker.releaseId,
    releaseMarkerSharedHead: releaseMarker.sharedHeadCommit,
    syncState,
    notes,
  }
}

function printAudit(audit: AuditResult) {
  console.log(`${audit.repoKey} | ${audit.repoName}`)
  console.log(`  repo: ${audit.schemaRepoPath}`)
  console.log(`  state: ${audit.syncState}`)
  console.log(`  current branch: ${audit.currentBranch || '(detached or unknown)'}`)
  console.log(`  dirty count: ${audit.dirtyCount}`)
  console.log(`  shared remote ok: ${audit.sharedRemoteMatches ? 'yes' : 'no'}`)
  console.log(`  app remote ok: ${audit.appRemoteMatches ? 'yes' : 'no'}`)
  console.log(`  local main: ${audit.localMainCommit || 'missing'}`)
  console.log(`  remote main: ${audit.remoteMainCommit || 'missing'}`)
  console.log(`  local app: ${audit.localAppCommit || 'missing'}`)
  console.log(`  remote app: ${audit.remoteAppCommit || 'missing'}`)
  console.log(`  app contains shared main: ${audit.appContainsShared ? 'yes' : 'no'}`)
  console.log(`  release marker: ${audit.releaseMarkerExists ? audit.releaseMarkerReleaseId || 'present' : 'missing'}`)
  if (audit.notes.length > 0) {
    console.log(`  notes:`)
    for (const note of audit.notes) {
      console.log(`    - ${note}`)
    }
  }
}

function syncRepo(
  repoKey: string,
  entry: RepoEntry,
  loadedRegistry: Registry,
  release: LatestRelease,
  options: { refresh: boolean; pushApp: boolean; allowDirty: boolean }
): { pushedApp: boolean; audit: AuditResult } {
  const schemaRepoPath = entry.schema_repo_path
  const preAudit = auditRepo(repoKey, entry, loadedRegistry, release, options.refresh)

  if (preAudit.syncState === 'missing-path' || preAudit.syncState === 'not-git') {
    fail(`Cannot sync ${repoKey}: ${preAudit.syncState}`)
  }

  if (!options.allowDirty && preAudit.dirtyCount > 0) {
    fail(`Cannot sync ${repoKey}: child working tree is dirty`)
  }

  if (preAudit.currentBranch === entry.local_branches.main || preAudit.currentBranch === entry.local_branches.app) {
    fail(`Cannot sync ${repoKey}: ${preAudit.currentBranch} is currently checked out in the live child repo`)
  }

  const localMainRef = `refs/heads/${entry.local_branches.main}`
  const remoteMainRef = `refs/remotes/${entry.shared_remote.name}/${entry.shared_remote.branch}`
  const localAppRef = `refs/heads/${entry.local_branches.app}`
  const remoteAppRef = `refs/remotes/${entry.app_remote.name}/${entry.app_remote.branch}`

  if (!refExists(schemaRepoPath, remoteMainRef)) {
    fail(`Cannot sync ${repoKey}: missing ${remoteMainRef}`)
  }

  const appSourceRef = resolveAppSourceRef(schemaRepoPath, localAppRef, remoteAppRef)
  const tempBranch = `__schema_sync_app_${repoKey}_${Date.now()}`
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `schema-${repoKey}-sync-`))
  let pushedApp = false

  try {
    git(schemaRepoPath, ['worktree', 'prune'])
    git(schemaRepoPath, ['worktree', 'add', '--detach', tempDir, localMainRef])

    git(schemaRepoPath, ['branch', '-f', entry.local_branches.main, remoteMainRef])

    git(tempDir, ['switch', '-c', tempBranch, appSourceRef])
    const mergeResult = git(tempDir, ['merge', '--no-ff', '--no-edit', remoteMainRef], { check: false })
    if (mergeResult.status !== 0) {
      const errorText = (mergeResult.stderr || mergeResult.stdout).trim() || `Could not merge ${remoteMainRef} into ${appSourceRef}`
      throw new Error(`Cannot sync ${repoKey}: ${errorText}`)
    }

    const markerPayload = {
      version: 1,
      repo_key: repoKey,
      repo_name: entry.name,
      shared_framework: {
        release_id: release.id,
        release_commit: release.commit,
        applied_shared_head_commit: resolveCommit(schemaRepoPath, remoteMainRef),
        applied_at: new Date().toISOString(),
        applied_by: 'schema:repos:sync',
      },
    }

    const markerPath = path.join(tempDir, entry.release_marker_path)
    ensureParentDir(markerPath)
    fs.writeFileSync(markerPath, stringify(markerPayload), 'utf8')

    if (hasWorktreeChanges(tempDir)) {
      git(tempDir, ['add', entry.release_marker_path])
      if (hasStagedChanges(tempDir)) {
        git(tempDir, ['commit', '-m', `Record ${release.id} in schema release marker`])
      }
    }

    git(schemaRepoPath, ['branch', '-f', entry.local_branches.app, tempBranch])

    if (options.pushApp) {
      git(schemaRepoPath, ['push', entry.app_remote.name, `${entry.local_branches.app}:${entry.app_remote.branch}`])
      pushedApp = true
    }
  } finally {
    bestEffort(() => git(tempDir, ['switch', '--detach'], { check: false }))
    bestEffort(() => git(schemaRepoPath, ['worktree', 'remove', tempDir], { check: false }))
    bestEffort(() => git(schemaRepoPath, ['branch', '-D', tempBranch], { check: false }))
    bestEffort(() => {
      if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true })
    })
  }

  const audit = auditRepo(repoKey, entry, loadedRegistry, release, false)
  return { pushedApp, audit }
}

function resolveAppSourceRef(schemaRepoPath: string, localAppRef: string, remoteAppRef: string): string {
  const hasLocal = refExists(schemaRepoPath, localAppRef)
  const hasRemote = refExists(schemaRepoPath, remoteAppRef)

  if (hasLocal && !hasRemote) return localAppRef
  if (!hasLocal && hasRemote) return remoteAppRef
  if (!hasLocal && !hasRemote) {
    fail(`Cannot sync child repo: missing both ${localAppRef} and ${remoteAppRef}`)
  }

  const localCommit = resolveCommit(schemaRepoPath, localAppRef)
  const remoteCommit = resolveCommit(schemaRepoPath, remoteAppRef)

  if (localCommit === remoteCommit) return localAppRef
  if (isAncestor(schemaRepoPath, remoteAppRef, localAppRef)) return localAppRef
  if (isAncestor(schemaRepoPath, localAppRef, remoteAppRef)) return remoteAppRef

  fail(`Cannot sync child repo: local app and remote app/app have diverged`)
}

function buildPromoteReport(
  repoKey: string,
  entry: RepoEntry,
  loadedRegistry: Registry,
  args: ParsedArgs
): {
  repoKey: string
  sourceRef: string
  compareRef: string
  frameworkSafe: PromoteRecord[]
  frameworkReview: PromoteRecord[]
  appOwned: PromoteRecord[]
  unknown: PromoteRecord[]
} {
  const compareRef = args.compareRef || `refs/heads/${entry.local_branches.main}`
  const sourceRef = args.sourceRef || 'HEAD'
  const records = collectPromoteRecords(entry.schema_repo_path, compareRef, sourceRef, loadedRegistry.promotion_rules ?? {})

  return {
    repoKey,
    sourceRef,
    compareRef,
    frameworkSafe: records.filter((record) => record.bucket === 'framework-safe'),
    frameworkReview: records.filter((record) => record.bucket === 'framework-review'),
    appOwned: records.filter((record) => record.bucket === 'app-owned'),
    unknown: records.filter((record) => record.bucket === 'unknown'),
  }
}

function collectPromoteRecords(
  schemaRepoPath: string,
  compareRef: string,
  sourceRef: string,
  rules: PromotionRules
): PromoteRecord[] {
  const records = new Map<string, PromoteRecord>()

  const committed = parseNameStatus(git(schemaRepoPath, ['diff', '--name-status', `${compareRef}...${sourceRef}`], { check: false }).stdout)
  const staged = parseNameStatus(git(schemaRepoPath, ['diff', '--cached', '--name-status'], { check: false }).stdout)
  const unstaged = parseNameStatus(git(schemaRepoPath, ['diff', '--name-status'], { check: false }).stdout)
  const untracked = git(schemaRepoPath, ['ls-files', '--others', '--exclude-standard'], { check: false })
    .stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((filePath) => ({ path: filePath, status: 'A', source: 'untracked' }))

  const all = [
    ...committed.map((item) => ({ ...item, source: 'committed' })),
    ...staged.map((item) => ({ ...item, source: 'staged' })),
    ...unstaged.map((item) => ({ ...item, source: 'worktree' })),
    ...untracked,
  ]

  for (const item of all) {
    const existing = records.get(item.path)
    const bucket = classifyPromotionPath(item.path, rules)
    if (!existing) {
      records.set(item.path, {
        path: item.path,
        status: item.status,
        bucket,
        sources: [item.source],
      })
      continue
    }
    existing.status = item.status
    if (!existing.sources.includes(item.source)) existing.sources.push(item.source)
    existing.bucket = bucket
  }

  return [...records.values()].sort((left, right) => left.path.localeCompare(right.path))
}

function parseNameStatus(raw: string): Array<{ path: string; status: string }> {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const parsed: Array<{ path: string; status: string }> = []
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const status = parts[0]
    const pathPart = status.startsWith('R') || status.startsWith('C') ? parts[2] : parts[1]
    if (!pathPart) continue
    parsed.push({ path: pathPart, status })
  }
  return parsed
}

function classifyPromotionPath(filePath: string, rules: PromotionRules): PromoteBucket {
  const normalized = normalizeForMatch(filePath)
  if (matchesExactOrPrefix(normalized, rules.app_owned_exact, rules.app_owned_prefixes)) return 'app-owned'
  if (matchesExactOrPrefix(normalized, rules.framework_safe_exact, rules.framework_safe_prefixes)) return 'framework-safe'
  if (matchesExactOrPrefix(normalized, rules.framework_review_exact, rules.framework_review_prefixes)) return 'framework-review'
  return 'unknown'
}

function matchesExactOrPrefix(value: string, exact: string[] | undefined, prefixes: string[] | undefined): boolean {
  const exactMatch = (exact ?? []).includes(value)
  if (exactMatch) return true
  return (prefixes ?? []).some((prefix) => value.startsWith(normalizeForMatch(prefix)))
}

function normalizeForMatch(value: string): string {
  return value.replace(/\\/g, '/')
}

function applySafePromotion(
  report: {
    repoKey: string
    frameworkSafe: PromoteRecord[]
  },
  loadedRegistry: Registry
) {
  const entry = loadedRegistry.repos[report.repoKey]
  const masterRoot = loadedRegistry.master.repo_root

  if (report.frameworkSafe.length === 0) {
    return
  }

  for (const record of report.frameworkSafe) {
    const destinationStatus = git(masterRoot, ['status', '--porcelain', '--', record.path], { check: false }).stdout.trim()
    if (destinationStatus) {
      fail(`Refusing to overwrite dirty master path: ${record.path}`)
    }

    const sourcePath = path.join(entry.schema_repo_path, record.path)
    const destinationPath = path.join(masterRoot, record.path)

    if (fs.existsSync(sourcePath)) {
      ensureParentDir(destinationPath)
      fs.copyFileSync(sourcePath, destinationPath)
      continue
    }

    if (fs.existsSync(destinationPath)) {
      fs.rmSync(destinationPath, { recursive: true, force: true })
    }
  }
}

function printPromoteBucket(label: string, records: PromoteRecord[]) {
  console.log(`${label}:`)
  if (records.length === 0) {
    console.log('  - none')
    return
  }
  for (const record of records) {
    console.log(`  - ${record.path} | ${record.status} | ${record.sources.join(',')}`)
  }
}

function loadReleaseMarker(
  repoPath: string,
  markerRelativePath: string,
  refs: string[]
): { exists: boolean; releaseId: string; sharedHeadCommit: string } {
  for (const ref of refs) {
    if (!ref || !refExists(repoPath, ref)) continue
    const candidate = git(repoPath, ['show', `${ref}:${markerRelativePath}`], { check: false })
    if (candidate.status !== 0 || !candidate.stdout.trim()) continue
    return parseReleaseMarker(candidate.stdout)
  }

  const markerPath = path.join(repoPath, markerRelativePath)
  if (!fs.existsSync(markerPath)) {
    return { exists: false, releaseId: '', sharedHeadCommit: '' }
  }
  try {
    const raw = fs.readFileSync(markerPath, 'utf8')
    return parseReleaseMarker(raw)
  } catch {
    return { exists: true, releaseId: '', sharedHeadCommit: '' }
  }
}

function parseReleaseMarker(raw: string): { exists: boolean; releaseId: string; sharedHeadCommit: string } {
  try {
    const parsed = parse(raw) as {
      shared_framework?: {
        release_id?: string
        applied_shared_head_commit?: string
      }
    }
    return {
      exists: true,
      releaseId: parsed.shared_framework?.release_id ? String(parsed.shared_framework.release_id) : '',
      sharedHeadCommit: parsed.shared_framework?.applied_shared_head_commit
        ? String(parsed.shared_framework.applied_shared_head_commit)
        : '',
    }
  } catch {
    return { exists: true, releaseId: '', sharedHeadCommit: '' }
  }
}

function persistRegistryStatus(
  registryPath: string,
  repoKey: string,
  audit: AuditResult,
  release: LatestRelease,
  actor: string
) {
  const loaded = loadRegistry(registryPath)
  const entry = loaded.repos[repoKey]
  if (!entry) fail(`Unknown repo key while updating registry: ${repoKey}`)

  entry.status = {
    expected_release_id: release.id,
    last_verified_at: new Date().toISOString().slice(0, 10),
    last_verified_by: actor,
    local_main_commit: audit.localMainCommit || undefined,
    remote_main_commit: audit.remoteMainCommit || undefined,
    local_app_commit: audit.localAppCommit || undefined,
    remote_app_commit: audit.remoteAppCommit || undefined,
    sync_state: audit.syncState,
    notes: audit.notes.length > 0 ? audit.notes : undefined,
  }

  fs.writeFileSync(registryPath, stringify(loaded), 'utf8')
}

function countDirtyEntries(repoPath: string): number {
  const output = git(repoPath, ['status', '--porcelain'], { check: false }).stdout
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length
}

function resolveCommit(repoPath: string, ref: string): string {
  const result = git(repoPath, ['rev-parse', '--short', ref], { check: false })
  if (result.status !== 0) return ''
  return result.stdout.trim()
}

function refExists(repoPath: string, ref: string): boolean {
  const result = git(repoPath, ['rev-parse', '--verify', '--quiet', ref], { check: false })
  return result.status === 0
}

function isGitRepo(repoPath: string): boolean {
  const result = git(repoPath, ['rev-parse', '--is-inside-work-tree'], { check: false })
  return result.status === 0
}

function isAncestor(repoPath: string, ancestorRef: string, descendantRef: string): boolean {
  const result = git(repoPath, ['merge-base', '--is-ancestor', ancestorRef, descendantRef], { check: false })
  return result.status === 0
}

function countAheadBehind(repoPath: string, baseRef: string, targetRef: string): [number, number] {
  const result = git(repoPath, ['rev-list', '--left-right', '--count', `${baseRef}...${targetRef}`], { check: false })
  if (result.status !== 0) return [0, 0]
  const [behindRaw, aheadRaw] = result.stdout.trim().split('\t')
  return [Number(aheadRaw ?? 0), Number(behindRaw ?? 0)]
}

function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function hasWorktreeChanges(repoPath: string): boolean {
  const result = git(repoPath, ['status', '--porcelain'], { check: false })
  return result.stdout.trim().length > 0
}

function hasStagedChanges(repoPath: string): boolean {
  const result = git(repoPath, ['diff', '--cached', '--quiet'], { check: false })
  return result.status !== 0
}

function bestEffort(fn: () => void) {
  try {
    fn()
  } catch {
    // ignore cleanup failures
  }
}

function git(repoPath: string, args: string[], options: { check?: boolean } = {}): RunResult {
  const result = spawnSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
  })

  if (options.check !== false && result.status !== 0) {
    const stderr = result.stderr?.trim() || result.stdout?.trim() || `git ${args.join(' ')} failed`
    throw new Error(stderr)
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}
