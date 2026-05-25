// bin/verify-common.mjs
//
// Shared library for the nano_community_archive verifier suite. Consumed by
// verify-uptime.mjs, verify-telemetry.mjs, verify-telemetry-index.mjs,
// verify-posts.mjs, verify-dump.mjs.
//
// Plan: user:task/homelab/verify-nano-community-csv-ingestion.md

import { createReadStream } from 'node:fs'
import { appendFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

import debug from 'debug'
import mysql from 'mysql2/promise'
import pg from 'pg'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import config from '#config'

const logger = debug('verify-common')
debug.enable('verify-common,verify-*')

export const BACKUPS_ROOT = '/mnt/md0/backups/servers/nano-community/backups'
export const LEDGER_ROOT = '/tmp/verify-ledger'

// Exit codes: 0 verified-safe, 1 partial, 2 diverged, 3 setup error.
export const EXIT_SAFE = 0
export const EXIT_PARTIAL = 1
export const EXIT_DIVERGED = 2
export const EXIT_SETUP = 3

// Cluster file-name patterns. Matches the inventory in the verify task.
export const CLUSTER_PATTERNS = {
  'representatives-uptime': /^representatives-uptime-archive_.*\.csv$/,
  'representatives-telemetry': /^representatives-telemetry-archive_.*\.csv$/,
  'representatives-telemetry-index': /^representatives-telemetry-index-archive_.*\.csv$/,
  posts: /^posts-archive_.*\.csv$/
}

// Canonical PG column ordinals -- transcribed verbatim from
// db/schema.archive.postgres.sql so COPY column lists match.
export const TABLE_COLUMNS = {
  representatives_uptime: ['account', 'online', 'timestamp'],
  representatives_telemetry: [
    'account', 'weight', 'block_count', 'block_behind', 'cemented_count',
    'cemented_behind', 'account_count', 'unchecked_count', 'bandwidth_cap',
    'peer_count', 'protocol_version', 'uptime', 'major_version',
    'minor_version', 'patch_version', 'pre_release_version', 'maker',
    'node_id', 'address', 'port', 'telemetry_timestamp', 'timestamp'
  ],
  representatives_telemetry_index: [
    'account', 'weight', 'block_count', 'block_behind', 'cemented_count',
    'cemented_behind', 'account_count', 'unchecked_count', 'bandwidth_cap',
    'peer_count', 'protocol_version', 'uptime', 'major_version',
    'minor_version', 'patch_version', 'pre_release_version', 'maker',
    'node_id', 'address', 'port', 'telemetry_timestamp', 'timestamp'
  ],
  posts: [
    'id', 'pid', 'sid', 'title', 'url', 'content_url', 'author', 'authorid',
    'text', 'html', 'summary', 'score', 'social_score', 'created_at', 'updated_at'
  ]
}

// Cluster -> live PG table the anti-join targets. telemetry-index verifies
// against representatives_telemetry history (cache-redundancy check).
export const CLUSTER_TARGETS = {
  'representatives-uptime': 'representatives_uptime',
  'representatives-telemetry': 'representatives_telemetry',
  'representatives-telemetry-index': 'representatives_telemetry',
  posts: 'posts'
}

export async function createPgClient() {
  if (!config.archive_postgres || !config.archive_postgres.connection) {
    throw new Error('config.archive_postgres.connection missing -- check config.production.js')
  }
  const client = new pg.Client(config.archive_postgres.connection)
  await client.connect()
  return client
}

export async function createMysqlReader(connectionOverrides = {}) {
  if (!config.storage_mysql || !config.storage_mysql.connection) {
    throw new Error('config.storage_mysql.connection missing -- check config.production.js')
  }
  return mysql.createConnection({
    ...config.storage_mysql.connection,
    decimalNumbers: false,
    ...connectionOverrides
  })
}

export function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const s = createReadStream(path)
    s.on('error', reject)
    s.on('data', (b) => hash.update(b))
    s.on('end', () => resolve(hash.digest('hex')))
  })
}

// Read the first line of a CSV and parse the header (RFC4180-ish: comma sep,
// optional double-quote wrap, no embedded line breaks in quoted fields here
// because nano-community CSVs don't carry them in headers).
export async function sniffCsvDialect(path) {
  const buf = await readFirstChunk(path, 8192)
  // Detect line ending from first occurrence of \n.
  const nlIdx = buf.indexOf('\n')
  if (nlIdx < 0) {
    throw new Error(`sniff: no newline in first 8 KB of ${path}`)
  }
  const headerRaw = buf.slice(0, nlIdx).replace(/\r$/, '')
  const lineEnding = buf.slice(0, nlIdx + 1).endsWith('\r\n') ? 'CRLF' : 'LF'
  const header = parseCsvLine(headerRaw)
  return {
    path,
    line_ending: lineEnding,
    quote_char: '"',
    header,
    column_count: header.length
  }
}

async function readFirstChunk(path, n) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    const s = createReadStream(path, { start: 0, end: n - 1 })
    s.on('error', reject)
    s.on('data', (b) => {
      chunks.push(b)
      total += b.length
    })
    s.on('end', () => resolve(Buffer.concat(chunks, total).toString('utf8')))
  })
}

function parseCsvLine(line) {
  // Minimal CSV line parser: handles double-quote-wrapped fields with "" escapes.
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

// PG TEXT escape (lifted from archive-to-postgres.mjs). NUL byte stripped.
let _nul_strip_count = 0
export function pgEscape(v) {
  if (v === null || v === undefined) return '\\N'
  if (typeof v === 'number') return String(v)
  if (Buffer.isBuffer(v)) v = v.toString('utf8')
  let s = String(v)
  if (s.indexOf('\u0000') >= 0) {
    _nul_strip_count++
    s = s.split('\u0000').join('')
  }
  if (s.indexOf('\\') >= 0) s = s.replace(/\\/g, '\\\\')
  if (s.indexOf('\n') >= 0) s = s.replace(/\n/g, '\\n')
  if (s.indexOf('\r') >= 0) s = s.replace(/\r/g, '\\r')
  if (s.indexOf('\t') >= 0) s = s.replace(/\t/g, '\\t')
  return s
}

export function rowToTsv(row, cols) {
  const out = new Array(cols.length)
  for (let i = 0; i < cols.length; i++) out[i] = pgEscape(row[cols[i]])
  return out.join('\t') + '\n'
}

export function nulStripCount() {
  return _nul_strip_count
}

export async function listClusterFiles(cluster) {
  const re = CLUSTER_PATTERNS[cluster]
  if (!re) throw new Error(`unknown cluster: ${cluster}`)
  const all = await readdir(BACKUPS_ROOT)
  return all.filter((f) => re.test(f)).map((f) => `${BACKUPS_ROOT}/${f}`).sort()
}

// Ledger writer: appends Markdown row + JSONL stdout. Schema matches the plan's
// 14-column ledger: file, sha256, table, rows, min_ts, max_ts, pk_used,
// column_delta, anti_join_count, live_count_in_window, classification, notes,
// verified_at, operator.
export async function openLedger(cluster) {
  const path = `${LEDGER_ROOT}/${cluster}.md`
  await mkdir(dirname(path), { recursive: true })
  const header = await safeFirstLine(path)
  if (!header) {
    const head = [
      `# Verify ledger: ${cluster}`,
      '',
      '| file | sha256 | table | rows | min_ts | max_ts | pk_used | column_delta | anti_join_count | live_count_in_window | classification | notes | verified_at | operator |',
      '| --- | --- | --- | ---: | ---: | ---: | --- | --- | ---: | ---: | --- | --- | --- | --- |',
      ''
    ].join('\n')
    await appendFile(path, head)
  }
  return {
    path,
    async appendRow(row) {
      const cells = [
        row.file ?? '',
        (row.sha256 ?? '').slice(0, 12),
        row.table ?? '',
        row.rows ?? '',
        row.min_ts ?? '',
        row.max_ts ?? '',
        row.pk_used ?? '',
        row.column_delta ?? '',
        row.anti_join_count ?? '',
        row.live_count_in_window ?? '',
        row.classification ?? '',
        (row.notes ?? '').replace(/\|/g, '/'),
        row.verified_at ?? new Date().toISOString(),
        row.operator ?? (process.env.USER || 'unknown')
      ]
      await appendFile(path, '| ' + cells.join(' | ') + ' |\n')
      process.stdout.write(JSON.stringify({ cluster, ...row }) + '\n')
    }
  }
}

async function safeFirstLine(path) {
  try {
    const buf = await readFile(path, 'utf8')
    return buf.split('\n', 1)[0]
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

// Off-host: HTTPS + X-Signal-Secret because this submodule lacks the #base/* import alias.
export async function notifyDiscord(text) {
  const base_url = process.env.BASE_API_URL
  const secret = process.env.BASE_SIGNAL_SECRET
  if (!base_url || !secret) {
    logger(
      'BASE_API_URL/BASE_SIGNAL_SECRET not set; skipping signal emit: %s',
      text.slice(0, 80)
    )
    return false
  }
  const script_name = (process.argv[1] || 'verify-common')
    .split('/')
    .pop()
    .replace(/\.mjs$/, '')
  const source = `user:repository/active/nano-community/bin/${script_name}.mjs`
  const tag_match = text.match(/^\s*\[(OK|PARTIAL|DIVERGED|ERROR|FAIL|WARN)\]/i)
  const tag = tag_match ? tag_match[1].toUpperCase() : null
  let kind = 'pipeline_failure'
  let severity = 'medium'
  let dedup_key = `pipeline_failure:nano-community:${script_name}`
  if (tag === 'OK') {
    kind = 'pipeline_success'
    severity = 'low'
    dedup_key = `pipeline_success:nano-community:${script_name}`
  } else if (tag === 'DIVERGED' || tag === 'ERROR' || tag === 'FAIL') {
    severity = 'high'
  } else if (tag === 'WARN' || tag === 'PARTIAL') {
    severity = 'medium'
  }
  const title = text.split('\n')[0].slice(0, 200)
  try {
    const res = await fetch(
      `${base_url.replace(/\/$/, '')}/api/signals/`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signal-secret': secret
        },
        body: JSON.stringify({
          source,
          kind,
          severity,
          title,
          payload: { full_text: text.slice(0, 4000) },
          dedup_key
        }),
        signal: AbortSignal.timeout(10000)
      }
    )
    if (!res.ok) {
      logger('signal emit returned %s', res.status)
      await res.text().catch(() => {})
      return false
    }
    await res.text().catch(() => {})
    return true
  } catch (e) {
    logger('signal emit error: %s', e.message)
    return false
  }
}

// CLI: --selftest <csv>  open PG, sniff CSV, ping Discord
//      --validate-cluster <cluster>  walk every CSV in cluster, sniff headers,
//                                    report column-shape distribution.

async function cliSelftest(csv) {
  const client = await createPgClient()
  try {
    const r = await client.query('SELECT current_database() AS db, version() AS version')
    logger('PG ok: %s @ %s', r.rows[0].db, r.rows[0].version.split(',')[0])
  } finally {
    await client.end()
  }
  const dialect = await sniffCsvDialect(csv)
  logger('CSV ok: %s (%d cols, %s line endings)', csv, dialect.column_count, dialect.line_ending)
  logger('Header: %s', dialect.header.join(','))
  const sha = await sha256File(csv)
  logger('sha256: %s', sha)
  const dn = await notifyDiscord(`verify-common selftest ok: ${csv} (${dialect.column_count} cols, sha=${sha.slice(0, 12)})`)
  logger('Discord notify: %s', dn ? 'sent' : 'skipped/failed')
  return EXIT_SAFE
}

async function cliValidateCluster(cluster) {
  const files = await listClusterFiles(cluster)
  if (files.length === 0) {
    logger('cluster %s: no files matched in %s', cluster, BACKUPS_ROOT)
    return EXIT_SETUP
  }
  const shapes = new Map()
  const anomalous = []
  for (const f of files) {
    try {
      const d = await sniffCsvDialect(f)
      const key = `${d.column_count}-col`
      shapes.set(key, (shapes.get(key) || 0) + 1)
      if (cluster === 'representatives-telemetry' || cluster === 'representatives-telemetry-index') {
        if (d.column_count !== 20 && d.column_count !== 21) {
          anomalous.push({ file: f, column_count: d.column_count, header: d.header })
        }
      } else if (cluster === 'representatives-uptime' && d.column_count !== 3) {
        anomalous.push({ file: f, column_count: d.column_count, header: d.header })
      } else if (cluster === 'posts' && d.column_count !== 15) {
        anomalous.push({ file: f, column_count: d.column_count, header: d.header })
      }
    } catch (e) {
      anomalous.push({ file: f, error: e.message })
    }
  }
  const ledger = await openLedger(cluster)
  const dist = JSON.stringify(Object.fromEntries(shapes))
  await ledger.appendRow({
    file: `validate-cluster:${cluster}`,
    table: '(headers)',
    rows: files.length,
    column_delta: dist,
    classification: anomalous.length === 0 ? 'shape-ok' : 'shape-anomalous',
    notes: anomalous.length === 0
      ? `n=${files.length} ${dist}`
      : `n=${files.length} ${dist} anomalous=${anomalous.slice(0, 5).map((a) => `${a.file.split('/').pop()}:${a.column_count ?? a.error}`).join(',')}`
  })
  logger('cluster %s shape distribution: %s (n=%d)', cluster, dist, files.length)
  if (anomalous.length > 0) {
    logger('anomalous files (%d): %j', anomalous.length, anomalous.slice(0, 5))
    return EXIT_PARTIAL
  }
  return EXIT_SAFE
}

if (isMain(import.meta.url)) {
  const argv = yargs(hideBin(process.argv))
    .option('selftest', { type: 'string', describe: 'Path to a sample CSV; opens PG, sniffs file, pings Discord' })
    .option('validate-cluster', { type: 'string', describe: 'Cluster name; walks every CSV and reports column-shape distribution', choices: Object.keys(CLUSTER_PATTERNS) })
    .strict()
    .argv
  ;(async () => {
    let code = EXIT_SAFE
    if (argv.selftest) {
      code = await cliSelftest(argv.selftest)
    } else if (argv['validate-cluster']) {
      code = await cliValidateCluster(argv['validate-cluster'])
    } else {
      logger('verify-common: library module; pass --selftest <csv> or --validate-cluster <cluster> to run a CLI mode')
      code = EXIT_SETUP
    }
    process.exitCode = code
  })().catch((e) => {
    logger('fatal: %s', e.stack || e.message)
    process.exitCode = EXIT_SETUP
  })
}
