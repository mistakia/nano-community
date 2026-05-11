// bin/verify-dump-via-pg.mjs
//
// Verifier for a mysqldump (.sql) that bypasses MySQL entirely. Streams the
// dump through parse-mysqldump.mjs into PG TEMP staging tables via
// pg-copy-streams, then runs the same bounded anti-join as verify-dump.mjs.
//
// Use when the dump is large enough that InnoDB B-tree maintenance during the
// `mysql < dump.sql` step dominates verifier runtime. For small dumps the
// MySQL-route verifier (verify-dump.mjs) is fine and gives free reference-
// table row counts.
//
// Usage: NODE_ENV=production node bin/verify-dump-via-pg.mjs --dump <path>
//
// Plan: user:task/homelab/verify-2025-05-04-dump-via-pg.md

import { basename } from 'node:path'
import { stat } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'
import { PassThrough } from 'node:stream'

import debug from 'debug'
import pgCopyStreams from 'pg-copy-streams'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { isMain } from '#common'

import {
  EXIT_PARTIAL,
  EXIT_SAFE,
  EXIT_SETUP,
  createPgClient,
  notifyDiscord,
  openLedger,
  pgEscape
} from './verify-common.mjs'

import { parseMysqlDump } from './parse-mysqldump.mjs'

const logger = debug('verify-dump-via-pg')
debug.enable('verify-common,verify-*')

const HISTORY_TABLES = [
  {
    name: 'representatives_uptime',
    live: 'representatives_uptime',
    keys: ['account', 'timestamp'],
    null_safe: [],
    bogus_filter: '"timestamp" > 0',
    stage: '_stage_uptime',
    stage_ddl: '("account" character(65), "online" smallint, "timestamp" integer)',
    stage_cols: ['account', 'online', 'timestamp'],
    live_cols: ['account', 'online', 'timestamp'],
    importable: true
  },
  {
    name: 'representatives_telemetry',
    live: 'representatives_telemetry',
    keys: ['account', 'node_id', 'timestamp'],
    null_safe: ['account'],
    bogus_filter: '"timestamp" > 0',
    stage: '_stage_telemetry',
    stage_ddl: '("account" character(65), "node_id" character(65), "timestamp" integer)',
    stage_cols: ['account', 'node_id', 'timestamp']
  },
  {
    name: 'posts',
    live: 'posts',
    keys: ['url'],
    null_safe: [],
    bogus_filter: 'created_at > 1262304000',
    stage: '_stage_posts',
    stage_ddl: '("url" varchar(255), "created_at" integer)',
    stage_cols: ['url', 'created_at']
  }
]

function tableConfigByName (name) {
  return HISTORY_TABLES.find((t) => t.name === name)
}

function tsvLine ({ values, cols }) {
  const parts = new Array(cols.length)
  for (let i = 0; i < cols.length; i++) parts[i] = pgEscape(values[cols[i]])
  return parts.join('\t') + '\n'
}

async function rangeProbe ({ pgClient, cfg }) {
  if (cfg.name === 'posts') {
    const r = await pgClient.query(
      `SELECT count(*)::bigint AS staged,
              count(DISTINCT url)::bigint AS distinct_keys,
              min(created_at) FILTER (WHERE created_at > 1262304000) AS min_ts,
              max(created_at) AS max_ts,
              count(*) FILTER (WHERE created_at <= 0)::bigint AS bogus
         FROM ${cfg.stage}`
    )
    return r.rows[0]
  }
  const r = await pgClient.query(
    `SELECT count(*)::bigint AS staged,
            count(DISTINCT (${cfg.keys.map((k) => `"${k}"`).join(', ')}))::bigint AS distinct_keys,
            min("timestamp") AS min_ts, max("timestamp") AS max_ts,
            count(*) FILTER (WHERE "timestamp" <= 0)::bigint AS bogus
       FROM ${cfg.stage}`
  )
  return r.rows[0]
}

async function antiJoin ({ pgClient, cfg, probe }) {
  if (cfg.name === 'posts') {
    const r = await pgClient.query(
      `SELECT count(*)::bigint AS unmatched
         FROM (SELECT DISTINCT url FROM ${cfg.stage} WHERE url IS NOT NULL AND created_at > 1262304000) s
         WHERE NOT EXISTS (SELECT 1 FROM public.${cfg.live} l WHERE l.url = s.url)`
    )
    return Number(r.rows[0].unmatched)
  }
  const onParts = cfg.keys.map((k) => {
    if (cfg.null_safe.includes(k)) return `l."${k}" IS NOT DISTINCT FROM s."${k}"`
    return `l."${k}" = s."${k}"`
  })
  onParts.push('l."timestamp" BETWEEN $1 AND $2')
  const r = await pgClient.query(
    `SELECT count(*)::bigint AS unmatched
       FROM (SELECT DISTINCT ${cfg.keys.map((k) => `"${k}"`).join(', ')} FROM ${cfg.stage} WHERE "timestamp" > 0) s
       LEFT JOIN public.${cfg.live} l ON ${onParts.join(' AND ')}
      WHERE l."timestamp" IS NULL`,
    [probe.min_ts, probe.max_ts]
  )
  return Number(r.rows[0].unmatched)
}

async function yearHistogram ({ pgClient, cfg, probe }) {
  if (cfg.name === 'posts') {
    const r = await pgClient.query(
      `SELECT extract(year FROM to_timestamp(s.created_at))::int AS yr, count(*)::bigint AS n
         FROM (SELECT url, min(created_at) AS created_at FROM ${cfg.stage} WHERE url IS NOT NULL AND created_at > 1262304000 GROUP BY url) s
         WHERE NOT EXISTS (SELECT 1 FROM public.${cfg.live} l WHERE l.url = s.url)
         GROUP BY yr ORDER BY yr`
    )
    return Object.fromEntries(r.rows.map((row) => [row.yr, Number(row.n)]))
  }
  const onParts = cfg.keys.map((k) => cfg.null_safe.includes(k) ? `l."${k}" IS NOT DISTINCT FROM s."${k}"` : `l."${k}" = s."${k}"`)
  onParts.push('l."timestamp" BETWEEN $1 AND $2')
  const r = await pgClient.query(
    `SELECT extract(year FROM to_timestamp(s."timestamp"))::int AS yr, count(*)::bigint AS n
       FROM (SELECT DISTINCT ${cfg.keys.map((k) => `"${k}"`).join(', ')} FROM ${cfg.stage} WHERE "timestamp" > 0) s
       LEFT JOIN public.${cfg.live} l ON ${onParts.join(' AND ')}
      WHERE l."timestamp" IS NULL
      GROUP BY yr ORDER BY yr`,
    [probe.min_ts, probe.max_ts]
  )
  return Object.fromEntries(r.rows.map((row) => [row.yr, Number(row.n)]))
}

async function run ({ dumpPath, importUnmatched = false, sampleUnmatched = 20 }) {
  const dumpName = basename(dumpPath)
  const dumpStat = await stat(dumpPath)
  logger('verify-dump-via-pg: %s (%.1f MB)', dumpName, dumpStat.size / 1024 / 1024)

  const ledger = await openLedger('older-dumps-via-pg')
  const pgClient = await createPgClient()

  let exit = EXIT_SAFE
  const stagedRows = Object.create(null) // table -> rows actually written to PG (== rows seen by parser)
  let activeTable = null
  let activeStream = null
  const copyDones = []

  try {
    for (const cfg of HISTORY_TABLES) {
      await pgClient.query(`CREATE TEMP TABLE ${cfg.stage} ${cfg.stage_ddl}`)
    }

    const targetTables = Object.fromEntries(HISTORY_TABLES.map((c) => [c.name, c.stage_cols]))

    const tParse0 = Date.now()
    await parseMysqlDump({
      dumpPath,
      targetTables,
      onRow: (table, values) => {
        if (activeTable !== table) {
          if (activeStream) {
            activeStream.source.end()
            copyDones.push(activeStream.done)
          }
          activeStream = null
          activeTable = table
        }
        if (!activeStream) {
          const cfg = tableConfigByName(table)
          // Start a new COPY synchronously; the PassThrough buffers until the
          // pipeline kicks in.
          activeStream = startCopySync({ pgClient, cfg })
          stagedRows[table] = stagedRows[table] || 0
        }
        const cfg = activeStream.cfg
        const ok = activeStream.source.write(tsvLine({ values, cols: cfg.stage_cols }))
        if (!ok) {
          // PassThrough is full; pause via async-stop is overkill here -- the
          // parser is line-buffered and a single line typically fits the HWM.
          // If backpressure becomes a real concern, switch onRow to async.
        }
        stagedRows[table]++
      },
      onProgress: ({ bytesRead, table, rowsByTable, eof }) => {
        logger('parse progress: bytes=%d table=%s rows=%j%s', bytesRead, table, rowsByTable, eof ? ' EOF' : '')
      }
    })

    if (activeStream) {
      activeStream.source.end()
      copyDones.push(activeStream.done)
      activeStream = null
    }
    await Promise.all(copyDones)
    const tParse = Date.now() - tParse0
    logger('parse+copy complete in %.1fs; staged %j', tParse / 1000, stagedRows)

    for (const cfg of HISTORY_TABLES) {
      if (!stagedRows[cfg.name]) {
        logger('%s: no rows staged (table absent from dump); skipping', cfg.name)
        await ledger.appendRow({
          file: `dump:${dumpName}#${cfg.name}`,
          table: cfg.live,
          classification: 'skipped',
          notes: 'table absent from dump (no rows seen by parser)'
        })
        continue
      }

      const tProbe0 = Date.now()
      const probe = await rangeProbe({ pgClient, cfg })
      const tProbe = Date.now() - tProbe0
      logger('%s: probe staged=%s distinct=%s min=%s max=%s bogus=%s (%.1fs)',
        cfg.name, probe.staged, probe.distinct_keys, probe.min_ts, probe.max_ts, probe.bogus, tProbe / 1000)

      const tAj0 = Date.now()
      const unmatched = await antiJoin({ pgClient, cfg, probe })
      const tAj = Date.now() - tAj0
      logger('%s: anti-join unmatched=%d (%.1fs)', cfg.name, unmatched, tAj / 1000)

      let yearHist = null
      let unmatchedSample = null
      let imported = null
      if (unmatched > 0) {
        yearHist = await yearHistogram({ pgClient, cfg, probe })
        logger('%s: unmatched_by_year=%j', cfg.name, yearHist)

        if (sampleUnmatched > 0) {
          const sampleSql = cfg.name === 'posts'
            ? `SELECT s.url FROM (SELECT DISTINCT url FROM ${cfg.stage} WHERE url IS NOT NULL AND created_at > 1262304000) s
                 WHERE NOT EXISTS (SELECT 1 FROM public.${cfg.live} l WHERE l.url = s.url)
                 LIMIT ${sampleUnmatched}`
            : `SELECT s.account, s."timestamp" FROM (SELECT DISTINCT ${cfg.keys.map((k) => '"' + k + '"').join(', ')} FROM ${cfg.stage} WHERE "timestamp" > 0) s
                 WHERE NOT EXISTS (SELECT 1 FROM public.${cfg.live} l WHERE ${cfg.keys.map((k) => 'l."' + k + '" = s."' + k + '"').join(' AND ')})
                 LIMIT ${sampleUnmatched}`
          const sr = await pgClient.query(sampleSql)
          unmatchedSample = sr.rows
          logger('%s: unmatched_sample=%j', cfg.name, unmatchedSample)
        }

        if (importUnmatched && cfg.importable) {
          await pgClient.query('BEGIN')
          await pgClient.query('SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction TO 0')
          const liveCols = cfg.live_cols.map((c) => '"' + c + '"').join(', ')
          const selectCols = cfg.live_cols.map((c) => 's."' + c + '"').join(', ')
          const tIns = Date.now()
          const ins = await pgClient.query(
            `INSERT INTO public.${cfg.live} (${liveCols})
             SELECT DISTINCT ON (${cfg.keys.map((k) => 's."' + k + '"').join(', ')}) ${selectCols}
               FROM ${cfg.stage} s
              WHERE s."timestamp" > 0
                AND NOT EXISTS (SELECT 1 FROM public.${cfg.live} l
                                  WHERE ${cfg.keys.map((k) => 'l."' + k + '" = s."' + k + '"').join(' AND ')})
             ON CONFLICT DO NOTHING`
          )
          imported = ins.rowCount
          await pgClient.query('COMMIT')
          logger('%s: import-unmatched inserted=%d (%.1fs)', cfg.name, imported, (Date.now() - tIns) / 1000)
        } else if (importUnmatched && !cfg.importable) {
          logger('%s: --import-unmatched skipped (not yet implemented for this table)', cfg.name)
        }
      }

      const classification = imported != null
        ? `partial+imported(${imported})`
        : (unmatched === 0 ? 'verified-safe' : 'partial')
      if (unmatched > 0 && imported == null) exit = EXIT_PARTIAL

      await ledger.appendRow({
        file: `dump:${dumpName}#${cfg.name}`,
        table: cfg.live,
        rows: stagedRows[cfg.name],
        min_ts: probe.min_ts,
        max_ts: probe.max_ts,
        pk_used: cfg.keys.join(','),
        anti_join_count: unmatched,
        classification,
        notes: `staged=${probe.staged} distinct=${probe.distinct_keys} bogus=${probe.bogus} probe_ms=${tProbe} antijoin_ms=${tAj}${yearHist ? ' unmatched_by_year=' + JSON.stringify(yearHist) : ''}${imported != null ? ' imported=' + imported : ''}`
      })
    }
  } catch (e) {
    logger('error: %s', e.stack || e.message)
    await ledger.appendRow({
      file: `dump:${dumpName}`,
      table: '(meta)',
      classification: 'error',
      notes: (e.message || String(e)).slice(0, 300)
    })
    await notifyDiscord(`verify-dump-via-pg ${dumpName}: error -- ${e.message}`)
    exit = EXIT_SETUP
  } finally {
    try { await pgClient.end() } catch {}
  }

  if (exit !== EXIT_SAFE) {
    await notifyDiscord(`verify-dump-via-pg ${dumpName}: exit=${exit} staged=${JSON.stringify(stagedRows)}`)
  }
  return exit
}

function startCopySync ({ pgClient, cfg }) {
  const colList = cfg.stage_cols.map((c) => `"${c}"`).join(', ')
  const sink = pgClient.query(pgCopyStreams.from(`COPY ${cfg.stage} (${colList}) FROM STDIN WITH (FORMAT text)`))
  const source = new PassThrough({ highWaterMark: 4 * 1024 * 1024 })
  const done = pipeline(source, sink)
  return { source, sink, done, cfg }
}

if (isMain(import.meta.url)) {
  const argv = yargs(hideBin(process.argv))
    .option('dump', { type: 'string', describe: 'Path to .sql dump', demandOption: true })
    .option('import-unmatched', { type: 'boolean', default: false })
    .option('sample-unmatched', { type: 'number', default: 20 })
    .strict()
    .argv
  run({ dumpPath: argv.dump, importUnmatched: argv['import-unmatched'], sampleUnmatched: argv['sample-unmatched'] })
    .then((c) => { process.exitCode = c })
    .catch((e) => {
      console.error('fatal:', e.stack || e.message)
      process.exitCode = EXIT_SETUP
    })
}
