// bin/verify-telemetry-index.mjs
//
// Cluster verifier for representatives-telemetry-index-archive_*.csv.
//
// Strategy: COPY all CSV rows into a session TEMP table that mirrors
// public.representatives_telemetry_index, then run a bounded anti-join
// against public.representatives_telemetry (the history table -- index is a
// cache shape that should be reproducible from telemetry history). Verdict:
// 0 unmatched -> verified-safe; > 0 -> partial; halt for triage.
//
// Plan: user:task/homelab/verify-nano-community-csv-ingestion.md

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

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
  notifyDiscord,
  openLedger,
  sha256File,
  sniffCsvDialect
} from './verify-common.mjs'

const logger = debug('verify-telemetry-index')
debug.enable('verify-common,verify-*')

const CLUSTER = 'representatives-telemetry-index'
const STAGE_LIKE = 'public.representatives_telemetry_index'
const LIVE_TABLE = CLUSTER_TARGETS[CLUSTER] // representatives_telemetry
const COLS = TABLE_COLUMNS.representatives_telemetry_index

// COPY column list is driven by the file's actual header so 20-col CSVs (no
// account_count) and 21-col CSVs (with account_count) both ingest cleanly.
// Unlisted columns are filled by the staging table's INCLUDING DEFAULTS.
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
  await pipeline(createReadStream(path), ingest)
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
      logger('COPY %s -> %d rows (cum %d, %.1f MB, %d cols)', f.split('/').pop(), n, totalRows, totalBytes / 1024 / 1024, columnCount)
    }
    const shapeSummary = JSON.stringify(Object.fromEntries(shapeHistogram))
    const tCopy = Date.now() - t0
    logger('COPY phase: %d rows from %d files in %.1fs (%.1f MB)', totalRows, files.length, tCopy / 1000, totalBytes / 1024 / 1024)

    // Capture range with bogus-epoch filter so the chunk-prune predicate stays
    // inside the populated range. Uptime/telemetry/index hypertables have no
    // bogus rows post-migration but the filter is cheap and matches the plan.
    const range = await client.query(
      `SELECT count(*) AS staged, count(DISTINCT (node_id, "timestamp")) AS staged_distinct,
              min("timestamp") AS min_ts, max("timestamp") AS max_ts,
              count(*) FILTER (WHERE "timestamp" <= 0) AS bogus
         FROM _stage`
    )
    const r = range.rows[0]
    logger('stage: rows=%s distinct=%s min=%s max=%s bogus=%s', r.staged, r.staged_distinct, r.min_ts, r.max_ts, r.bogus)

    if (r.bogus > 0) {
      logger('warning: %s bogus-epoch rows in stage; excluded from anti-join range', r.bogus)
    }

    // Bounded anti-join: each (node_id, timestamp) staging key must exist in
    // representatives_telemetry history. account is 99.9997% NULL in source,
    // so it is not part of the match key.
    const t1 = Date.now()
    const aj = await client.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT node_id, "timestamp" FROM _stage WHERE "timestamp" > 0) s
         LEFT JOIN public.${LIVE_TABLE} l
           ON l.node_id = s.node_id
          AND l."timestamp" = s."timestamp"
          AND l."timestamp" BETWEEN $1 AND $2
        WHERE l."timestamp" IS NULL`,
      [r.min_ts, r.max_ts]
    )
    const tAj = Date.now() - t1
    const unmatched = Number(aj.rows[0].unmatched)
    logger('anti-join: unmatched=%d (%.1fs)', unmatched, tAj / 1000)

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

    await client.query('ROLLBACK') // verifier is read-only against live tables

    // Cluster summary row (per-file rows are not written here; cluster shape is
    // bulk-verified, so a single ledger row records the cluster verdict).
    await ledger.appendRow({
      file: `cluster:${CLUSTER}`,
      table: LIVE_TABLE,
      rows: totalRows,
      min_ts: r.min_ts,
      max_ts: r.max_ts,
      pk_used: '(node_id, "timestamp")',
      column_delta: shapeSummary,
      anti_join_count: unmatched,
      live_count_in_window: liveInWindow,
      classification,
      notes: `n_files=${files.length} bytes=${totalBytes} bogus_in_stage=${r.bogus} copy_ms=${tCopy} antijoin_ms=${tAj}`
    })

    logger('cluster %s: %s (unmatched=%d)', CLUSTER, classification, unmatched)
    if (classification !== 'verified-safe') {
      await notifyDiscord(`verify-telemetry-index: ${classification} (unmatched=${unmatched})`)
    }
  } catch (e) {
    logger('error: %s', e.stack || e.message)
    try { await client.query('ROLLBACK') } catch (_) {}
    await ledger.appendRow({
      file: `cluster:${CLUSTER}`,
      table: LIVE_TABLE,
      classification: 'error',
      notes: (e.message || String(e)).slice(0, 200)
    })
    await notifyDiscord(`verify-telemetry-index: error -- ${e.message}`)
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
