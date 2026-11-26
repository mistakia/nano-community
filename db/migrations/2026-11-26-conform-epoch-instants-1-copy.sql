-- Conform epoch-integer instants to timestamptz — step 1 of 3: online copy.
--
-- Builds timestamptz copies of the three hypertables and fills them with the
-- history, a day at a time. Takes no lock on the live tables and changes
-- nothing the running code reads, so it runs while the site and every writer
-- stay up. Not resumable: if it stops partway, drop the three
-- <table>_epoch_new siblings and public.epoch_conform_state, then rerun (the
-- unique indexes cannot dedupe rows whose account is NULL).
--
-- Apply on nano-community as postgres:
--   sudo -n -u postgres psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-epoch-instants-1-copy.sql
-- Not during the weekly backup dump (Sunday 00:00 UTC, about 25 minutes).
--
-- Hypertables cannot change the type of their partition column in place, so
-- each gets a sibling <table>_epoch_new, swapped in by step 2. New column
-- names: observed_at (was timestamp, all three tables) and reported_at (was
-- representatives_telemetry.telemetry_timestamp).
--
-- Expected runtime: representatives_uptime 4.3 M rows and
-- representatives_telemetry 1.9 M rows take a few minutes each;
-- accounts_meta 80 M rows over 1957 daily chunks takes roughly 30 to 60
-- minutes. Free disk needed while it runs: the day being copied is
-- uncompressed before it is compressed, so a few GB beyond the 1 GB of
-- finished copies. Run it in a bgjob session, not an attended pane.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS public.epoch_conform_state (
  state_name  text PRIMARY KEY,
  state_value timestamptz NOT NULL
);

-- Rows older than the cutoff are copied here; step 2 copies the rest.
INSERT INTO public.epoch_conform_state (state_name, state_value)
VALUES ('copy_cutoff_at',
        to_timestamp(floor(extract(epoch FROM now()) / 86400) * 86400));

SELECT state_value AS copy_cutoff_at FROM public.epoch_conform_state
WHERE state_name = 'copy_cutoff_at' \gset
SELECT extract(epoch FROM :'copy_cutoff_at'::timestamptz)::bigint AS cutoff_epoch \gset

-- 1. Sibling tables. Indexes carry a _new suffix until step 2 renames them.
DO $do$
BEGIN
  IF to_regclass('public.representatives_uptime_epoch_new') IS NOT NULL
    OR to_regclass('public.representatives_telemetry_epoch_new') IS NOT NULL
    OR to_regclass('public.accounts_meta_epoch_new') IS NOT NULL THEN
    RAISE EXCEPTION 'an _epoch_new sibling already exists; see the header';
  END IF;
END
$do$;

CREATE TABLE public.representatives_uptime_epoch_new
  (LIKE public.representatives_uptime INCLUDING DEFAULTS);
ALTER TABLE public.representatives_uptime_epoch_new
  RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_uptime_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);
SELECT create_hypertable('public.representatives_uptime_epoch_new',
  'observed_at', chunk_time_interval => INTERVAL '1 day');
CREATE UNIQUE INDEX representatives_uptime_account_ts_uniq_new
  ON public.representatives_uptime_epoch_new (account, observed_at);
CREATE INDEX representatives_uptime_online_new
  ON public.representatives_uptime_epoch_new (online);
ALTER TABLE public.representatives_uptime_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');

CREATE TABLE public.representatives_telemetry_epoch_new
  (LIKE public.representatives_telemetry INCLUDING DEFAULTS);
ALTER TABLE public.representatives_telemetry_epoch_new
  RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_telemetry_epoch_new
  RENAME COLUMN telemetry_timestamp TO reported_at;
ALTER TABLE public.representatives_telemetry_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at),
  ALTER COLUMN reported_at TYPE timestamptz USING to_timestamp(reported_at);
SELECT create_hypertable('public.representatives_telemetry_epoch_new',
  'observed_at', chunk_time_interval => INTERVAL '1 day');
CREATE UNIQUE INDEX representatives_telemetry_account_node_ts_uniq_new
  ON public.representatives_telemetry_epoch_new (account, node_id, observed_at);
ALTER TABLE public.representatives_telemetry_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');

CREATE TABLE public.accounts_meta_epoch_new
  (LIKE public.accounts_meta INCLUDING DEFAULTS);
ALTER TABLE public.accounts_meta_epoch_new
  RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.accounts_meta_epoch_new
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);
SELECT create_hypertable('public.accounts_meta_epoch_new',
  'observed_at', chunk_time_interval => INTERVAL '1 day');
CREATE UNIQUE INDEX accounts_meta_account_ts_uniq_new
  ON public.accounts_meta_epoch_new (account, observed_at);
ALTER TABLE public.accounts_meta_epoch_new SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.representatives_uptime_epoch_new,
  public.representatives_telemetry_epoch_new,
  public.accounts_meta_epoch_new
TO nano_production_app;
GRANT SELECT ON
  public.representatives_uptime_epoch_new,
  public.representatives_telemetry_epoch_new,
  public.accounts_meta_epoch_new
TO nano_production_reader, nano_production_backup;

-- 2. Copy, one UTC day at a time, each day in its own transaction and
--    compressed as soon as it lands when it is older than the 7-day
--    compression policy. Days already copied are skipped by the unique index.
--    The generated statements run through \gexec, in day order.
--
--    One block per table. A failed statement stops the script.

-- representatives_uptime
SELECT format(
  'INSERT INTO public.representatives_uptime_epoch_new (account, online, observed_at) '
  'SELECT account, online, to_timestamp("timestamp") FROM public.representatives_uptime '
  'WHERE "timestamp" >= %1$s AND "timestamp" < %2$s',
  d, d + 86400)
FROM generate_series(
  (SELECT min("timestamp") / 86400 * 86400 FROM public.representatives_uptime),
  :cutoff_epoch - 86400, 86400) AS d
ORDER BY d \gexec

-- representatives_telemetry
SELECT format(
  'INSERT INTO public.representatives_telemetry_epoch_new (account, weight, block_count, '
  'block_behind, cemented_count, cemented_behind, account_count, unchecked_count, '
  'bandwidth_cap, peer_count, protocol_version, uptime, major_version, minor_version, '
  'patch_version, pre_release_version, maker, node_id, address, port, reported_at, observed_at) '
  'SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind, '
  'account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime, '
  'major_version, minor_version, patch_version, pre_release_version, maker, node_id, '
  'address, port, to_timestamp(telemetry_timestamp), to_timestamp("timestamp") '
  'FROM public.representatives_telemetry '
  'WHERE "timestamp" >= %1$s AND "timestamp" < %2$s',
  d, d + 86400)
FROM generate_series(
  (SELECT min("timestamp") / 86400 * 86400 FROM public.representatives_telemetry),
  :cutoff_epoch - 86400, 86400) AS d
ORDER BY d \gexec

-- accounts_meta
SELECT format(
  'INSERT INTO public.accounts_meta_epoch_new (account, balance, block_count, weight, delegators, observed_at) '
  'SELECT account, balance, block_count, weight, delegators, to_timestamp("timestamp") '
  'FROM public.accounts_meta '
  'WHERE "timestamp" >= %1$s AND "timestamp" < %2$s',
  d, d + 86400)
FROM generate_series(
  (SELECT min("timestamp") / 86400 * 86400 FROM public.accounts_meta),
  :cutoff_epoch - 86400, 86400) AS d
ORDER BY d \gexec

-- 3. Compress every copied chunk older than 7 days, as the policy will once
--    it is attached in step 2. Uncompressed copies of 80 M rows are several
--    GB, so compress before the verification scan.
SELECT format('SELECT compress_chunk(%L, if_not_compressed => true)', c)
FROM show_chunks('public.accounts_meta_epoch_new', older_than => INTERVAL '7 days') AS c \gexec
SELECT format('SELECT compress_chunk(%L, if_not_compressed => true)', c)
FROM show_chunks('public.representatives_telemetry_epoch_new', older_than => INTERVAL '7 days') AS c \gexec
SELECT format('SELECT compress_chunk(%L, if_not_compressed => true)', c)
FROM show_chunks('public.representatives_uptime_epoch_new', older_than => INTERVAL '7 days') AS c \gexec

-- 4. Verify the copied range. The retained tables lose old chunks to the
--    retention policies while this runs, so telemetry and uptime are
--    compared only over a window well inside their retention (4 and 10
--    weeks); accounts_meta has no retention and is compared in full.
DO $do$
DECLARE
  cutoff bigint := (
    SELECT extract(epoch FROM state_value)::bigint
    FROM public.epoch_conform_state WHERE state_name = 'copy_cutoff_at');
  old_count bigint;
  new_count bigint;
BEGIN
  SELECT count(*) INTO old_count FROM public.accounts_meta WHERE "timestamp" < cutoff;
  SELECT count(*) INTO new_count FROM public.accounts_meta_epoch_new WHERE observed_at < to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'accounts_meta copy mismatch: old % new %', old_count, new_count;
  END IF;

  SELECT count(*) INTO old_count FROM public.representatives_telemetry
    WHERE "timestamp" >= cutoff - 4 * 7 * 86400 AND "timestamp" < cutoff;
  SELECT count(*) INTO new_count FROM public.representatives_telemetry_epoch_new
    WHERE observed_at >= to_timestamp(cutoff - 4 * 7 * 86400) AND observed_at < to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'representatives_telemetry copy mismatch: old % new %', old_count, new_count;
  END IF;

  SELECT count(*) INTO old_count FROM public.representatives_uptime
    WHERE "timestamp" >= cutoff - 10 * 7 * 86400 AND "timestamp" < cutoff;
  SELECT count(*) INTO new_count FROM public.representatives_uptime_epoch_new
    WHERE observed_at >= to_timestamp(cutoff - 10 * 7 * 86400) AND observed_at < to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'representatives_uptime copy mismatch: old % new %', old_count, new_count;
  END IF;
END
$do$;

SELECT 'step 1 complete: copied everything before ' || :'copy_cutoff_at' AS result;
