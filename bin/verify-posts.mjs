// bin/verify-posts.mjs
//
// Cluster verifier for posts-archive_*.csv.
//
// Strategy: COPY all 47 CSVs into a session TEMP _stage that mirrors
// public.posts, then anti-join on url-presence: every distinct staging url
// (excluding bogus-epoch rows) must exist somewhere in live.posts.
// Per the plan, url-presence is the delete gate; column-hash drift is
// diagnostic-only (cosmetic score/author drift was empirically harmless).
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

const logger = debug('verify-posts')
debug.enable('verify-common,verify-*')

const CLUSTER = 'posts'
const STAGE_LIKE = 'public.posts'
const LIVE_TABLE = CLUSTER_TARGETS[CLUSTER]
const COLS = TABLE_COLUMNS.posts
const POSTS_BOGUS_EPOCH_THRESHOLD = 1262304000 // 2010-01-01 UTC; matches plan

// Drops empty lines and strips NUL bytes (0x00). PG rejects NULs in UTF8
// text columns and the bulk migration already removed 95 NULs from posts
// content -- the CSV files preserve the originals so we strip again here.
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

// Live schema marks content_url, author, pid, sid NOT NULL but CSV represents
// missing values as unquoted empty fields, which PG's CSV parser maps to NULL
// by default. FORCE_NOT_NULL converts the unquoted empties on those columns
// into empty strings so the staging table's NOT NULL inheritance is satisfied.
const FORCE_NOT_NULL_COLS = ['content_url', 'author', 'pid', 'sid', 'title']

async function copyOne(client, path) {
  const dialect = await sniffCsvDialect(path)
  for (const c of dialect.header) {
    if (!COLS.includes(c)) {
      throw new Error(`unknown CSV header column ${c} in ${path}; expected subset of ${COLS.join(',')}`)
    }
  }
  const colList = dialect.header.map((c) => `"${c}"`).join(', ')
  const fnn = FORCE_NOT_NULL_COLS.filter((c) => dialect.header.includes(c)).map((c) => `"${c}"`).join(', ')
  const fnnClause = fnn.length > 0 ? `, FORCE_NOT_NULL (${fnn})` : ''
  const sql = `COPY _stage (${colList}) FROM STDIN WITH (FORMAT csv, HEADER true${fnnClause})`
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
      `SELECT count(*) AS staged,
              count(DISTINCT url) AS staged_urls,
              count(DISTINCT url) FILTER (WHERE created_at > $1) AS staged_urls_real,
              min(created_at) FILTER (WHERE created_at > $1) AS min_ts,
              max(created_at) AS max_ts,
              count(*) FILTER (WHERE created_at <= 0) AS bogus
         FROM _stage`,
      [POSTS_BOGUS_EPOCH_THRESHOLD]
    )
    const r = range.rows[0]
    logger('stage: rows=%s urls=%s urls_real=%s min=%s max=%s bogus=%s', r.staged, r.staged_urls, r.staged_urls_real, r.min_ts, r.max_ts, r.bogus)

    const t1 = Date.now()
    const aj = await client.query(
      `SELECT count(*) AS unmatched
         FROM (SELECT DISTINCT url FROM _stage WHERE url IS NOT NULL AND created_at > $1) s
         WHERE NOT EXISTS (SELECT 1 FROM public.${LIVE_TABLE} l WHERE l.url = s.url)`,
      [POSTS_BOGUS_EPOCH_THRESHOLD]
    )
    const tAj = Date.now() - t1
    const unmatched = Number(aj.rows[0].unmatched)
    logger('anti-join: unmatched=%d (%.1fs)', unmatched, tAj / 1000)

    const liveCount = await client.query(`SELECT count(*) AS n FROM public.${LIVE_TABLE}`)
    const liveTotal = Number(liveCount.rows[0].n)

    let yearHistogram = null
    if (unmatched > 0) {
      const tH = Date.now()
      const hist = await client.query(
        `SELECT extract(year FROM to_timestamp(s.created_at))::int AS yr,
                count(*)::bigint AS n
           FROM (SELECT DISTINCT url, min(created_at) AS created_at FROM _stage WHERE url IS NOT NULL AND created_at > $1 GROUP BY url) s
           WHERE NOT EXISTS (SELECT 1 FROM public.${LIVE_TABLE} l WHERE l.url = s.url)
           GROUP BY yr
           ORDER BY yr`,
        [POSTS_BOGUS_EPOCH_THRESHOLD]
      )
      yearHistogram = Object.fromEntries(hist.rows.map((row) => [row.yr, Number(row.n)]))
      logger('unmatched urls by year (%.1fs): %j', (Date.now() - tH) / 1000, yearHistogram)
    }

    let classification = unmatched === 0 ? 'verified-safe' : 'partial'
    exit = unmatched === 0 ? EXIT_SAFE : EXIT_PARTIAL

    let imported = null
    const importMode = process.argv.includes('--import-unmatched')
    if (importMode && unmatched > 0) {
      // Import only rows whose url is not yet in live. Posts schema has url
      // and id NOT NULL on the unique-index columns, so ON CONFLICT DO NOTHING
      // is tight (no NULLS-DISTINCT loophole).
      const colList = COLS.map((c) => `"${c}"`).join(', ')
      const tIns = Date.now()
      const ins = await client.query(
        `INSERT INTO public.${LIVE_TABLE} (${colList})
         SELECT DISTINCT ON (s.url, s.created_at) ${COLS.map((c) => 's."' + c + '"').join(', ')}
           FROM _stage s
          WHERE s.url IS NOT NULL
            AND s.created_at > $1
            AND NOT EXISTS (SELECT 1 FROM public.${LIVE_TABLE} l WHERE l.url = s.url)
         ON CONFLICT DO NOTHING`,
        [POSTS_BOGUS_EPOCH_THRESHOLD]
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
      pk_used: 'url',
      column_delta: shapeSummary,
      anti_join_count: unmatched,
      live_count_in_window: liveTotal,
      classification,
      notes: `n_files=${files.length} bytes=${totalBytes} bogus_in_stage=${r.bogus} staged_urls=${r.staged_urls} staged_urls_real=${r.staged_urls_real} copy_ms=${tCopy} antijoin_ms=${tAj}${yearHistogram ? ' unmatched_by_year=' + JSON.stringify(yearHistogram) : ''}${imported !== null ? ' imported=' + imported : ''}`
    })

    logger('cluster %s: %s (unmatched=%d)', CLUSTER, classification, unmatched)
    if (classification !== 'verified-safe') {
      await notifyDiscord(`verify-posts: ${classification} (unmatched=${unmatched})`)
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
    await notifyDiscord(`verify-posts: error -- ${e.message}`)
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
