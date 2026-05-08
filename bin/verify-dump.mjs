// bin/verify-dump.mjs
//
// Verifier for an older mysqldump (.sql). Loads the dump into a transient
// `nano_verify_tmp` MySQL DB on storage, then for each in-scope history
// table (representatives_telemetry, representatives_uptime, posts):
//   1. Probe the dump's column list via SHOW COLUMNS.
//   2. Stream rows from MySQL via mysql2 into a PG TEMP _stage that mirrors
//      the live target table.
//   3. Run the same bounded anti-join the CSV-cluster verifiers use.
//   4. Append a per-dump ledger row.
// Reference tables (accounts, accounts_meta, accounts_changelog, etc.) get
// row-count snapshots in the ledger as evidence-of-coverage; no anti-join.
//
// Usage: node bin/verify-dump.mjs --dump <path-to-sql> [--import-unmatched]
//        [--keep-mysql] (skip DROP DATABASE at end -- for debugging)
//
// Plan: user:task/homelab/verify-nano-community-csv-ingestion.md

import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

import debug from 'debug'
import mysql from 'mysql2/promise'
import pgCopyStreams from 'pg-copy-streams'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import config from '#config'

import {
  EXIT_PARTIAL,
  EXIT_SAFE,
  EXIT_SETUP,
  TABLE_COLUMNS,
  createPgClient,
  notifyDiscord,
  openLedger,
  pgEscape
} from './verify-common.mjs'

const logger = debug('verify-dump')
debug.enable('verify-common,verify-*')

const TMP_DB = 'nano_verify_tmp'
const HISTORY_TABLES = [
  // table -> { live_pg_table, anti_join_keys, bogus_filter_sql }
  {
    name: 'representatives_uptime',
    live: 'representatives_uptime',
    keys: ['account', 'timestamp'],
    null_safe: [],
    bogus_filter: '"timestamp" > 0'
  },
  {
    name: 'representatives_telemetry',
    live: 'representatives_telemetry',
    keys: ['account', 'node_id', 'timestamp'],
    null_safe: ['account'],
    bogus_filter: '"timestamp" > 0'
  },
  {
    name: 'posts',
    live: 'posts',
    keys: ['url'],
    null_safe: [],
    bogus_filter: 'created_at > 1262304000'
  }
]
const REFERENCE_TABLES = ['accounts', 'accounts_meta', 'accounts_changelog']

function shell(cmd, args, { stdin = null } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: [stdin ? 'pipe' : 'inherit', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 500)}`))
    })
    if (stdin) {
      stdin.pipe(child.stdin)
      stdin.on('error', reject)
    }
  })
}

async function mysqlAdmin(sql) {
  return shell('mysql', ['-N', '-e', sql])
}

async function loadDump(dumpPath) {
  // Storage MySQL is on HDD with default flush semantics; large dump loads
  // are I/O bound on per-transaction fsync. Disable binary logging, unique
  // checks, foreign-key checks and tighten flush behavior for the duration
  // of the load. nano_verify_tmp is transient so durability is moot.
  const initCmd = [
    'SET sql_log_bin=0',
    'SET unique_checks=0',
    'SET foreign_key_checks=0',
    'SET innodb_flush_log_at_trx_commit=0',
    'SET autocommit=1'
  ].join('; ')
  const t0 = Date.now()
  await shell('bash', ['-c', `mysql --init-command='${initCmd}' ${TMP_DB} < ${dumpPath}`])
  return Date.now() - t0
}

async function getMysqlTables(reader) {
  const [rows] = await reader.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [TMP_DB])
  return rows.map((r) => r.table_name || r.TABLE_NAME)
}

async function getMysqlColumns(reader, table) {
  const [rows] = await reader.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`, [TMP_DB, table])
  return rows.map((r) => r.column_name || r.COLUMN_NAME)
}

async function tableRowCount(reader, table) {
  const [rows] = await reader.query(`SELECT count(*) AS n FROM \`${TMP_DB}\`.\`${table}\``)
  return Number(rows[0].n)
}

function rowToTextLine(row, cols) {
  const out = new Array(cols.length)
  for (let i = 0; i < cols.length; i++) out[i] = pgEscape(row[cols[i]])
  return out.join('\t') + '\n'
}

// Stream rows from MySQL `<TMP_DB>.<table>` projected to `cols` (a subset of
// the source columns matching PG's TABLE_COLUMNS) into a PG TEMP _stage via
// pg-copy-streams using TEXT format (consistent with archive-to-postgres.mjs).
async function streamMysqlToStage({ reader, pgClient, mysqlTable, projection, pgTextCols }) {
  const colSql = projection.map((c) => `\`${c}\``).join(', ')
  const stream = reader.connection.query(`SELECT ${colSql} FROM \`${TMP_DB}\`.\`${mysqlTable}\``).stream({ highWaterMark: 50000 })
  const xform = new Transform({
    objectMode: true,
    transform(row, _enc, cb) { cb(null, rowToTextLine(row, projection)) }
  })
  const pgColList = pgTextCols.map((c) => `"${c}"`).join(', ')
  const ingest = pgClient.query(pgCopyStreams.from(`COPY _stage (${pgColList}) FROM STDIN WITH (FORMAT text)`))
  await pipeline(stream, xform, ingest)
  return ingest.rowCount
}

async function verifyHistoryTable({ reader, pgClient, dump, dumpName, table, importMode, ledger }) {
  const present = (await getMysqlTables(reader)).includes(table.name)
  if (!present) {
    logger('dump %s: table %s absent; skipping', dumpName, table.name)
    return null
  }

  const mysqlCols = await getMysqlColumns(reader, table.name)
  const pgCols = TABLE_COLUMNS[table.live]
  // Project only the columns needed for the anti-join (and the bogus-epoch
  // filter / range probe). Full-row projection trips integer-vs-decimal
  // mismatches on columns we don't actually look at (e.g., posts.summary).
  // --import-unmatched paths still want full rows, but the dump branch is
  // verify-only by default; toggling that is a separate task.
  let neededCols
  if (table.live === 'posts') neededCols = ['url', 'created_at']
  else neededCols = [...table.keys] // (account, [node_id,] timestamp)
  const projection = neededCols.filter((c) => mysqlCols.includes(c))
  const missing = neededCols.filter((c) => !mysqlCols.includes(c))
  if (missing.length > 0) {
    logger('dump %s table %s: missing required cols %j; skipping verification', dumpName, table.name, missing)
    await ledger.appendRow({
      file: `dump:${dumpName}#${table.name}`,
      table: table.live,
      classification: 'skipped',
      notes: `missing required cols=${JSON.stringify(missing)} mysql_cols=${mysqlCols.length}`
    })
    return null
  }
  logger('dump %s table %s: mysql cols=%d; projecting key cols=%j', dumpName, table.name, mysqlCols.length, projection)

  const srcCount = await tableRowCount(reader, table.name)
  logger('dump %s table %s: mysql row count = %d', dumpName, table.name, srcCount)

  // Lightweight typed staging table that holds only the anti-join keys.
  await pgClient.query('BEGIN')
  if (table.live === 'posts') {
    await pgClient.query('CREATE TEMP TABLE _stage (url varchar(255), created_at integer) ON COMMIT DROP')
  } else if (table.live === 'representatives_uptime') {
    await pgClient.query('CREATE TEMP TABLE _stage (account character(65), "timestamp" integer) ON COMMIT DROP')
  } else {
    // representatives_telemetry: account + node_id + timestamp
    await pgClient.query('CREATE TEMP TABLE _stage (account character(65), node_id character(65), "timestamp" integer) ON COMMIT DROP')
  }

  const tCopy0 = Date.now()
  const staged = await streamMysqlToStage({ reader, pgClient, mysqlTable: table.name, projection, pgTextCols: projection })
  const tCopy = Date.now() - tCopy0
  logger('dump %s table %s: streamed %d rows to _stage (%.1fs)', dumpName, table.name, staged, tCopy / 1000)

  // Range probe.
  let r
  if (table.live === 'posts') {
    const range = await pgClient.query(
      `SELECT count(*) AS staged, count(DISTINCT url) AS distinct_keys,
              min(created_at) FILTER (WHERE created_at > 1262304000) AS min_ts,
              max(created_at) AS max_ts,
              count(*) FILTER (WHERE created_at <= 0) AS bogus
         FROM _stage`
    )
    r = range.rows[0]
  } else {
    const range = await pgClient.query(
      `SELECT count(*) AS staged,
              count(DISTINCT (${table.keys.map((k) => `"${k}"`).join(', ')})) AS distinct_keys,
              min("timestamp") AS min_ts, max("timestamp") AS max_ts,
              count(*) FILTER (WHERE "timestamp" <= 0) AS bogus
         FROM _stage`
    )
    r = range.rows[0]
  }
  logger('dump %s table %s: stage rows=%s distinct=%s min=%s max=%s bogus=%s', dumpName, table.name, r.staged, r.distinct_keys, r.min_ts, r.max_ts, r.bogus)

  // Anti-join.
  const tAj0 = Date.now()
  let unmatched
  if (table.live === 'posts') {
    const aj = await pgClient.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT url FROM _stage WHERE url IS NOT NULL AND created_at > 1262304000) s
         WHERE NOT EXISTS (SELECT 1 FROM public.${table.live} l WHERE l.url = s.url)`
    )
    unmatched = Number(aj.rows[0].unmatched)
  } else {
    const onParts = table.keys.map((k) => {
      if (table.null_safe.includes(k)) return `l.${k} IS NOT DISTINCT FROM s.${k}`
      return `l.${k} = s.${k}`
    })
    onParts.push('l."timestamp" BETWEEN $1 AND $2')
    const aj = await pgClient.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT ${table.keys.map((k) => `"${k}"`).join(', ')} FROM _stage WHERE "timestamp" > 0) s
         LEFT JOIN public.${table.live} l ON ${onParts.join(' AND ')}
        WHERE l."timestamp" IS NULL`,
      [r.min_ts, r.max_ts]
    )
    unmatched = Number(aj.rows[0].unmatched)
  }
  const tAj = Date.now() - tAj0
  logger('dump %s table %s: anti-join unmatched=%d (%.1fs)', dumpName, table.name, unmatched, tAj / 1000)

  let yearHistogram = null
  if (unmatched > 0) {
    if (table.live === 'posts') {
      const hist = await pgClient.query(
        `SELECT extract(year FROM to_timestamp(s.created_at))::int AS yr, count(*)::bigint AS n
           FROM (SELECT DISTINCT url, min(created_at) AS created_at FROM _stage WHERE url IS NOT NULL AND created_at > 1262304000 GROUP BY url) s
           WHERE NOT EXISTS (SELECT 1 FROM public.${table.live} l WHERE l.url = s.url)
           GROUP BY yr ORDER BY yr`
      )
      yearHistogram = Object.fromEntries(hist.rows.map((row) => [row.yr, Number(row.n)]))
    } else {
      const onParts = table.keys.map((k) => table.null_safe.includes(k) ? `l.${k} IS NOT DISTINCT FROM s.${k}` : `l.${k} = s.${k}`)
      onParts.push('l."timestamp" BETWEEN $1 AND $2')
      const hist = await pgClient.query(
        `SELECT extract(year FROM to_timestamp(s."timestamp"))::int AS yr, count(*)::bigint AS n
           FROM (SELECT DISTINCT ${table.keys.map((k) => `"${k}"`).join(', ')} FROM _stage WHERE "timestamp" > 0) s
           LEFT JOIN public.${table.live} l ON ${onParts.join(' AND ')}
          WHERE l."timestamp" IS NULL
          GROUP BY yr ORDER BY yr`,
        [r.min_ts, r.max_ts]
      )
      yearHistogram = Object.fromEntries(hist.rows.map((row) => [row.yr, Number(row.n)]))
    }
    logger('dump %s table %s: unmatched_by_year=%j', dumpName, table.name, yearHistogram)
  }

  let classification = unmatched === 0 ? 'verified-safe' : 'partial'
  let imported = null

  if (importMode && unmatched > 0) {
    // Dump-branch staging only carries the anti-join keys, so we cannot
    // INSERT full rows from staging. Importing dump rows requires a full-row
    // projection, which lives in a separate task (the dedup follow-up will
    // also drive that). For now, --import-unmatched is a no-op for dumps.
    logger('dump %s table %s: --import-unmatched ignored; full-row projection not implemented in dump branch', dumpName, table.name)
    await pgClient.query('ROLLBACK')
  } else {
    await pgClient.query('ROLLBACK')
  }

  await ledger.appendRow({
    file: `dump:${dumpName}#${table.name}`,
    table: table.live,
    rows: staged,
    min_ts: r.min_ts,
    max_ts: r.max_ts,
    pk_used: table.keys.join(','),
    column_delta: `mysql_cols=${mysqlCols.length} projected=${projection.length} missing_in_dump=${JSON.stringify(missing)}`,
    anti_join_count: unmatched,
    classification,
    notes: `mysql_count=${srcCount} copy_ms=${tCopy} antijoin_ms=${tAj}${yearHistogram ? ' unmatched_by_year=' + JSON.stringify(yearHistogram) : ''}${imported !== null ? ' imported=' + imported : ''}`
  })

  return { unmatched, imported, classification }
}

async function snapshotReferenceTables(reader, dumpName, ledger) {
  const tables = await getMysqlTables(reader)
  for (const t of REFERENCE_TABLES) {
    if (!tables.includes(t)) continue
    try {
      const n = await tableRowCount(reader, t)
      logger('dump %s reference %s: %d rows', dumpName, t, n)
      await ledger.appendRow({
        file: `dump:${dumpName}#${t}`,
        table: `(reference)${t}`,
        rows: n,
        classification: 'snapshot',
        notes: 'reference table; row-count snapshot only, no anti-join'
      })
    } catch (e) {
      logger('dump %s reference %s probe error: %s', dumpName, t, e.message)
    }
  }
}

async function run({ dumpPath, importMode, keepMysql }) {
  const dumpName = basename(dumpPath)
  const dumpStat = await stat(dumpPath)
  logger('verify-dump: %s (%.1f MB)', dumpName, dumpStat.size / 1024 / 1024)

  const ledger = await openLedger('older-dumps')

  // Setup transient MySQL DB.
  await mysqlAdmin(`DROP DATABASE IF EXISTS ${TMP_DB}; CREATE DATABASE ${TMP_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`)
  logger('created MySQL DB %s', TMP_DB)
  const tLoad = await loadDump(dumpPath)
  logger('loaded %s in %.1fs', dumpName, tLoad / 1000)

  const reader = await mysql.createConnection({
    ...config.storage_mysql.connection,
    database: TMP_DB,
    decimalNumbers: false
  })
  reader.connection.config.namedPlaceholders = false

  const pgClient = await createPgClient()

  const verdicts = []
  let exit = EXIT_SAFE
  try {
    for (const table of HISTORY_TABLES) {
      const v = await verifyHistoryTable({ reader, pgClient, dump: dumpPath, dumpName, table, importMode, ledger })
      if (v) {
        verdicts.push({ table: table.name, ...v })
        if (v.unmatched > 0 && !importMode) exit = EXIT_PARTIAL
      }
    }
    await snapshotReferenceTables(reader, dumpName, ledger)
  } catch (e) {
    logger('error: %s', e.stack || e.message)
    await ledger.appendRow({
      file: `dump:${dumpName}`,
      table: '(meta)',
      classification: 'error',
      notes: (e.message || String(e)).slice(0, 200)
    })
    await notifyDiscord(`verify-dump ${dumpName}: error -- ${e.message}`)
    exit = EXIT_SETUP
  } finally {
    await reader.end()
    await pgClient.end()
    if (!keepMysql) {
      try {
        await mysqlAdmin(`DROP DATABASE IF EXISTS ${TMP_DB}`)
        logger('dropped MySQL DB %s', TMP_DB)
      } catch (e) {
        logger('drop database error: %s', e.message)
      }
    }
  }

  logger('verify-dump %s: %j', dumpName, verdicts)
  if (verdicts.some((v) => v.unmatched > 0)) {
    await notifyDiscord(`verify-dump ${dumpName}: ${JSON.stringify(verdicts)}`)
  }
  return exit
}

if (isMain(import.meta.url)) {
  const argv = yargs(hideBin(process.argv))
    .option('dump', { type: 'string', describe: 'Path to .sql dump', demandOption: true })
    .option('import-unmatched', { type: 'boolean', default: false })
    .option('keep-mysql', { type: 'boolean', default: false, describe: 'Skip DROP DATABASE at end (debugging)' })
    .strict()
    .argv
  run({ dumpPath: argv.dump, importMode: argv['import-unmatched'], keepMysql: argv['keep-mysql'] })
    .then((c) => { process.exitCode = c })
    .catch((e) => {
      console.error('fatal:', e.stack || e.message)
      process.exitCode = EXIT_SETUP
    })
}
