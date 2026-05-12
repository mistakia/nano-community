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

// Delta-mode configuration. --delta does NOT include accounts_meta (the
// legacy archive-mysql cron only handled 4 tables; accounts_meta has its own
// upstream refresh path).
const DELTA_RUN_ORDER = [
  'posts',
  'representatives_telemetry_index',
  'representatives_telemetry',
  'representatives_uptime'
]

const TIME_COLUMN = {
  posts: 'created_at',
  representatives_telemetry_index: 'timestamp',
  representatives_telemetry: 'timestamp',
  representatives_uptime: 'timestamp'
}

// Retention windows transcribed verbatim from the legacy scripts/archive-mysql.mjs.
// Rows on VPS older than (NOW() - retention) are deleted after PG insert succeeds.
const RETENTION_HOURS = {
  posts: 6 * 7 * 24,
  representatives_telemetry_index: 6 * 7 * 24,
  representatives_telemetry: 6 * 7 * 24,
  representatives_uptime: 12 * 7 * 24
}

// Delta-mode VPS delete batch size (rows per DELETE batch). Matches legacy.
const VPS_DELETE_BATCH = 20000

// Wall-clock budget for the VPS-delete phase per table per run. The first
// catch-up after a long stall (e.g. uptime backlog of 60M+ rows) would
// otherwise hold the flock for many hours; capping ensures the daily cron
// completes within a reasonable window. Subsequent daily runs chip at the
// backlog until it is exhausted; once caught up, steady-state runs delete a
// single day of accumulation and finish well under the cap.
const VPS_DELETE_WALLTIME_MS = 60 * 60 * 1000

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

// VPS production MySQL via the storage-side tunnel (config.mysql, port 13306).
// Delta mode reads from here; the bulk migrator read from storage_mysql.
async function openVpsMysqlReader() {
  const base = config.mysql.connection
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

// Delta-mode telemetry_index pre-pass: builds node_id -> account map from
// live PG representatives_telemetry, which carries full history. The bulk path
// builds the same map from storage MySQL; VPS-side telemetry only carries the
// 6-week active retention, so we read PG instead.
async function buildNodeAccountMapPg(pgClient) {
  logger('delta pre-pass: building node_id -> account map from public.representatives_telemetry')
  const t0 = Date.now()
  const map = new Map()
  const res = await pgClient.query(
    'SELECT DISTINCT account, node_id FROM public.representatives_telemetry WHERE account IS NOT NULL'
  )
  for (const row of res.rows) {
    if (!map.has(row.node_id)) map.set(row.node_id, row.account)
  }
  logger(`delta pre-pass: ${map.size.toLocaleString()} entries in ${Date.now() - t0}ms`)
  return map
}

async function deleteVpsByRetention(vpsConn, table, opts) {
  const timeCol = TIME_COLUMN[table]
  const retentionHours = RETENTION_HOURS[table]
  if (opts.skipVpsDelete) {
    logger(`${table}: --skip-vps-delete -- skipping VPS retention prune`)
    return 0
  }
  const cutoffSql = `UNIX_TIMESTAMP(NOW() - INTERVAL ${retentionHours} HOUR)`
  // Stale timestamps grouped (mirrors archive-mysql.mjs). Batch by row count.
  const [stale] = await vpsConn.query(
    `SELECT \`${timeCol}\` AS ts, COUNT(*) AS n FROM \`${table}\` ` +
    `WHERE \`${timeCol}\` < ${cutoffSql} GROUP BY \`${timeCol}\` ORDER BY \`${timeCol}\` ASC`
  )
  if (!stale.length) {
    logger(`${table}: VPS prune -- nothing older than ${retentionHours / 24}d`)
    return 0
  }
  let batch = []
  let batchN = 0
  let deletedTotal = 0
  const tDeleteStart = Date.now()
  let timeBudgetExceeded = false
  const flush = async () => {
    if (!batch.length) return
    const [res] = await vpsConn.query(
      `DELETE FROM \`${table}\` WHERE \`${timeCol}\` IN (?)`,
      [batch]
    )
    deletedTotal += res.affectedRows
    logger(`${table}: VPS deleted ${res.affectedRows} rows across ${batch.length} timestamps (running total ${deletedTotal})`)
    batch = []
    batchN = 0
  }
  for (const row of stale) {
    if (batchN + Number(row.n) > VPS_DELETE_BATCH && batch.length) {
      await flush()
      if (Date.now() - tDeleteStart >= VPS_DELETE_WALLTIME_MS) {
        timeBudgetExceeded = true
        break
      }
    }
    batch.push(row.ts)
    batchN += Number(row.n)
  }
  if (!timeBudgetExceeded) await flush()
  if (timeBudgetExceeded) {
    logger(`${table}: VPS retention prune stopped at wall-clock budget (${VPS_DELETE_WALLTIME_MS / 1000}s); deleted ${deletedTotal} rows; backlog continues next run`)
  } else {
    logger(`${table}: VPS retention prune complete, deleted ${deletedTotal} rows`)
  }
  return deletedTotal
}

async function runTableDelta(table, vpsConn, pgClient, opts, nodeAccountMap) {
  const cols = TABLE_COLUMNS[table]
  if (!cols) throw new Error(`unknown table: ${table}`)
  const timeCol = TIME_COLUMN[table]
  if (!timeCol) throw new Error(`no TIME_COLUMN for ${table}`)
  const pgColList = cols.map((c) => `"${c}"`).join(',')
  const mysqlColList = cols.map((c) => '`' + c + '`').join(',')

  // Bootstrap watermark if NULL.
  let watermark
  const sw = await pgClient.query(
    'SELECT last_max_ts FROM public.etl_state WHERE table_name = $1', [table]
  )
  if (sw.rowCount === 0 || sw.rows[0].last_max_ts == null) {
    const r = await pgClient.query(
      `SELECT MAX("${timeCol}")::bigint AS m FROM public."${table}"`
    )
    watermark = Number(r.rows[0].m || 0)
    await pgClient.query(
      `INSERT INTO public.etl_state (table_name, last_max_ts)
       VALUES ($1, $2)
       ON CONFLICT (table_name) DO UPDATE SET last_max_ts = EXCLUDED.last_max_ts`,
      [table, watermark]
    )
    logger(`${table}: bootstrapped watermark from PG MAX(${timeCol}) = ${watermark}`)
  } else {
    watermark = Number(sw.rows[0].last_max_ts)
    logger(`${table}: resumed watermark = ${watermark}`)
  }

  const isIndex = table === 'representatives_telemetry_index'
  const t0 = Date.now()
  let rowsRead = 0
  let runningMax = watermark
  let rowsInserted = 0
  let liveBefore = 0
  let liveAfter = 0

  await pgClient.query('BEGIN')
  let committed = false
  try {
    await pgClient.query('SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction TO 0')
    await pgClient.query(
      `CREATE TEMP TABLE _stage (LIKE public."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`
    )

    const copyStream = pgClient.query(pgCopyStreams.from(
      `COPY _stage (${pgColList}) FROM STDIN WITH (FORMAT text)`
    ))

    const mysqlStream = vpsConn.connection
      .query('SELECT ' + mysqlColList + ' FROM `' + table + '` WHERE `' + timeCol + '` > ?', [watermark])
      .stream({ highWaterMark: 50000 })

    let lastLogged = 0
    const transform = new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      transform(row, _enc, cb) {
        if (table === 'posts' && row.social_score != null) {
          row.social_score = Math.floor(Number(row.social_score))
        }
        if (isIndex && nodeAccountMap && (row.account === null || row.account === undefined)) {
          if (nodeAccountMap.has(row.node_id)) row.account = nodeAccountMap.get(row.node_id)
        }
        const ts = Number(row[timeCol])
        if (Number.isFinite(ts) && ts > runningMax) runningMax = ts
        rowsRead++
        if (rowsRead - lastLogged >= 500_000) {
          const elapsed = (Date.now() - t0) / 1000
          logger(`${table}: delta ${rowsRead.toLocaleString()} rows streamed @ ${Math.round(rowsRead / elapsed).toLocaleString()} rows/s`)
          lastLogged = rowsRead
        }
        cb(null, rowToTsv(row, cols))
      }
    })

    await pipeline(mysqlStream, transform, copyStream)
    logger(`${table}: delta COPY done -- ${rowsRead.toLocaleString()} rows into _stage in ${Date.now() - t0}ms`)

    if (opts.dryRun) {
      logger(`${table}: --dry-run -- ROLLBACK`)
      await pgClient.query('ROLLBACK')
      committed = true
    } else {
      const before = await pgClient.query(`SELECT count(*)::bigint AS c FROM public."${table}"`)
      liveBefore = Number(before.rows[0].c)
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
           SET last_max_ts = $2,
               rows_extracted = rows_extracted + $3,
               rows_inserted = rows_inserted + $4,
               completed_at = NOW(),
               notes = $5
         WHERE table_name = $1`,
        [table, runningMax, rowsRead, rowsInserted,
         `delta live_before=${liveBefore} live_after=${liveAfter}`]
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

  // Post-commit: VPS retention prune (skipped on dry-run).
  let vpsDeleted = 0
  if (!opts.dryRun) {
    vpsDeleted = await deleteVpsByRetention(vpsConn, table, opts)
  }

  const tookMs = Date.now() - t0
  logger(
    `${table}: DELTA extracted=${rowsRead.toLocaleString()} inserted=${rowsInserted.toLocaleString()} ` +
    `live_before=${liveBefore.toLocaleString()} live_after=${liveAfter.toLocaleString()} ` +
    `watermark=${runningMax} vps_deleted=${vpsDeleted.toLocaleString()} took=${tookMs}ms` +
    (opts.dryRun ? ' [dry-run]' : '')
  )

  return {
    table,
rows_extracted: rowsRead,
rows_inserted: rowsInserted,
    live_before: liveBefore,
live_after: liveAfter,
    watermark_after: runningMax,
vps_deleted: vpsDeleted,
    took_ms: tookMs,
dry_run: !!opts.dryRun
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv)).argv
  const opts = {
    onlyTable: argv.onlyTable || null,
    dryRun: !!argv.dryRun,
    resumeFrom: argv.resumeFrom || null,
    delta: !!argv.delta,
    skipVpsDelete: !!argv.skipVpsDelete
  }

  const baseOrder = opts.delta ? DELTA_RUN_ORDER : RUN_ORDER
  let order = baseOrder.slice()
  if (opts.onlyTable) {
    if (!baseOrder.includes(opts.onlyTable)) {
      throw new Error(`--only-table=${opts.onlyTable} is not in ${opts.delta ? 'DELTA_RUN_ORDER' : 'RUN_ORDER'}`)
    }
    order = [opts.onlyTable]
  } else if (opts.resumeFrom) {
    const i = baseOrder.indexOf(opts.resumeFrom)
    if (i < 0) throw new Error(`--resume-from=${opts.resumeFrom} is not in ${opts.delta ? 'DELTA_RUN_ORDER' : 'RUN_ORDER'}`)
    order = baseOrder.slice(i)
  }

  logger(
    `archive-to-postgres starting: mode=${opts.delta ? 'delta' : 'bulk'} order=[${order.join(', ')}] ` +
    `dry_run=${opts.dryRun} (lockfile=${LOCKFILE}, expected to be held by wrapper flock -n)`
  )
  const tStart = Date.now()

  const mysqlConn = opts.delta ? await openVpsMysqlReader() : await openMysqlReader()
  const pgClient = await openPgWriter()
  // Telemetry-index pre-pass map: built once if delta + index is in scope.
  let nodeAccountMap = null
  if (opts.delta && order.includes('representatives_telemetry_index')) {
    nodeAccountMap = await buildNodeAccountMapPg(pgClient)
  }
  const summaries = []
  let failed = null
  try {
    for (const table of order) {
      try {
        const runner = opts.delta ? runTableDelta : runTable
        const args = opts.delta
          ? [table, mysqlConn, pgClient, opts, nodeAccountMap]
          : [table, mysqlConn, pgClient, opts]
        summaries.push(await runner(...args))
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
    if (s.watermark_after !== undefined) {
      logger(
        `  ${s.table}: extracted=${s.rows_extracted.toLocaleString()} ` +
        `inserted=${s.rows_inserted.toLocaleString()} ` +
        `vps_deleted=${(s.vps_deleted || 0).toLocaleString()} ` +
        `watermark=${s.watermark_after} took=${s.took_ms}ms` +
        (s.dry_run ? ' [dry-run]' : '')
      )
    } else {
      logger(
        `  ${s.table}: extracted=${s.rows_extracted.toLocaleString()} ` +
        `inserted=${s.rows_inserted.toLocaleString()} took=${s.took_ms}ms ` +
        `rate=${s.rate_rows_per_s.toLocaleString()}rows/s` +
        (s.dry_run ? ' [dry-run]' : '')
      )
    }
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
