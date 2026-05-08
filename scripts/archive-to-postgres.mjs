// archive-to-postgres.mjs
//
// One-shot bulk migration from storage MySQL `nano_development` to the
// PG/Timescale `nano_community_archive` database on database-server.
//
// Strategy: per table, sequential clustered SELECT * (no WHERE, no ORDER BY)
// streamed into a TEMP _stage created via `LIKE public.<t> INCLUDING DEFAULTS`,
// then a single INSERT INTO public.<t> ... SELECT FROM _stage
// ON CONFLICT DO NOTHING. The whole table is one PG transaction; mid-table
// interrupt rolls back via ON COMMIT DROP on _stage.
//
// pg.Client is used directly (not Knex) because COPY is incompatible with
// connection pooling -- COPY needs a single dedicated connection from BEGIN
// through COMMIT.
//
// decimalNumbers: false is set explicitly on the mysql2 connection (the
// production app uses decimalNumbers: true) so numeric(39,0) values
// (representatives_telemetry.weight, accounts_meta.weight/balance) arrive as
// JS strings and survive into PG with full precision.
//
// See:
//   user:task/homelab/etl-nano-community-archive-bulk-migration.md
//   user:text/homelab/nano-community-database-architecture-decision.md

import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import debug from 'debug'
import mysql from 'mysql2/promise'
import pg from 'pg'
import pgCopyStreams from 'pg-copy-streams'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import config from '#config'

const logger = debug('archive-to-pg')
debug.enable('archive-to-pg')

const RUN_ORDER = [
  'posts',
  'representatives_telemetry_index',
  'accounts_meta',
  'representatives_telemetry',
  'representatives_uptime'
]

// Ordinal column lists transcribed verbatim from db/schema.archive.postgres.sql.
// Used for both the SELECT projection against MySQL and the COPY column list
// against PG -- guarantees position match without a sidecar file.
const TABLE_COLUMNS = {
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
  accounts_meta: [
    'account', 'balance', 'block_count', 'weight', 'delegators', 'timestamp'
  ],
  posts: [
    'id', 'pid', 'sid', 'title', 'url', 'content_url', 'author', 'authorid',
    'text', 'html', 'summary', 'score', 'social_score', 'created_at', 'updated_at'
  ]
}

const LOCKFILE = '/tmp/nano-community-archive-mysql.lock' // operator wraps invocation in flock -n

// PG TEXT format escapes: \\, \r, \n, \t; NULL -> \N. Lifted from bench
// extract-subset.mjs (proven against the bench dataset).
// NUL byte (0x00) is stripped: PG TEXT format rejects it and PG text columns
// cannot store it -- some posts.text/html rows from upstream reddit imports
// carry stray NULs from corrupted source text.
let _nul_strip_count = 0
function pgEscape(v) {
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

function rowToTsv(row, cols) {
  const parts = new Array(cols.length)
  for (let i = 0; i < cols.length; i++) parts[i] = pgEscape(row[cols[i]])
  return parts.join('\t') + '\n'
}

async function openMysqlReader() {
  const base = config.storage_mysql.connection
  return mysql.createConnection({
    ...base,
    decimalNumbers: false
  })
}

async function openPgWriter() {
  const client = new pg.Client(config.archive_postgres.connection)
  await client.connect()
  return client
}

// One-time pre-pass for representatives_telemetry_index. Reads distinct
// (account, node_id) pairs from representatives_telemetry where account IS
// NOT NULL, ordered by (account, node_id) to drive an index-only scan over
// the multi-column BTree (cardinalities 326k/2.6M/73M, ~28GB on disk).
// Returns Map<node_id, account>. Budget ~5-10 min wall clock.
async function buildNodeAccountMap(mysqlConn) {
  logger('building node_id -> account map from representatives_telemetry')
  const t0 = Date.now()
  const map = new Map()
  const stream = mysqlConn.connection
    .query(
      'SELECT DISTINCT account, node_id FROM representatives_telemetry ' +
      'WHERE account IS NOT NULL ORDER BY account, node_id'
    )
    .stream({ highWaterMark: 5000 })
  for await (const row of stream) {
    if (!map.has(row.node_id)) map.set(row.node_id, row.account)
  }
  logger(`node_id->account map: ${map.size.toLocaleString()} entries in ${Date.now() - t0}ms`)
  return map
}

async function runTable(table, mysqlConn, pgClient, opts) {
  const cols = TABLE_COLUMNS[table]
  if (!cols) throw new Error(`unknown table: ${table}`)
  const pgColList = cols.map((c) => `"${c}"`).join(',')
  const mysqlColList = cols.map((c) => '`' + c + '`').join(',')

  const isIndex = table === 'representatives_telemetry_index'
  const nodeAccountMap = isIndex ? await buildNodeAccountMap(mysqlConn) : null

  logger(`${table}: starting (dry_run=${!!opts.dryRun})`)
  const t0 = Date.now()

  let rowsExtracted = 0
  let rowsInserted = 0
  let liveBefore = 0
  let liveAfter = 0
  let committed = false

  await pgClient.query('BEGIN')
  try {
    await pgClient.query(
      `INSERT INTO public.etl_state (table_name, started_at, completed_at, notes)
       VALUES ($1, NOW(), NULL, NULL)
       ON CONFLICT (table_name) DO UPDATE
         SET started_at = EXCLUDED.started_at, completed_at = NULL, notes = NULL`,
      [table]
    )

    await pgClient.query(
      `CREATE TEMP TABLE _stage (LIKE public."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`
    )

    const copySql = `COPY _stage (${pgColList}) FROM STDIN WITH (FORMAT text)`
    const copyStream = pgClient.query(pgCopyStreams.from(copySql))

    const mysqlStream = mysqlConn.connection
      .query('SELECT ' + mysqlColList + ' FROM `' + table + '`')
      .stream({ highWaterMark: 50000 })

    let rowsRead = 0
    let lastLogged = 0
    const transform = new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      transform(row, _enc, cb) {
        if (
          isIndex &&
          (row.account === null || row.account === undefined) &&
          nodeAccountMap.has(row.node_id)
        ) {
          row.account = nodeAccountMap.get(row.node_id)
        }
        rowsRead++
        if (rowsRead - lastLogged >= 1_000_000) {
          const elapsed = (Date.now() - t0) / 1000
          logger(
            `${table}: ${rowsRead.toLocaleString()} rows streamed ` +
            `@ ${Math.round(rowsRead / elapsed).toLocaleString()} rows/s`
          )
          lastLogged = rowsRead
        }
        cb(null, rowToTsv(row, cols))
      }
    })

    await pipeline(mysqlStream, transform, copyStream)
    const tCopy = Date.now() - t0
    logger(`${table}: COPY done -- ${rowsRead.toLocaleString()} rows into _stage in ${tCopy}ms`)

    const { rows: extractedRows } = await pgClient.query('SELECT count(*)::bigint AS c FROM _stage')
    rowsExtracted = Number(extractedRows[0].c)

    if (opts.dryRun) {
      logger(`${table}: --dry-run -- ROLLBACK (skip INSERT into public."${table}")`)
      await pgClient.query('ROLLBACK')
      committed = true
    } else {
      const before = await pgClient.query(`SELECT count(*)::bigint AS c FROM public."${table}"`)
      liveBefore = Number(before.rows[0].c)
      logger(`${table}: INSERT _stage -> public."${table}" (live_before=${liveBefore.toLocaleString()})`)
      await pgClient.query(
        `INSERT INTO public."${table}" (${pgColList})
         SELECT ${pgColList} FROM _stage
         ON CONFLICT DO NOTHING`
      )
      const after = await pgClient.query(`SELECT count(*)::bigint AS c FROM public."${table}"`)
      liveAfter = Number(after.rows[0].c)
      rowsInserted = liveAfter - liveBefore

      await pgClient.query(
        `UPDATE public.etl_state
           SET rows_extracted = $2, rows_inserted = $3, completed_at = NOW(),
               notes = $4
         WHERE table_name = $1`,
        [
          table,
          rowsExtracted,
          rowsInserted,
          `live_before=${liveBefore} live_after=${liveAfter}`
        ]
      )
      await pgClient.query('COMMIT')
      committed = true
    }
  } catch (err) {
    if (!committed) {
      try { await pgClient.query('ROLLBACK') } catch { /* ignore */ }
    }
    throw err
  }

  const tookMs = Date.now() - t0
  const rate = Math.round(rowsExtracted / (tookMs / 1000))
  logger(
    `${table}: extracted=${rowsExtracted.toLocaleString()} ` +
    `inserted=${rowsInserted.toLocaleString()} ` +
    `live_before=${liveBefore.toLocaleString()} live_after=${liveAfter.toLocaleString()} ` +
    `took=${tookMs}ms rate=${rate.toLocaleString()}rows/s`
  )

  return {
    table,
    rows_extracted: rowsExtracted,
    rows_inserted: rowsInserted,
    live_before: liveBefore,
    live_after: liveAfter,
    took_ms: tookMs,
    rate_rows_per_s: rate,
    dry_run: !!opts.dryRun
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv)).argv
  const opts = {
    onlyTable: argv.onlyTable || null,
    dryRun: !!argv.dryRun,
    resumeFrom: argv.resumeFrom || null
  }

  let order = RUN_ORDER.slice()
  if (opts.onlyTable) {
    if (!RUN_ORDER.includes(opts.onlyTable)) {
      throw new Error(`--only-table=${opts.onlyTable} is not in RUN_ORDER`)
    }
    order = [opts.onlyTable]
  } else if (opts.resumeFrom) {
    const i = RUN_ORDER.indexOf(opts.resumeFrom)
    if (i < 0) throw new Error(`--resume-from=${opts.resumeFrom} is not in RUN_ORDER`)
    order = RUN_ORDER.slice(i)
  }

  logger(
    `archive-to-postgres starting: order=[${order.join(', ')}] ` +
    `dry_run=${opts.dryRun} (lockfile=${LOCKFILE}, expected to be held by wrapper flock -n)`
  )
  const tStart = Date.now()

  const mysqlConn = await openMysqlReader()
  const pgClient = await openPgWriter()
  const summaries = []
  let failed = null
  try {
    for (const table of order) {
      try {
        summaries.push(await runTable(table, mysqlConn, pgClient, opts))
      } catch (err) {
        logger(`${table}: FAILED -- ${err.message}`)
        console.error(err)
        failed = { table, error: err.message }
        break
      }
    }
  } finally {
    try { await pgClient.end() } catch { /* ignore */ }
    try { await mysqlConn.end() } catch { /* ignore */ }
  }

  const tookMs = Date.now() - tStart
  logger(`archive-to-postgres done in ${tookMs}ms (nul_strip_count=${_nul_strip_count})`)
  for (const s of summaries) {
    logger(
      `  ${s.table}: extracted=${s.rows_extracted.toLocaleString()} ` +
      `inserted=${s.rows_inserted.toLocaleString()} took=${s.took_ms}ms ` +
      `rate=${s.rate_rows_per_s.toLocaleString()}rows/s` +
      (s.dry_run ? ' [dry-run]' : '')
    )
  }

  if (failed) {
    logger(`FAILURE on table=${failed.table}: ${failed.error}`)
    process.exitCode = 1
  }
}

if (isMain(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
