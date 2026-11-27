// archive-to-postgres.mjs
//
// Daily delta from the VPS production database to the PG/Timescale
// `nano_community_archive` database on database-server, run with --delta by
// server/storage-crontab on base-storage.
//
// Per table: read the VPS rows past the table's watermark in
// public.etl_state, COPY them into a TEMP _stage created via
// `LIKE public.<t> INCLUDING DEFAULTS`, then one INSERT INTO public.<t> ...
// SELECT FROM _stage ON CONFLICT DO NOTHING and the watermark advance, all in
// one archive transaction. An interrupt rolls the table back and the next run
// resumes from the same watermark.
//
// The archive stores the VPS columns under the VPS names and types, instants
// as timestamptz. The VPS reader parses nothing: every value travels as the
// server's own text (DateStyle ISO, TimeZone UTC), so sub-second instants and
// numeric(39,0) weights survive exactly. A JS Date would cut an instant to
// milliseconds, and a Number cuts a weight to 53 bits (db/index.mjs installs
// that parser process-wide). The watermark is computed in SQL from _stage for
// the same reason.
//
// pg.Client is used directly (not Knex) because COPY is incompatible with
// connection pooling -- COPY needs a single dedicated connection from BEGIN
// through COMMIT.
//
// See:
//   user:task/homelab/cutover-nano-community-archive-crons.md
//   user:text/homelab/nano-community-database-architecture-decision.md

import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import debug from 'debug'
import pg from 'pg'
import pgCopyStreams from 'pg-copy-streams'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'
import config from '#config'

const logger = debug('archive-to-pg')

// Every table the delta copies, in run order. accounts_meta is not copied:
// its archive rows are the 2026-05 bulk load from MySQL. The VPS collapsed
// representatives_telemetry_index on 2026-05-19; its archive rows remain as
// history.
export const DELTA_RUN_ORDER = [
  'posts',
  'representatives_telemetry',
  'representatives_uptime',
  'network_events',
  'network_event_coverage'
]

// Column lists, as in db/schema.archive.postgres.sql and the VPS schema.
// Used for both the SELECT projection against the VPS and the COPY column
// list against the archive.
export const TABLE_COLUMNS = {
  representatives_uptime: ['account', 'online', 'observed_at'],
  representatives_telemetry: [
    'account',
    'weight',
    'block_count',
    'block_behind',
    'cemented_count',
    'cemented_behind',
    'account_count',
    'unchecked_count',
    'bandwidth_cap',
    'peer_count',
    'protocol_version',
    'uptime',
    'major_version',
    'minor_version',
    'patch_version',
    'pre_release_version',
    'maker',
    'node_id',
    'address',
    'port',
    'reported_at',
    'observed_at'
  ],
  network_events: [
    'network_event_sequence',
    'network_event_id',
    'network_event_condition_id',
    'network_event_type',
    'network_event_phase',
    'severity',
    'representative_account',
    'peer_address',
    'node_id',
    'evidence',
    'observed_at',
    'recorded_at'
  ],
  network_event_coverage: [
    'network_event_coverage_sequence',
    'producer',
    'coverage_began_at',
    'coverage_ended_at',
    'recorded_at'
  ],
  posts: [
    'id',
    'pid',
    'sid',
    'title',
    'url',
    'content_url',
    'author',
    'authorid',
    'text',
    'html',
    'summary',
    'score',
    'social_score',
    'created_at',
    'updated_at'
  ]
}

// The column each table's watermark compares and orders on, and its kind:
// an instant watermark lives in etl_state.watermark_at, a sequence watermark
// in etl_state.watermark_sequence. network_events and network_event_coverage
// use their delivery sequence, which the VPS assigns in commit order, so no
// row can commit behind a watermark the delta has already passed.
export const WATERMARK = {
  posts: { column: 'created_at', kind: 'instant' },
  representatives_telemetry: { column: 'observed_at', kind: 'instant' },
  representatives_uptime: { column: 'observed_at', kind: 'instant' },
  network_events: { column: 'network_event_sequence', kind: 'sequence' },
  network_event_coverage: {
    column: 'network_event_coverage_sequence',
    kind: 'sequence'
  }
}

// etl_state column, SQL type and lower bound for a watermark kind.
const WATERMARK_KIND = {
  instant: {
    state_column: 'watermark_at',
    sql_type: 'timestamptz',
    lower_bound: "'-infinity'::timestamptz"
  },
  sequence: {
    state_column: 'watermark_sequence',
    sql_type: 'bigint',
    lower_bound: '0'
  }
}

// The VPS query for one table's delta. $1 is the watermark as text, or null
// for an empty archive table.
export const build_vps_delta_query = (table) => {
  const cols = TABLE_COLUMNS[table]
  const watermark = WATERMARK[table]
  if (!cols || !watermark) throw new Error(`unknown table: ${table}`)
  const kind = WATERMARK_KIND[watermark.kind]
  const col_list = cols.map((c) => `"${c}"`).join(',')
  return (
    `SELECT ${col_list} FROM public."${table}" ` +
    `WHERE "${watermark.column}" > COALESCE($1::${kind.sql_type}, ${kind.lower_bound}) ` +
    `ORDER BY "${watermark.column}" ASC`
  )
}

// Retention on VPS PG is handled by TimescaleDB retention policies declared
// in db/schema.postgres.sql (uptime 12w, telemetry 6w). The delta issues no
// DELETEs against the source. Posts on VPS PG is a plain table with no
// retention.

// PG TEXT format escapes: \\, \r, \n, \t; NULL -> \N.
// NUL byte (0x00) is stripped: PG TEXT format rejects it and PG text columns
// cannot store it -- some posts.text/html rows from upstream reddit imports
// carry stray NULs from corrupted source text.
let _nul_strip_count = 0
const isPlainObject = (v) =>
  v !== null &&
  typeof v === 'object' &&
  Object.getPrototypeOf(v) === Object.prototype

// A plain object is a jsonb value (pg returns jsonb parsed), so it is written
// back as JSON text rather than String(v)'s "[object Object]".
export function pgEscape(v) {
  if (v === null || v === undefined) return '\\N'
  if (typeof v === 'number') return String(v)
  if (Buffer.isBuffer(v)) v = v.toString('utf8')
  let s = isPlainObject(v) ? JSON.stringify(v) : String(v)
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

// Session settings that make every instant cross as unambiguous UTC text.
const SESSION_OPTIONS = '-c DateStyle=ISO -c TimeZone=UTC'

// Every column stays the server's text, which COPY reads back unchanged.
const server_text = { getTypeParser: () => (value) => value }

export const create_vps_reader = (connection) =>
  new pg.Client({
    ...connection,
    options: SESSION_OPTIONS,
    types: server_text
  })

export const create_archive_writer = (connection) =>
  new pg.Client({ ...connection, options: SESSION_OPTIONS })

// The table's watermark as text, bootstrapped from the archive table's
// maximum when etl_state has none. Null means the archive table is empty.
async function read_watermark(table, archive) {
  const { column, kind } = WATERMARK[table]
  const { state_column } = WATERMARK_KIND[kind]
  const stored = await archive.query(
    `SELECT ${state_column}::text AS watermark FROM public.etl_state WHERE table_name = $1`,
    [table]
  )
  if (stored.rowCount > 0 && stored.rows[0].watermark != null) {
    logger(`${table}: resumed watermark = ${stored.rows[0].watermark}`)
    return stored.rows[0].watermark
  }
  const bootstrapped = await archive.query(
    `INSERT INTO public.etl_state (table_name, ${state_column})
     SELECT $1, max("${column}") FROM public."${table}"
     ON CONFLICT (table_name) DO UPDATE SET ${state_column} = EXCLUDED.${state_column}
     RETURNING ${state_column}::text AS watermark`,
    [table]
  )
  const watermark = bootstrapped.rows[0].watermark
  logger(
    `${table}: bootstrapped watermark from archive MAX(${column}) = ${watermark}`
  )
  return watermark
}

export async function runTableDelta(table, vpsPg, pgClient, opts = {}) {
  const cols = TABLE_COLUMNS[table]
  const watermark_spec = WATERMARK[table]
  if (!cols || !watermark_spec) throw new Error(`unknown table: ${table}`)
  const { state_column } = WATERMARK_KIND[watermark_spec.kind]
  const pgColList = cols.map((c) => `"${c}"`).join(',')

  const watermark = await read_watermark(table, pgClient)

  const t0 = Date.now()
  let rowsRead = 0
  let rowsInserted = 0
  let liveBefore = 0
  let liveAfter = 0
  let watermarkAfter = watermark

  await pgClient.query('BEGIN')
  let committed = false
  try {
    await pgClient.query(
      'SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction TO 0'
    )
    await pgClient.query(
      `CREATE TEMP TABLE _stage (LIKE public."${table}" INCLUDING DEFAULTS) ON COMMIT DROP`
    )

    const copyStream = pgClient.query(
      pgCopyStreams.from(
        `COPY _stage (${pgColList}) FROM STDIN WITH (FORMAT text)`
      )
    )

    // Delta size is bounded by the watermark gap (a day of accumulation
    // between cron ticks), so a single in-memory query is acceptable. If a
    // stall causes backlog growth, swap to a server-side cursor (pg-cursor).
    const vpsRes = await vpsPg.query(build_vps_delta_query(table), [watermark])
    const sourceStream = Readable.from(vpsRes.rows, { objectMode: true })

    let lastLogged = 0
    const transform = new Transform({
      writableObjectMode: true,
      readableObjectMode: false,
      transform(row, _enc, cb) {
        if (table === 'posts' && row.social_score != null) {
          row.social_score = Math.floor(Number(row.social_score))
        }
        rowsRead++
        if (rowsRead - lastLogged >= 500_000) {
          const elapsed = (Date.now() - t0) / 1000
          logger(
            `${table}: delta ${rowsRead.toLocaleString()} rows streamed @ ${Math.round(rowsRead / elapsed).toLocaleString()} rows/s`
          )
          lastLogged = rowsRead
        }
        cb(null, rowToTsv(row, cols))
      }
    })

    await pipeline(sourceStream, transform, copyStream)
    logger(
      `${table}: delta COPY done -- ${rowsRead.toLocaleString()} rows into _stage in ${Date.now() - t0}ms`
    )

    if (opts.dryRun) {
      logger(`${table}: --dry-run -- ROLLBACK`)
      await pgClient.query('ROLLBACK')
      committed = true
    } else {
      const before = await pgClient.query(
        `SELECT count(*)::bigint AS c FROM public."${table}"`
      )
      liveBefore = Number(before.rows[0].c)
      await pgClient.query(
        `INSERT INTO public."${table}" (${pgColList})
         SELECT ${pgColList} FROM _stage
         ON CONFLICT DO NOTHING`
      )
      const after = await pgClient.query(
        `SELECT count(*)::bigint AS c FROM public."${table}"`
      )
      liveAfter = Number(after.rows[0].c)
      rowsInserted = liveAfter - liveBefore
      const advanced = await pgClient.query(
        `UPDATE public.etl_state
           SET ${state_column} = COALESCE(
                 (SELECT max("${watermark_spec.column}") FROM _stage),
                 ${state_column}),
               rows_extracted = rows_extracted + $2,
               rows_inserted = rows_inserted + $3,
               completed_at = NOW(),
               notes = $4
         WHERE table_name = $1
         RETURNING ${state_column}::text AS watermark`,
        [
          table,
          rowsRead,
          rowsInserted,
          `delta live_before=${liveBefore} live_after=${liveAfter}`
        ]
      )
      watermarkAfter = advanced.rows[0].watermark
      await pgClient.query('COMMIT')
      committed = true
    }
  } catch (err) {
    if (!committed) {
      try {
        await pgClient.query('ROLLBACK')
      } catch {
        /* ignore */
      }
    }
    throw err
  }

  const tookMs = Date.now() - t0
  logger(
    `${table}: DELTA extracted=${rowsRead.toLocaleString()} inserted=${rowsInserted.toLocaleString()} ` +
      `live_before=${liveBefore.toLocaleString()} live_after=${liveAfter.toLocaleString()} ` +
      `watermark=${watermarkAfter} took=${tookMs}ms` +
      (opts.dryRun ? ' [dry-run]' : '')
  )

  return {
    table,
    rows_extracted: rowsRead,
    rows_inserted: rowsInserted,
    live_before: liveBefore,
    live_after: liveAfter,
    watermark_after: watermarkAfter,
    took_ms: tookMs,
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
  if (!argv.delta) {
    throw new Error(
      '--delta is required: the one-shot MySQL bulk load is retired'
    )
  }

  let order = DELTA_RUN_ORDER.slice()
  if (opts.onlyTable) {
    if (!DELTA_RUN_ORDER.includes(opts.onlyTable)) {
      throw new Error(
        `--only-table=${opts.onlyTable} is not in DELTA_RUN_ORDER`
      )
    }
    order = [opts.onlyTable]
  } else if (opts.resumeFrom) {
    const i = DELTA_RUN_ORDER.indexOf(opts.resumeFrom)
    if (i < 0) {
      throw new Error(
        `--resume-from=${opts.resumeFrom} is not in DELTA_RUN_ORDER`
      )
    }
    order = DELTA_RUN_ORDER.slice(i)
  }

  logger(
    `archive-to-postgres starting: mode=delta order=[${order.join(', ')}] ` +
      `dry_run=${opts.dryRun} (lockfile=/tmp/nano-community-archive.lock, held by the cron's flock -n)`
  )
  const tStart = Date.now()

  // VPS production PG via the storage-side tunnel
  // (nano-community-vps-pg-tunnel forwards localhost:15432 -> VPS:5432).
  const vpsPg = create_vps_reader(config.vps_postgres.connection)
  await vpsPg.connect()
  const pgClient = create_archive_writer(config.archive_postgres.connection)
  await pgClient.connect()
  const summaries = []
  let failed = null
  try {
    for (const table of order) {
      try {
        summaries.push(await runTableDelta(table, vpsPg, pgClient, opts))
      } catch (err) {
        logger(`${table}: FAILED -- ${err.message}`)
        console.error(err)
        failed = { table, error: err.message }
        break
      }
    }
  } finally {
    for (const client of [pgClient, vpsPg]) {
      try {
        await client.end()
      } catch {
        /* ignore */
      }
    }
  }

  const tookMs = Date.now() - tStart
  logger(
    `archive-to-postgres done in ${tookMs}ms (nul_strip_count=${_nul_strip_count})`
  )
  for (const s of summaries) {
    logger(
      `  ${s.table}: extracted=${s.rows_extracted.toLocaleString()} ` +
        `inserted=${s.rows_inserted.toLocaleString()} ` +
        `watermark=${s.watermark_after} took=${s.took_ms}ms` +
        (s.dry_run ? ' [dry-run]' : '')
    )
  }

  if (failed) {
    logger(`FAILURE on table=${failed.table}: ${failed.error}`)
    process.exitCode = 1
  }
}

if (isMain(import.meta.url)) {
  debug.enable('archive-to-pg')
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

export default main
