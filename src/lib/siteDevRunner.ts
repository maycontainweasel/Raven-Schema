import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';

const DEV_RUNNER_RELATIVE_PATH = 'scripts/schema-dev.mjs';

const DEV_RUNNER_SOURCE = `#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const appRoot = resolve(dirname(scriptPath), '..')

function decodeCommand(argv) {
  const prefix = '--command-base64='
  const encoded = argv.find((entry) => entry.startsWith(prefix))
  if (!encoded) return null
  try {
    return Buffer.from(encoded.slice(prefix.length), 'base64').toString('utf8').trim()
  } catch {
    return null
  }
}

function stripWrappingQuotes(value) {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function readSiteUrlFromDotEnv() {
  const envPath = resolve(appRoot, '.env')
  if (!existsSync(envPath)) return null
  const raw = readFileSync(envPath, 'utf8')
  const lines = raw.split(/\\r?\\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    if (key !== 'NUXT_SITEURL') continue
    const value = stripWrappingQuotes(trimmed.slice(separator + 1).trim())
    return value || null
  }
  return null
}

const command = decodeCommand(process.argv.slice(2))
if (!command) {
  console.error('schema-dev: missing --command-base64')
  process.exit(1)
}

const siteUrl = readSiteUrlFromDotEnv()
if (siteUrl) {
  console.log('')
  console.log('Schema dev URL:', siteUrl)
  console.log('')
}

const child = spawn(command, {
  cwd: appRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('error', (error) => {
  console.error('schema-dev: failed to start dev command')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
`;

export async function ensureSiteDevRunner(appRoot: string): Promise<void> {
  const scriptPath = path.join(appRoot, DEV_RUNNER_RELATIVE_PATH);
  const current = await readFile(scriptPath, 'utf-8').catch(() => null);
  if (current === DEV_RUNNER_SOURCE) return;
  await mkdir(path.dirname(scriptPath), { recursive: true });
  await writeFile(scriptPath, DEV_RUNNER_SOURCE, 'utf-8');
}

export function applySiteDevRunner(command: string | null | undefined): string | null {
  const rawCommand = unwrapSiteDevRunner(command) ?? command ?? null;
  if (!rawCommand) return null;
  const trimmed = rawCommand.trim();
  if (!trimmed) return null;
  return wrapSiteDevRunner(trimmed);
}

export function isSiteDevRunner(command: string | null | undefined): boolean {
  return typeof command === 'string' && command.includes('schema-dev.mjs');
}

function wrapSiteDevRunner(command: string): string {
  const encoded = Buffer.from(command, 'utf-8').toString('base64');
  return `node ./${toPosixPath(DEV_RUNNER_RELATIVE_PATH)} --command-base64=${encoded}`;
}

function unwrapSiteDevRunner(command: string | null | undefined): string | null {
  if (!command) return null;
  const match = command.match(/schema-dev\\.mjs\\s+--command-base64=([A-Za-z0-9+/=]+)/);
  if (!match) return null;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8').trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}
