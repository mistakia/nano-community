// bin/verify-telemetry.mjs
//
// Cluster verifier for representatives-telemetry-archive_*.csv.
//
// Strategy: COPY all CSV rows into a session TEMP table that mirrors
// public.representatives_telemetry, then run a bounded anti-join against
// public.representatives_telemetry on (account, node_id, timestamp) with
// null-safe equality on account (CSVs carry NULL accounts that the bulk
// migration preserved). Verdict: 0 unmatched -> verified-safe; > 0 -> partial.
//
// Plan: user:task/homelab/verify-nano-community-csv-ingestion.md

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'

import debug from 'debug'
import pgCopyStreams from 'pg-copy-streams'

import { isMain } from '#common'

import {
  CLUSTER_TARGETS,
  EXIT_PARTIAL,
  EXIT_SAFE,
  EXIT_SETUP,
  TABLE_COLUMNS,
  createPgClient,
  listClusterFiles,
  openLedger,
  sniffCsvDialect
} from './verify-common.mjs'

const logger = debug('verify-telemetry')
debug.enable('verify-common,verify-*')

const CLUSTER = 'representatives-telemetry'
const STAGE_LIKE = 'public.representatives_telemetry'
const LIVE_TABLE = CLUSTER_TARGETS[CLUSTER]
const COLS = TABLE_COLUMNS.representatives_telemetry

// Drops empty lines from the byte stream so trailing blank lines on
// header-only CSVs don't trip "missing data for column" in PG COPY. Buffers
// across chunk boundaries; emits only complete non-empty lines.
function emptyLineFilter() {
  let pending = ''
  return new Transform({
    transform(chunk, _enc, cb) {
      const buf = pending + chunk.toString('utf8')
      const lines = buf.split('\n')
      pending = lines.pop() // last partial line
      const out = []
      for (const ln of lines) {
        if (ln.length > 0 && ln !== '\r') out.push(ln)
      }
      cb(null, out.length ? out.join('\n') + '\n' : '')
    },
    flush(cb) {
      if (pending.length > 0 && pending !== '\r') cb(null, pending + '\n')
      else cb()
    }
  })
}

async function copyOne(client, path) {
  const dialect = await sniffCsvDialect(path)
  for (const c of dialect.header) {
    if (!COLS.includes(c)) {
      throw new Error(`unknown CSV header column ${c} in ${path}; expected subset of ${COLS.join(',')}`)
    }
  }
  const colList = dialect.header.map((c) => `"${c}"`).join(', ')
  const sql = `COPY _stage (${colList}) FROM STDIN WITH (FORMAT csv, HEADER true)`
  const ingest = client.query(pgCopyStreams.from(sql))
  await pipeline(createReadStream(path), emptyLineFilter(), ingest)
  return { rows: ingest.rowCount, columnCount: dialect.column_count }
}

async function run() {
  const files = await listClusterFiles(CLUSTER)
  if (files.length === 0) {
    logger('no files found for cluster %s', CLUSTER)
    return EXIT_SETUP
  }
  logger('cluster %s: %d files', CLUSTER, files.length)

  const ledger = await openLedger(CLUSTER)
  const client = await createPgClient()
  let exit = EXIT_SAFE
  try {
    await client.query('BEGIN')
    await client.query(`CREATE TEMP TABLE _stage (LIKE ${STAGE_LIKE} INCLUDING DEFAULTS) ON COMMIT DROP`)
    await client.query('ALTER TABLE _stage ALTER COLUMN account_count DROP NOT NULL, ALTER COLUMN account_count SET DEFAULT 0')

    let totalRows = 0
    let totalBytes = 0
    const shapeHistogram = new Map()
    const t0 = Date.now()
    for (const f of files) {
      const stt = await stat(f)
      totalBytes += stt.size
      const { rows: n, columnCount } = await copyOne(client, f)
      totalRows += n
      shapeHistogram.set(columnCount, (shapeHistogram.get(columnCount) || 0) + 1)
      logger('COPY %s -> %d rows (cum %d)', f.split('/').pop(), n, totalRows)
    }
    const shapeSummary = JSON.stringify(Object.fromEntries(shapeHistogram))
    const tCopy = Date.now() - t0
    logger('COPY phase: %d rows from %d files in %.1fs (%.1f MB) shapes=%s', totalRows, files.length, tCopy / 1000, totalBytes / 1024 / 1024, shapeSummary)

    const range = await client.query(
      `SELECT count(*) AS staged, count(DISTINCT (account, node_id, "timestamp")) AS staged_distinct,
              min("timestamp") AS min_ts, max("timestamp") AS max_ts,
              count(*) FILTER (WHERE "timestamp" <= 0) AS bogus
         FROM _stage`
    )
    const r = range.rows[0]
    logger('stage: rows=%s distinct=%s min=%s max=%s bogus=%s', r.staged, r.staged_distinct, r.min_ts, r.max_ts, r.bogus)

    const t1 = Date.now()
    const aj = await client.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT account, node_id, "timestamp" FROM _stage WHERE "timestamp" > 0) s
         LEFT JOIN public.${LIVE_TABLE} l
           ON l.account IS NOT DISTINCT FROM s.account
          AND l.node_id = s.node_id
          AND l."timestamp" = s."timestamp"
          AND l."timestamp" BETWEEN $1 AND $2
        WHERE l."timestamp" IS NULL`,
      [r.min_ts, r.max_ts]
    )
    const tAj = Date.now() - t1
    const unmatched = Number(aj.rows[0].unmatched)
    logger('anti-join: unmatched=%d (%.1fs)', unmatched, tAj / 1000)

    let yearHistogram = null
    if (unmatched > 0) {
      // Bucket unmatched by year so we can tell trim-driven (older rows
      // missing) apart from migration-coverage-gap (rows missing across
      // the full range).
      const tH = Date.now()
      const hist = await client.query(
        `SELECT extract(year FROM to_timestamp(s."timestamp"))::int AS yr,
                count(*)::bigint AS n
           FROM (SELECT DISTINCT account, node_id, "timestamp" FROM _stage WHERE "timestamp" > 0) s
           LEFT JOIN public.${LIVE_TABLE} l
             ON l.account IS NOT DISTINCT FROM s.account
            AND l.node_id = s.node_id
            AND l."timestamp" = s."timestamp"
            AND l."timestamp" BETWEEN $1 AND $2
          WHERE l."timestamp" IS NULL
          GROUP BY yr
          ORDER BY yr`,
        [r.min_ts, r.max_ts]
      )
      yearHistogram = Object.fromEntries(hist.rows.map((row) => [row.yr, Number(row.n)]))
      logger('unmatched by year (%.1fs): %j', (Date.now() - tH) / 1000, yearHistogram)
    }

    const liveCount = await client.query(
      `SELECT count(*) AS n FROM public.${LIVE_TABLE} WHERE "timestamp" BETWEEN $1 AND $2`,
      [r.min_ts, r.max_ts]
    )
    const liveInWindow = Number(liveCount.rows[0].n)
    logger('live %s rows in [%s, %s]: %d', LIVE_TABLE, r.min_ts, r.max_ts, liveInWindow)

    let classification
    if (unmatched === 0) {
      classification = 'verified-safe'
      exit = EXIT_SAFE
    } else {
      classification = 'partial'
      exit = EXIT_PARTIAL
    }

    // --import-unmatched: when the cluster is partial because the CSVs
    // contain rows the bulk migration could not have copied (the CSVs are
    // independent VPS-side backups whose 2021-2022 history never reached
    // storage MySQL), backfill them into live before re-verifying. The
    // unique index (account, node_id, "timestamp") absorbs duplicates so
    // ON CONFLICT DO NOTHING is idempotent.
    let imported = null
    const importMode = process.argv.includes('--import-unmatched')
    if (importMode && unmatched > 0) {
      const colList = COLS.map((c) => `"${c}"`).join(', ')
      const tIns = Date.now()
      const ins = await client.query(
        `INSERT INTO public.${LIVE_TABLE} (${colList})
         SELECT ${colList} FROM _stage WHERE "timestamp" > 0
         ON CONFLICT DO NOTHING`
      )
      imported = ins.rowCount
      logger('import-unmatched: inserted=%d (skipped via ON CONFLICT) (%.1fs)', imported, (Date.now() - tIns) / 1000)
      await client.query('COMMIT')
      classification = `partial+imported(${imported})`
      // Treat the import as the closing action; verdict relays back to caller.
      exit = imported >= unmatched ? EXIT_SAFE : EXIT_PARTIAL
    } else {
      await client.query('ROLLBACK')
    }

    await ledger.appendRow({
      file: `cluster:${CLUSTER}`,
      table: LIVE_TABLE,
      rows: totalRows,
      min_ts: r.min_ts,
      max_ts: r.max_ts,
      pk_used: '(account, node_id, "timestamp")',
      column_delta: shapeSummary,
      anti_join_count: unmatched,
      live_count_in_window: liveInWindow,
      classification,
      notes: `n_files=${files.length} bytes=${totalBytes} bogus_in_stage=${r.bogus} copy_ms=${tCopy} antijoin_ms=${tAj}${yearHistogram ? ' unmatched_by_year=' + JSON.stringify(yearHistogram) : ''}${imported !== null ? ' imported=' + imported : ''}`
    })

    logger('cluster %s: %s (unmatched=%d)', CLUSTER, classification, unmatched)
  } catch (e) {
    logger('error: %s', e.stack || e.message)
    try { await client.query('ROLLBACK') } catch (_) {}
    await ledger.appendRow({
      file: `cluster:${CLUSTER}`,
      table: LIVE_TABLE,
      classification: 'error',
      notes: (e.message || String(e)).slice(0, 200)
    })
    exit = EXIT_SETUP
  } finally {
    await client.end()
  }
  return exit
}

if (isMain(import.meta.url)) {
  run().then((c) => { process.exitCode = c }).catch((e) => {
    console.error('fatal:', e.stack || e.message)
    process.exitCode = EXIT_SETUP
  })
}
