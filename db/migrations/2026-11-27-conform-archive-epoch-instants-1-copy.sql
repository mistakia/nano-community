-- Conform the archive's epoch-integer instants to timestamptz — step 1 of 3:
-- copy the hypertables.
--
-- Target: nano_community_archive on database-server. Builds a timestamptz
-- sibling <table>_epoch_new of each of the five hypertables and fills it a
-- UTC day at a time. Each day is inserted and verified in one transaction:
-- the day's source rows, with every instant converted by to_timestamp(), must
-- equal the day's copied rows exactly (EXCEPT ALL in both directions, every
-- column), or the day rolls back and the script stops. Changes nothing the
-- delta reads, and takes no lock on the old tables.
--
-- Resumable: rerun after a stop and the days already copied are skipped.
--
-- Hold the archive delta lock on base-storage from the start of this step
-- until the new delta is deployed after step 2, so the 01:00 UTC delta cannot
-- run in between (one holder process; kill it after the deploy):
--   ssh base-storage 'flock -n /tmp/nano-community-archive.lock sleep 43200' &
-- Then apply on database-server as postgres:
--   ssh database 'sudo -n -u postgres psql -d nano_community_archive -v ON_ERROR_STOP=1 -f -' \
--     < db/migrations/2026-11-27-conform-archive-epoch-instants-1-copy.sql
--
-- New column names follow the VPS conform (2026-11-26): observed_at (was
-- "timestamp") and reported_at (was telemetry_timestamp).
--
-- Copy bound. The delta run of 2026-11-27 01:00 UTC was the first after the
-- VPS conform, and it projected sub-second VPS instants to whole epoch
-- seconds. The siblings therefore take only the rows at or before the
-- watermark each delta table had before that run (from the delta log):
-- posts 1795653305, representatives_telemetry 1795654502,
-- representatives_uptime 1795654803. Step 2 resets those watermarks, so the
-- next delta re-copies the later rows exactly from the VPS, and step 3
-- refuses to drop the old tables until every one of them is back.
--
-- Measured 2026-11-27: 510 M uptime rows, 151 M telemetry, 75 M
-- accounts_meta, 27 M telemetry_index, 10 M posts, 8.7 GB compressed and
-- about 200 GB uncompressed. Each 30-day chunk is compressed as soon as its
-- last day lands, so the copy needs a few GB free beyond the 8.7 GB of
-- finished copies. One recent day copies and verifies in well under a
-- second.

\set ON_ERROR_STOP on

-- 1. What to copy, per table: the source time column, the source select list
--    with each instant converted, the sibling's columns in the same order,
--    and the inclusive copy bound in source epoch seconds (null for the two
--    tables nothing writes any more).
CREATE TABLE IF NOT EXISTS public.epoch_conform_tables (
  table_name         text PRIMARY KEY,
  source_time_column text NOT NULL,
  source_select      text NOT NULL,
  target_time_column text NOT NULL,
  target_columns     text NOT NULL,
  copy_through       bigint
);

INSERT INTO public.epoch_conform_tables VALUES
('accounts_meta', 'timestamp',
 'account, balance, block_count, weight, delegators, to_timestamp("timestamp")',
 'observed_at',
 'account, balance, block_count, weight, delegators, observed_at',
 NULL),
('representatives_telemetry_index', 'timestamp',
 'account, weight, block_count, block_behind, cemented_count, cemented_behind, '
 'account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime, '
 'major_version, minor_version, patch_version, pre_release_version, maker, node_id, '
 'address, port, to_timestamp(telemetry_timestamp), to_timestamp("timestamp")',
 'observed_at',
 'account, weight, block_count, block_behind, cemented_count, cemented_behind, '
 'account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime, '
 'major_version, minor_version, patch_version, pre_release_version, maker, node_id, '
 'address, port, reported_at, observed_at',
 NULL),
('posts', 'created_at',
 'id, pid, sid, title, url, content_url, author, authorid, text, html, summary, score, '
 'social_score, to_timestamp(created_at), to_timestamp(updated_at)',
 'created_at',
 'id, pid, sid, title, url, content_url, author, authorid, text, html, summary, score, '
 'social_score, created_at, updated_at',
 1795653305),
('representatives_telemetry', 'timestamp',
 'account, weight, block_count, block_behind, cemented_count, cemented_behind, '
 'account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime, '
 'major_version, minor_version, patch_version, pre_release_version, maker, node_id, '
 'address, port, to_timestamp(telemetry_timestamp), to_timestamp("timestamp")',
 'observed_at',
 'account, weight, block_count, block_behind, cemented_count, cemented_behind, '
 'account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime, '
 'major_version, minor_version, patch_version, pre_release_version, maker, node_id, '
 'address, port, reported_at, observed_at',
 1795654502),
('representatives_uptime', 'timestamp',
 'account, online, to_timestamp("timestamp")',
 'observed_at',
 'account, online, observed_at',
 1795654803)
ON CONFLICT (table_name) DO NOTHING;

-- 2. Exact multiset equality of two row sets, every column compared.
CREATE OR REPLACE FUNCTION public.epoch_conform_assert_equal(
  label text, source_query text, target_query text)
RETURNS void LANGUAGE plpgsql AS
$fn$
DECLARE
  missing bigint;
  extra bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM ((%s) EXCEPT ALL (%s)) d', source_query, target_query)
    INTO missing;
  EXECUTE format('SELECT count(*) FROM ((%s) EXCEPT ALL (%s)) d', target_query, source_query)
    INTO extra;
  IF missing <> 0 OR extra <> 0 THEN
    RAISE EXCEPTION '%: % source rows missing from the copy, % copied rows not in the source',
      label, missing, extra;
  END IF;
END
$fn$;

-- 3. Copy and verify one UTC day of one table. A day already present in the
--    sibling was verified when it committed, and is skipped.
CREATE OR REPLACE FUNCTION public.epoch_conform_copy_day(
  conform_table text, day_began bigint)
RETURNS bigint LANGUAGE plpgsql AS
$fn$
DECLARE
  spec public.epoch_conform_tables;
  source_rows text;
  target_rows text;
  already_copied boolean;
  copied bigint;
BEGIN
  SELECT * INTO STRICT spec FROM public.epoch_conform_tables WHERE table_name = conform_table;
  source_rows := format('FROM public.%I WHERE %I >= %s AND %I < %s',
    spec.table_name, spec.source_time_column, day_began,
    spec.source_time_column, day_began + 86400);
  IF spec.copy_through IS NOT NULL THEN
    source_rows := source_rows || format(' AND %I <= %s', spec.source_time_column, spec.copy_through);
  END IF;
  target_rows := format('FROM public.%I WHERE %I >= to_timestamp(%s) AND %I < to_timestamp(%s)',
    spec.table_name || '_epoch_new', spec.target_time_column, day_began,
    spec.target_time_column, day_began + 86400);

  EXECUTE format('SELECT EXISTS (SELECT 1 %s)', target_rows) INTO already_copied;
  IF already_copied THEN
    RETURN 0;
  END IF;

  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s %s',
    spec.table_name || '_epoch_new', spec.target_columns, spec.source_select, source_rows);
  GET DIAGNOSTICS copied = ROW_COUNT;
  IF copied = 0 THEN
    RETURN 0;
  END IF;

  PERFORM public.epoch_conform_assert_equal(
    format('%s day %s', spec.table_name, to_timestamp(day_began)::date),
    format('SELECT %s %s', spec.source_select, source_rows),
    format('SELECT %s %s', spec.target_columns, target_rows));
  RETURN copied;
END
$fn$;

-- 4. Siblings, each created once. Index names carry a _new suffix until
--    step 2 renames them.
SELECT to_regclass('public.accounts_meta_epoch_new') IS NULL AS create_sibling \gset
\if :create_sibling
CREATE TABLE public.accounts_meta_epoch_new (LIKE public.accounts_meta INCLUDING DEFAULTS);
ALTER TABLE public.accounts_meta_epoch_new RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.accounts_meta_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);
SELECT create_hypertable('public.accounts_meta_epoch_new', 'observed_at',
  chunk_time_interval => INTERVAL '90 days');
CREATE UNIQUE INDEX accounts_meta_account_ts_uniq_new
  ON public.accounts_meta_epoch_new (account, observed_at);
ALTER TABLE public.accounts_meta_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
\endif

SELECT to_regclass('public.representatives_telemetry_index_epoch_new') IS NULL AS create_sibling \gset
\if :create_sibling
CREATE TABLE public.representatives_telemetry_index_epoch_new
  (LIKE public.representatives_telemetry_index INCLUDING DEFAULTS);
ALTER TABLE public.representatives_telemetry_index_epoch_new RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_telemetry_index_epoch_new RENAME COLUMN telemetry_timestamp TO reported_at;
ALTER TABLE public.representatives_telemetry_index_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at),
  ALTER COLUMN reported_at TYPE timestamptz USING to_timestamp(reported_at);
SELECT create_hypertable('public.representatives_telemetry_index_epoch_new', 'observed_at',
  chunk_time_interval => INTERVAL '30 days');
CREATE UNIQUE INDEX representatives_telemetry_index_node_ts_uniq_new
  ON public.representatives_telemetry_index_epoch_new (node_id, observed_at);
ALTER TABLE public.representatives_telemetry_index_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'node_id');
\endif

SELECT to_regclass('public.posts_epoch_new') IS NULL AS create_sibling \gset
\if :create_sibling
CREATE TABLE public.posts_epoch_new (LIKE public.posts INCLUDING DEFAULTS);
ALTER TABLE public.posts_epoch_new
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at);
SELECT create_hypertable('public.posts_epoch_new', 'created_at',
  chunk_time_interval => INTERVAL '30 days');
CREATE UNIQUE INDEX posts_id_created_uniq_new ON public.posts_epoch_new (id, created_at);
CREATE UNIQUE INDEX posts_url_created_uniq_new ON public.posts_epoch_new (url, created_at);
ALTER TABLE public.posts_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'created_at DESC');
\endif

SELECT to_regclass('public.representatives_telemetry_epoch_new') IS NULL AS create_sibling \gset
\if :create_sibling
CREATE TABLE public.representatives_telemetry_epoch_new
  (LIKE public.representatives_telemetry INCLUDING DEFAULTS);
ALTER TABLE public.representatives_telemetry_epoch_new RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_telemetry_epoch_new RENAME COLUMN telemetry_timestamp TO reported_at;
ALTER TABLE public.representatives_telemetry_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at),
  ALTER COLUMN reported_at TYPE timestamptz USING to_timestamp(reported_at);
SELECT create_hypertable('public.representatives_telemetry_epoch_new', 'observed_at',
  chunk_time_interval => INTERVAL '30 days');
CREATE UNIQUE INDEX representatives_telemetry_account_node_ts_uniq_new
  ON public.representatives_telemetry_epoch_new (account, node_id, observed_at);
CREATE INDEX representatives_telemetry_node_ts_new
  ON public.representatives_telemetry_epoch_new (node_id, observed_at);
ALTER TABLE public.representatives_telemetry_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
\endif

SELECT to_regclass('public.representatives_uptime_epoch_new') IS NULL AS create_sibling \gset
\if :create_sibling
CREATE TABLE public.representatives_uptime_epoch_new
  (LIKE public.representatives_uptime INCLUDING DEFAULTS);
ALTER TABLE public.representatives_uptime_epoch_new RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_uptime_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);
SELECT create_hypertable('public.representatives_uptime_epoch_new', 'observed_at',
  chunk_time_interval => INTERVAL '30 days');
CREATE UNIQUE INDEX representatives_uptime_account_ts_uniq_new
  ON public.representatives_uptime_epoch_new (account, observed_at);
ALTER TABLE public.representatives_uptime_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
\endif

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.accounts_meta_epoch_new,
  public.representatives_telemetry_index_epoch_new,
  public.posts_epoch_new,
  public.representatives_telemetry_epoch_new,
  public.representatives_uptime_epoch_new
TO nano_archive_writer;

-- 5. Copy, one day per statement, in day order over the days the source
--    chunks cover. After a chunk's last day, compress every sibling chunk it
--    has completed, so the uncompressed working set stays one chunk. The
--    generated statements run through \gexec, autocommitted one by one.
SELECT statement FROM (
  SELECT t.table_name, d AS position, 0 AS step,
    format('SELECT %L AS conform_table, to_timestamp(%s)::date AS day, '
           'public.epoch_conform_copy_day(%L, %s) AS copied',
           t.table_name, d, t.table_name, d) AS statement
  FROM public.epoch_conform_tables t
  JOIN timescaledb_information.chunks c
    ON c.hypertable_schema = 'public' AND c.hypertable_name = t.table_name
  CROSS JOIN LATERAL generate_series(c.range_start_integer, c.range_end_integer - 86400, 86400) AS d
  WHERE t.copy_through IS NULL OR d <= t.copy_through
  UNION ALL
  SELECT t.table_name, c.range_end_integer - 86400, 1,
    format('SELECT count(compress_chunk(chunk, if_not_compressed => true)) AS compressed '
           'FROM show_chunks(%L, older_than => to_timestamp(%s)) AS chunk',
           'public.' || t.table_name || '_epoch_new', c.range_end_integer)
  FROM public.epoch_conform_tables t
  JOIN timescaledb_information.chunks c
    ON c.hypertable_schema = 'public' AND c.hypertable_name = t.table_name
  WHERE (t.copy_through IS NULL OR c.range_end_integer <= t.copy_through)
    AND c.range_end_integer <= extract(epoch FROM now() - INTERVAL '7 days')
) generated
ORDER BY CASE table_name
  WHEN 'accounts_meta' THEN 1 WHEN 'representatives_telemetry_index' THEN 2
  WHEN 'posts' THEN 3 WHEN 'representatives_telemetry' THEN 4 ELSE 5 END,
  position, step \gexec

-- 6. Whole-table check: every source row up to the bound has its copy.
DO $do$
DECLARE
  spec public.epoch_conform_tables;
  source_count bigint;
  target_count bigint;
BEGIN
  FOR spec IN SELECT * FROM public.epoch_conform_tables ORDER BY table_name LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %s', spec.table_name,
      CASE WHEN spec.copy_through IS NULL THEN 'true'
           ELSE format('%I <= %s', spec.source_time_column, spec.copy_through) END)
      INTO source_count;
    EXECUTE format('SELECT count(*) FROM public.%I', spec.table_name || '_epoch_new')
      INTO target_count;
    IF source_count <> target_count THEN
      RAISE EXCEPTION '% copy count mismatch: source % copy %',
        spec.table_name, source_count, target_count;
    END IF;
    RAISE NOTICE '% copied: % rows', spec.table_name, target_count;
  END LOOP;
END
$do$;

SELECT 'step 1 complete: run step 2 with the delta lock still held' AS result;
