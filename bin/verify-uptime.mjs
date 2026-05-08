// bin/verify-uptime.mjs
//
// Cluster verifier for representatives-uptime-archive_*.csv.
//
// Strategy: COPY all 7,554 CSVs into a session TEMP _stage that mirrors
// public.representatives_uptime, then anti-join on (account, "timestamp")
// against live. Single-T per file; staging may carry the 2 known
// byte-identical duplicate pairs which DISTINCT collapses in the anti-join.
//
// Plan: user:task/homelab/verify-nano-community-csv-ingestion.md

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Transform } from 'node:stream'
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
  sniffCsvDialect
} from './verify-common.mjs'

const logger = debug('verify-uptime')
debug.enable('verify-common,verify-*')

const CLUSTER = 'representatives-uptime'
const STAGE_LIKE = 'public.representatives_uptime'
const LIVE_TABLE = CLUSTER_TARGETS[CLUSTER]
const COLS = TABLE_COLUMNS.representatives_uptime

function emptyLineFilter() {
  let pending = ''
  return new Transform({
    transform(chunk, _enc, cb) {
      const buf = (pending + chunk.toString('utf8')).replace(/[\u0000\r]/g, '')
      const lines = buf.split('\n')
      pending = lines.pop()
      const out = []
      for (const ln of lines) {
        if (ln.length > 0) out.push(ln)
      }
      cb(null, out.length ? out.join('\n') + '\n' : '')
    },
    flush(cb) {
      const tail = pending.replace(/[\u0000\r]/g, '')
      if (tail.length > 0) cb(null, tail + '\n')
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

    let totalRows = 0
    let totalBytes = 0
    const shapeHistogram = new Map()
    const t0 = Date.now()
    const reportEvery = 500
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      const stt = await stat(f)
      totalBytes += stt.size
      const { rows: n, columnCount } = await copyOne(client, f)
      totalRows += n
      shapeHistogram.set(columnCount, (shapeHistogram.get(columnCount) || 0) + 1)
      if ((i + 1) % reportEvery === 0 || i === files.length - 1) {
        logger('COPY progress: %d/%d files, cum %d rows / %.1f MB', i + 1, files.length, totalRows, totalBytes / 1024 / 1024)
      }
    }
    const shapeSummary = JSON.stringify(Object.fromEntries(shapeHistogram))
    const tCopy = Date.now() - t0
    logger('COPY phase: %d rows from %d files in %.1fs (%.1f MB) shapes=%s', totalRows, files.length, tCopy / 1000, totalBytes / 1024 / 1024, shapeSummary)

    const range = await client.query(
      `SELECT count(*) AS staged, count(DISTINCT (account, "timestamp")) AS staged_distinct,
              min("timestamp") AS min_ts, max("timestamp") AS max_ts,
              count(*) FILTER (WHERE "timestamp" <= 0) AS bogus
         FROM _stage`
    )
    const r = range.rows[0]
    logger('stage: rows=%s distinct=%s min=%s max=%s bogus=%s', r.staged, r.staged_distinct, r.min_ts, r.max_ts, r.bogus)

    const t1 = Date.now()
    const aj = await client.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT account, "timestamp" FROM _stage WHERE "timestamp" > 0) s
         LEFT JOIN public.${LIVE_TABLE} l
           ON l.account = s.account
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

    let yearHistogram = null
    if (unmatched > 0) {
      const tH = Date.now()
      const hist = await client.query(
        `SELECT extract(year FROM to_timestamp(s."timestamp"))::int AS yr,
                count(*)::bigint AS n
           FROM (SELECT DISTINCT account, "timestamp" FROM _stage WHERE "timestamp" > 0) s
           LEFT JOIN public.${LIVE_TABLE} l
             ON l.account = s.account
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

    let classification = unmatched === 0 ? 'verified-safe' : 'partial'
    exit = unmatched === 0 ? EXIT_SAFE : EXIT_PARTIAL

    let imported = null
    const importMode = process.argv.includes('--import-unmatched')
    if (importMode && unmatched > 0) {
      // representatives_uptime: account NOT NULL on UNIQUE(account, "timestamp")
      // so ON CONFLICT DO NOTHING is tight (no NULLS-DISTINCT loophole).
      await client.query('SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction TO 0')
      const colList = COLS.map((c) => `"${c}"`).join(', ')
      const tIns = Date.now()
      const ins = await client.query(
        `INSERT INTO public.${LIVE_TABLE} (${colList})
         SELECT DISTINCT ON (s.account, s."timestamp") ${COLS.map((c) => 's."' + c + '"').join(', ')}
           FROM _stage s
          WHERE s."timestamp" > 0
            AND NOT EXISTS (SELECT 1 FROM public.${LIVE_TABLE} l WHERE l.account = s.account AND l."timestamp" = s."timestamp")
         ON CONFLICT DO NOTHING`
      )
      imported = ins.rowCount
      logger('import-unmatched: inserted=%d (%.1fs)', imported, (Date.now() - tIns) / 1000)
      await client.query('COMMIT')
      classification = `partial+imported(${imported})`
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
      pk_used: '(account, "timestamp")',
      column_delta: shapeSummary,
      anti_join_count: unmatched,
      live_count_in_window: liveInWindow,
      classification,
      notes: `n_files=${files.length} bytes=${totalBytes} bogus_in_stage=${r.bogus} copy_ms=${tCopy} antijoin_ms=${tAj}${yearHistogram ? ' unmatched_by_year=' + JSON.stringify(yearHistogram) : ''}${imported !== null ? ' imported=' + imported : ''}`
    })

    logger('cluster %s: %s (unmatched=%d)', CLUSTER, classification, unmatched)
    if (classification !== 'verified-safe') {
      await notifyDiscord(`verify-uptime: ${classification} (unmatched=${unmatched})`)
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
    await notifyDiscord(`verify-uptime: error -- ${e.message}`)
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
