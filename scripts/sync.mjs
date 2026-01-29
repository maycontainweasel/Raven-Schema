import { readFileSync, writeFileSync, existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { parse } from 'yaml'

const argv = process.argv.slice(2)
let configPath
let cliDryRunOverride
let cliItemize = false
let cliChecksum = false
let cliLogFile
let cliListChanges = false
let cliContexts = []
let cliTargets = []
let cliProjects = []
let cliDestination
let cliListContexts = false
let cliListTargets = false

const pushList = (list, value) => {
  if (!value) return
  const items = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  list.push(...items)
}

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]
  if (arg === '--dry-run' || arg === '-n') {
    cliDryRunOverride = true
    continue
  }
  if (arg === '--apply' || arg === '--no-dry-run') {
    cliDryRunOverride = false
    continue
  }
  if (arg === '--itemize' || arg === '--itemize-changes') {
    cliItemize = true
    continue
  }
  if (arg === '--checksum') {
    cliChecksum = true
    continue
  }
  if (arg === '--list-changes' || arg === '--changes-only' || arg === '--diff-list') {
    cliListChanges = true
    continue
  }
  if (arg === '--context' || arg === '--env' || arg === '--profile') {
    pushList(cliContexts, argv[i + 1])
    i += 1
    continue
  }
  if (arg.startsWith('--context=') || arg.startsWith('--env=') || arg.startsWith('--profile=')) {
    pushList(cliContexts, arg.split('=')[1])
    continue
  }
  if (arg === '--target') {
    pushList(cliTargets, argv[i + 1])
    i += 1
    continue
  }
  if (arg.startsWith('--target=')) {
    pushList(cliTargets, arg.split('=')[1])
    continue
  }
  if (arg === '--project') {
    pushList(cliProjects, argv[i + 1])
    i += 1
    continue
  }
  if (arg.startsWith('--project=')) {
    pushList(cliProjects, arg.split('=')[1])
    continue
  }
  if (arg === '--destination' || arg === '--dest') {
    cliDestination = argv[i + 1]
    i += 1
    continue
  }
  if (arg.startsWith('--destination=') || arg.startsWith('--dest=')) {
    cliDestination = arg.split('=')[1]
    continue
  }
  if (arg === '--list-contexts' || arg === '--contexts') {
    cliListContexts = true
    continue
  }
  if (arg === '--list-targets' || arg === '--targets') {
    cliListTargets = true
    continue
  }
  if (arg === '--output' || arg === '--log-file' || arg === '--itemize-out') {
    cliLogFile = argv[i + 1]
    i += 1
    continue
  }
  if (arg.startsWith('--output=') || arg.startsWith('--log-file=') || arg.startsWith('--itemize-out=')) {
    cliLogFile = arg.split('=')[1]
    continue
  }
  if (arg === '--config') {
    configPath = argv[i + 1]
    i += 1
    continue
  }
  if (arg.startsWith('--config=')) {
    configPath = arg.split('=')[1]
    continue
  }
  if (!configPath) {
    configPath = arg
  }
}

const resolvedConfigPath = configPath || path.resolve(process.cwd(), 'config/sync.yaml')

const loadConfig = () => {
  const raw = readFileSync(resolvedConfigPath, 'utf8')
  return parse(raw)
}

const normalizeMode = (mode = 'overwrite') => {
  const normalized = String(mode).toLowerCase()
  if (['overwrite', 'skip', 'mirror'].includes(normalized)) return normalized
  throw new Error(`Unsupported sync mode: ${mode}`)
}

const toArray = (value) => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const normalizeNamedCollection = (value, label) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string') return { name: entry }
      if (entry && typeof entry === 'object') return entry
      throw new Error(`Invalid ${label} entry: ${String(entry)}`)
    })
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([name, entry]) => {
      if (typeof entry === 'string') return { name, root: entry }
      if (Array.isArray(entry)) return { name, targets: entry }
      if (entry && typeof entry === 'object') return { name, ...entry }
      return { name }
    })
  }
  throw new Error(`Invalid ${label} config`)
}

const normalizeDestinations = (destinations) => {
  const items = normalizeNamedCollection(destinations, 'destination')
  const map = new Map()
  for (const entry of items) {
    if (!entry?.name) throw new Error('Destination entry missing name')
    if (!entry?.root) {
      throw new Error(`Destination "${entry.name}" missing root`)
    }
    map.set(entry.name, entry)
  }
  return map
}

const normalizeContexts = (contexts) => {
  return normalizeNamedCollection(contexts, 'context')
}

const loadJson = (filePath) => {
  const raw = readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

const writeJson = (filePath, value) => {
  const json = `${JSON.stringify(value, null, 2)}\n`
  writeFileSync(filePath, json, 'utf8')
}

const buildRsyncArgs = (options) => {
  const args = ['-a', '--human-readable']
  if (options.listChanges) {
    args.push('--no-motd')
    args.push('--out-format=%n')
  } else {
    args.push('--info=stats2')
  }
  if (options.dryRun) args.push('--dry-run')
  if (options.itemize) args.push('--itemize-changes')
  if (options.checksum) args.push('--checksum')
  if (options.mode === 'skip') args.push('--ignore-existing')
  if (options.mode === 'mirror') args.push('--delete')

  if (options.include.length) {
    if (options.includeMode === 'allowlist') {
      args.push('--include', '*/')
      for (const pattern of options.exclude) {
        args.push('--exclude', pattern)
      }
      for (const pattern of options.include) {
        args.push('--include', pattern)
      }
      args.push('--exclude', '*')
    } else {
      for (const pattern of options.exclude) {
        args.push('--exclude', pattern)
      }
      for (const pattern of options.include) {
        args.push('--include', pattern)
      }
    }
  } else if (options.exclude.length) {
    for (const pattern of options.exclude) {
      args.push('--exclude', pattern)
    }
  }

  args.push(`${options.root}${path.sep}`)
  args.push(`${options.dest}${path.sep}`)
  return args
}

const ensureDir = async (dir) => {
  await mkdir(dir, { recursive: true })
}

const resolveFlag = (cliValue, ...candidates) => {
  if (cliValue) return true
  for (const value of candidates) {
    if (value !== undefined) return Boolean(value)
  }
  return false
}

const resolveLogFile = (cliValue, ...candidates) => {
  if (cliValue) return cliValue
  for (const value of candidates) {
    if (value) return value
  }
  return null
}

const normalizeProjects = (target) => {
  if (Array.isArray(target?.projects) && target.projects.length) return target.projects
  const dest = target?.dest ?? target?.destination
  if (dest) {
    return [
      {
        name: target?.name || 'sync-target',
        dest,
        active: target?.active,
        mode: target.mode,
        dryRun: target.dryRun,
        include: target.include,
        exclude: target.exclude,
        itemize: target.itemize,
        checksum: target.checksum,
      },
    ]
  }
  return []
}

const resolvePackageJsonConfig = (project, target, cfg) => {
  const config = project?.packageJson ?? target?.packageJson ?? cfg?.packageJson
  if (!config) return null
  if (config === true) {
    return { preserve: ['name'] }
  }
  const preserve = toArray(config?.preserve)
  if (!preserve.length) return null
  return { preserve }
}

const mergePackageJson = ({ sourcePath, destPath, preserve }) => {
  if (!existsSync(sourcePath) || !existsSync(destPath)) return
  const source = loadJson(sourcePath)
  const dest = loadJson(destPath)
  const merged = { ...source }
  for (const key of preserve) {
    if (dest?.[key] !== undefined) {
      merged[key] = dest[key]
    }
  }
  writeJson(destPath, merged)
}

const isPackageJsonExcluded = (excludeList) =>
  (excludeList || []).some((pattern) => String(pattern).includes('package.json'))

const resolveIncludeMode = (project, target, cfg) => {
  const mode = project?.includeMode ?? target?.includeMode ?? cfg?.includeMode
  if (!mode) return 'allowlist'
  const normalized = String(mode).toLowerCase()
  if (['allowlist', 'additive'].includes(normalized)) return normalized
  throw new Error(`Unsupported includeMode: ${mode}`)
}

const resolveSourceRoot = (root, target) => {
  const candidate = target?.root ?? target?.source ?? target?.path
  if (!candidate) return root
  return path.resolve(root, candidate)
}

const resolveDestPath = (value, destRoot, label) => {
  if (!value) return null
  if (path.isAbsolute(value)) return value
  if (!destRoot) {
    throw new Error(`Relative ${label || 'dest'} "${value}" requires a destination root`)
  }
  return path.resolve(destRoot, value)
}

const resolveDestRoot = ({ cfg, context, target, destinations, cliDestination }) => {
  const direct = target?.destRoot ?? context?.destRoot ?? context?.destinationRoot ?? cfg?.destRoot
  if (direct) return path.resolve(direct)
  if (cliDestination && path.isAbsolute(cliDestination)) return path.resolve(cliDestination)
  const destinationKey = cliDestination || target?.destination || context?.destination || cfg?.destination
  if (!destinationKey) return null
  const resolved = destinations.get(destinationKey)
  if (!resolved) {
    throw new Error(`Unknown destination "${destinationKey}"`)
  }
  return path.resolve(resolved.root)
}

const normalizeTargetList = (targets) => toArray(targets).filter(Boolean)

const mapTargetsByName = (targets) => {
  const map = new Map()
  for (const target of targets) {
    if (target?.name) map.set(target.name, target)
  }
  return map
}

const resolveContextTargets = ({ context, targetMap }) => {
  const entries = toArray(context?.targets ?? context?.target)
  if (!entries.length) return []
  const resolved = []
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const target = targetMap.get(entry)
      if (!target) throw new Error(`Context "${context?.name}" missing target "${entry}"`)
      resolved.push(target)
      continue
    }
    if (entry && typeof entry === 'object') {
      if (!entry?.name) {
        throw new Error(`Context "${context?.name}" target is missing a name`)
      }
      resolved.push(entry)
      continue
    }
    throw new Error(`Invalid target entry in context "${context?.name}"`)
  }
  return resolved
}

const filterByNames = (items, names) => {
  if (!names || !names.length) return items
  const wanted = new Set(names)
  return items.filter((item) => wanted.has(item?.name))
}

const resolveSeedConfig = (project, target, cfg) => project?.seed ?? target?.seed ?? cfg?.seed ?? null

const appendLog = (filePath, content) => {
  if (!filePath || !content) return
  writeFileSync(filePath, content, { encoding: 'utf8', flag: 'a' })
}

const filterChangeLines = (output) => {
  if (!output) return []
  const ignorePrefixes = [
    'sending incremental file list',
    'receiving incremental file list',
    'sent ',
    'total size is ',
    'created directory ',
    'rsync: ',
  ]
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)
    .filter((line) => !ignorePrefixes.some((prefix) => line.startsWith(prefix)))
    .filter((line) => !line.endsWith('/') && !line.endsWith(path.sep))
    .filter((line) => line !== '.git' && !line.startsWith('.git/') && !line.startsWith('.git\\'))
}

const resolveTemplatePath = (rootOverride, seedConfig) => {
  if (seedConfig?.appConfig?.template) {
    return path.isAbsolute(seedConfig.appConfig.template)
      ? seedConfig.appConfig.template
      : path.resolve(rootOverride, seedConfig.appConfig.template)
  }
  const fallback = path.resolve(rootOverride, 'config/app.config.template.yaml')
  if (existsSync(fallback)) return fallback
  return path.resolve(rootOverride, 'config/app.config.example.yaml')
}

const applyTemplate = (content, values) => {
  if (!values) return content
  let result = content
  for (const [key, value] of Object.entries(values)) {
    const token = `{{${key}}}`
    result = result.split(token).join(String(value))
  }
  return result
}

const seedAppConfig = async ({ rootOverride, dest, seedConfig }) => {
  const configDir = path.join(dest, 'config')
  const configPath = path.join(configDir, 'app.config.yaml')
  if (existsSync(configPath) && !seedConfig?.appConfig?.force) return
  const templatePath = resolveTemplatePath(rootOverride, seedConfig)
  if (!existsSync(templatePath)) return
  await ensureDir(configDir)
  const template = readFileSync(templatePath, 'utf8')
  const values = seedConfig?.appConfig?.values ?? seedConfig?.values ?? null
  const output = applyTemplate(template, values)
  writeFileSync(configPath, output, 'utf8')
}

const run = async () => {
  const cfg = loadConfig()
  if (!cfg?.root) throw new Error('sync.yaml must include a root')
  const root = path.resolve(cfg.root)
  const defaultDryRun = Boolean(cfg.dryRun)
  const globalExclude = toArray(cfg.globalExclude)
  const defaultLogFile = cfg?.logFile
  const targets = normalizeTargetList(cfg.targets)
  if (!targets.length) throw new Error('sync.yaml must include at least one target')
  const targetMap = mapTargetsByName(targets)
  const contexts = normalizeContexts(cfg?.contexts)
  const destinations = normalizeDestinations(cfg?.destinations)

  if (cliListContexts) {
    const names = contexts.map((context) => context?.name).filter(Boolean)
    console.info(names.length ? names.join('\n') : 'No contexts configured')
    return
  }

  if (cliListTargets) {
    const names = targets.map((target) => target?.name).filter(Boolean)
    console.info(names.length ? names.join('\n') : 'No targets configured')
    return
  }

  let contextsToRun = []
  if (contexts.length) {
    if (cliContexts.length) {
      const wanted = new Set(cliContexts)
      contextsToRun = contexts.filter((context) => wanted.has(context?.name))
      const missing = cliContexts.filter((name) => !contextsToRun.find((context) => context?.name === name))
      if (missing.length) {
        throw new Error(`Unknown context(s): ${missing.join(', ')}`)
      }
    } else {
      const defaultContext = contexts.find((context) => context?.name === 'default')
      contextsToRun = defaultContext ? [defaultContext] : contexts
    }
  } else {
    contextsToRun = [{ name: 'default', targets }]
  }

  for (const context of contextsToRun) {
    const contextName = context?.name || 'default'
    const contextTargets = contexts.length
      ? resolveContextTargets({ context, targetMap })
      : targets
    const filteredTargets = filterByNames(contextTargets, cliTargets)

    if (!filteredTargets.length) {
      console.info(`\n↷ Sync skipped (no targets matched) for context: ${contextName}`)
      continue
    }

    for (const target of filteredTargets) {
      if (target?.active === false) {
        console.info(`\n↷ Sync skipped (target inactive): ${target?.name || 'sync-target'}`)
        continue
      }
      const rootOverride = resolveSourceRoot(root, target)
      const destRoot = resolveDestRoot({ cfg, context, target, destinations, cliDestination })
      const projects = normalizeProjects(target)
      const filteredProjects = filterByNames(projects, cliProjects)
      if (!filteredProjects.length) {
        if (cliProjects.length) {
          console.info(`\n↷ Sync skipped (no projects matched): ${target?.name || 'sync-target'}`)
          continue
        }
      }
      const projectsToRun = filteredProjects.length ? filteredProjects : projects
      if (!projectsToRun.length) throw new Error(`Target "${target?.name || 'sync-target'}" missing dest/projects`)

      for (const project of projectsToRun) {
        const name = project?.name || target?.name || project?.dest || 'sync-target'
        if (project?.active === false) {
          console.info(`\n↷ Sync skipped (project inactive): ${name}`)
          continue
        }
        const dest = resolveDestPath(project?.dest, destRoot, 'dest')
        if (!dest) throw new Error(`Target "${name}" missing dest`)

        const mode = normalizeMode(project?.mode ?? target?.mode)
        const dryRun =
          cliDryRunOverride !== undefined
            ? cliDryRunOverride
            : (project?.dryRun === undefined
                ? (target?.dryRun === undefined ? defaultDryRun : Boolean(target?.dryRun))
                : Boolean(project?.dryRun))
        const include = [...toArray(target?.include), ...toArray(project?.include)].filter(Boolean)
        const exclude = [...globalExclude, ...toArray(target?.exclude), ...toArray(project?.exclude)].filter(Boolean)
        const includeMode = resolveIncludeMode(project, target, cfg)
        const seedConfig = resolveSeedConfig(project, target, cfg)
        const itemize = resolveFlag(cliItemize, project?.itemize, target?.itemize, cfg?.itemize)
        const checksum = resolveFlag(cliChecksum, project?.checksum, target?.checksum, cfg?.checksum)
        const listChanges = resolveFlag(cliListChanges, project?.listChanges, target?.listChanges, cfg?.listChanges)
        const logFile = resolveLogFile(cliLogFile, project?.logFile, target?.logFile, defaultLogFile)
        const effectiveDryRun = listChanges ? true : dryRun
        const effectiveItemize = listChanges ? true : itemize

        console.info(`\n→ Sync: ${name}`)
        console.info(`  context: ${contextName}`)
        console.info(`  root: ${rootOverride}`)
        console.info(`  dest: ${dest}`)
        if (destRoot) console.info(`  destRoot: ${destRoot}`)
        console.info(`  mode: ${mode}`)
        console.info(`  dryRun: ${effectiveDryRun}`)
        if (include.length) console.info(`  include: ${include.length} patterns`)
        if (exclude.length) console.info(`  exclude: ${exclude.length} patterns`)
        if (includeMode) console.info(`  includeMode: ${includeMode}`)
        if (effectiveItemize) console.info('  itemize: true')
        if (checksum) console.info('  checksum: true')
        if (listChanges) console.info('  listChanges: true')
        if (logFile) console.info(`  logFile: ${logFile}`)
        if (seedConfig?.appConfig) console.info('  seed: app.config.yaml')

        await ensureDir(dest)
        const packageJsonConfig = resolvePackageJsonConfig(project, target, cfg)
        const destPackageJson = path.join(dest, 'package.json')
        const hasDestPackageJson = existsSync(destPackageJson)
        if (hasDestPackageJson && !packageJsonConfig && !exclude.includes('package.json')) {
          exclude.push('package.json')
        }
        const args = buildRsyncArgs({
          mode,
          include,
          exclude,
          includeMode,
          root: rootOverride,
          dest,
          dryRun: effectiveDryRun,
          itemize: effectiveItemize,
          checksum,
          listChanges,
        })
        const captureOutput = Boolean(logFile) || listChanges
        const result = spawnSync('rsync', args, captureOutput ? { encoding: 'utf8' } : { stdio: 'inherit' })
        if (captureOutput) {
          const stdout = result.stdout || ''
          const stderr = result.stderr || ''
          if (listChanges) {
            const lines = filterChangeLines(stdout)
            if (lines.length) {
              process.stdout.write(`\nChanged files (${name}):\n`)
              process.stdout.write(`${lines.join('\n')}\n`)
            } else {
              process.stdout.write(`\nChanged files (${name}): none\n`)
            }
            if (logFile) {
              const header = `\n# Changed files: ${name}\n# context: ${contextName}\n# root: ${rootOverride}\n# dest: ${dest}\n`
              appendLog(logFile, header)
              appendLog(logFile, `${lines.join('\n')}\n`)
            }
          } else {
            if (stdout) process.stdout.write(stdout)
            if (stderr) process.stderr.write(stderr)
            const header = `\n# Sync: ${name}\n# context: ${contextName}\n# root: ${rootOverride}\n# dest: ${dest}\n# mode: ${mode}\n# dryRun: ${effectiveDryRun}\n# itemize: ${effectiveItemize}\n# checksum: ${checksum}\n`
            appendLog(logFile, header)
            if (stdout) appendLog(logFile, stdout)
            if (stderr) appendLog(logFile, stderr)
          }
        }
        if (result.status !== 0) {
          throw new Error(`rsync failed for target "${name}"`)
        }

        if (seedConfig?.appConfig) {
          await seedAppConfig({ rootOverride, dest, seedConfig })
        }

        if (packageJsonConfig && !isPackageJsonExcluded(exclude)) {
          const sourcePackageJson = path.join(rootOverride, 'package.json')
          mergePackageJson({
            sourcePath: sourcePackageJson,
            destPath: destPackageJson,
            preserve: packageJsonConfig.preserve,
          })
        }
      }
    }
  }
}

run().catch((error) => {
  console.error(`\nSync failed: ${error?.message || error}`)
  process.exit(1)
})
