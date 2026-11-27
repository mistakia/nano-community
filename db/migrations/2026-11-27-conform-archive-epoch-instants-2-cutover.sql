-- Conform the archive's epoch-integer instants to timestamptz — step 2 of 3:
-- cutover.
--
-- Run only after step 1 completed, with the archive delta lock on
-- base-storage still held (/tmp/nano-community-archive.lock), and deploy the
-- delta that reads the new columns (scripts/archive-to-postgres.mjs) to the
-- base-storage checkout before the lock is released: the old delta cannot
-- run against the new tables.
--
-- Apply on database-server as postgres:
--   ssh database 'sudo -n -u postgres psql -d nano_community_archive -v ON_ERROR_STOP=1 -f -' \
--     < db/migrations/2026-11-27-conform-archive-epoch-instants-2-cutover.sql
--
-- One transaction: recheck the hypertable copies, copy and verify the three
-- plain tables (network_events, network_event_coverage, etl_state) into
-- timestamptz siblings, swap every table, and move the compression policies.
-- Nothing else writes the archive, so it takes seconds beyond the recount.
-- Any failure rolls the whole transaction back and leaves the old tables in
-- place.
--
-- Copy bound, as in step 1: the plain tables take the network rows at or
-- before the sequence watermark they had before the 2026-11-27 01:00 UTC
-- delta run (network_events 16347, network_event_coverage 16899), and
-- etl_state sets every delta table's watermark to that pre-run value. The
-- next delta re-copies the later rows from the VPS with their sub-second
-- instants.
--
-- Every old table stays as <table>_epoch_old for the rollback script until
-- step 3 drops it.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '30s';

LOCK TABLE public.accounts_meta, public.representatives_telemetry_index,
  public.posts, public.representatives_telemetry, public.representatives_uptime,
  public.network_events, public.network_event_coverage, public.etl_state
  IN ACCESS EXCLUSIVE MODE;

-- 1. Recheck the hypertable copies: every source row up to the bound has
--    its copy. Step 1 verified each day row for row.
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
  END LOOP;
END
$do$;

-- 2. Plain tables: the old table and its indexes take an _epoch_old suffix,
--    and a timestamptz table as db/schema.archive.postgres.sql declares it
--    takes the name.
ALTER TABLE public.network_events RENAME TO network_events_epoch_old;
ALTER INDEX public.network_events_pkey RENAME TO network_events_pkey_epoch_old;
ALTER INDEX public.network_events_observed_at_idx RENAME TO network_events_observed_at_idx_epoch_old;
ALTER INDEX public.network_events_recorded_at_idx RENAME TO network_events_recorded_at_idx_epoch_old;
ALTER INDEX public.network_events_sequence_idx RENAME TO network_events_sequence_idx_epoch_old;

CREATE TABLE public.network_events (
  network_event_id           text PRIMARY KEY,
  network_event_type         text NOT NULL,
  network_event_phase        text NOT NULL
    CHECK (network_event_phase IN ('began', 'ended', 'occurred')),
  severity                   text NOT NULL
    CHECK (severity IN ('info', 'warning', 'critical')),
  representative_account     char(65),
  peer_address               varchar(65),
  node_id                    char(65),
  evidence                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at                timestamptz NOT NULL,
  recorded_at                timestamptz NOT NULL,
  network_event_sequence     bigint,
  network_event_condition_id text
);
CREATE INDEX network_events_observed_at_idx ON public.network_events (observed_at DESC);
CREATE INDEX network_events_recorded_at_idx ON public.network_events (recorded_at);
CREATE INDEX network_events_sequence_idx ON public.network_events (network_event_sequence);

INSERT INTO public.network_events (network_event_id, network_event_type,
  network_event_phase, severity, representative_account, peer_address, node_id,
  evidence, observed_at, recorded_at, network_event_sequence, network_event_condition_id)
SELECT network_event_id, network_event_type, network_event_phase, severity,
  representative_account, peer_address, node_id, evidence, to_timestamp(observed_at),
  to_timestamp(recorded_at), network_event_sequence, network_event_condition_id
FROM public.network_events_epoch_old
WHERE network_event_sequence <= 16347;

SELECT public.epoch_conform_assert_equal('network_events',
  'SELECT network_event_id, network_event_type, network_event_phase, severity, '
  'representative_account, peer_address, node_id, evidence, to_timestamp(observed_at), '
  'to_timestamp(recorded_at), network_event_sequence, network_event_condition_id '
  'FROM public.network_events_epoch_old WHERE network_event_sequence <= 16347',
  'SELECT network_event_id, network_event_type, network_event_phase, severity, '
  'representative_account, peer_address, node_id, evidence, observed_at, recorded_at, '
  'network_event_sequence, network_event_condition_id FROM public.network_events');

ALTER TABLE public.network_event_coverage RENAME TO network_event_coverage_epoch_old;
ALTER INDEX public.network_event_coverage_pkey RENAME TO network_event_coverage_pkey_epoch_old;

CREATE TABLE public.network_event_coverage (
  network_event_coverage_sequence bigint PRIMARY KEY,
  producer          text NOT NULL,
  coverage_began_at timestamptz NOT NULL,
  coverage_ended_at timestamptz NOT NULL,
  recorded_at       timestamptz NOT NULL
);

INSERT INTO public.network_event_coverage (network_event_coverage_sequence, producer,
  coverage_began_at, coverage_ended_at, recorded_at)
SELECT network_event_coverage_sequence, producer, to_timestamp(coverage_began_at),
  to_timestamp(coverage_ended_at), to_timestamp(recorded_at)
FROM public.network_event_coverage_epoch_old
WHERE network_event_coverage_sequence <= 16899;

SELECT public.epoch_conform_assert_equal('network_event_coverage',
  'SELECT network_event_coverage_sequence, producer, to_timestamp(coverage_began_at), '
  'to_timestamp(coverage_ended_at), to_timestamp(recorded_at) '
  'FROM public.network_event_coverage_epoch_old WHERE network_event_coverage_sequence <= 16899',
  'SELECT network_event_coverage_sequence, producer, coverage_began_at, coverage_ended_at, '
  'recorded_at FROM public.network_event_coverage');

-- etl_state: last_max_ts held epoch seconds for a table read by an instant
-- and a delivery sequence for the two network tables; each kind gets its
-- own typed column. The delta tables restart from their pre-run watermark.
ALTER TABLE public.etl_state RENAME TO etl_state_epoch_old;
ALTER INDEX public.etl_state_pkey RENAME TO etl_state_pkey_epoch_old;

CREATE TABLE public.etl_state (
  table_name         text PRIMARY KEY,
  rows_extracted     bigint NOT NULL DEFAULT 0,
  rows_inserted      bigint NOT NULL DEFAULT 0,
  watermark_at       timestamptz,
  watermark_sequence bigint,
  started_at         timestamptz,
  completed_at       timestamptz,
  notes              text,
  CHECK (watermark_at IS NULL OR watermark_sequence IS NULL)
);

CREATE TEMP TABLE epoch_conform_watermark (table_name text PRIMARY KEY, watermark bigint NOT NULL)
  ON COMMIT DROP;
INSERT INTO epoch_conform_watermark VALUES
  ('posts', 1795653305),
  ('representatives_telemetry', 1795654502),
  ('representatives_uptime', 1795654803),
  ('network_events', 16347),
  ('network_event_coverage', 16899);

CREATE TEMP VIEW epoch_conform_etl_state AS
SELECT s.table_name, s.rows_extracted, s.rows_inserted,
  CASE WHEN s.table_name IN ('network_events', 'network_event_coverage') THEN NULL
       ELSE to_timestamp(coalesce(w.watermark, s.last_max_ts)) END AS watermark_at,
  CASE WHEN s.table_name IN ('network_events', 'network_event_coverage')
       THEN coalesce(w.watermark, s.last_max_ts) END AS watermark_sequence,
  s.started_at, s.completed_at,
  CASE WHEN w.watermark IS NULL THEN s.notes
       ELSE concat_ws('; ', s.notes, 'watermark reset by the 2026-11-27 timestamptz conform') END AS notes
FROM public.etl_state_epoch_old s
LEFT JOIN epoch_conform_watermark w USING (table_name);

INSERT INTO public.etl_state (table_name, rows_extracted, rows_inserted, watermark_at,
  watermark_sequence, started_at, completed_at, notes)
SELECT * FROM epoch_conform_etl_state;

SELECT public.epoch_conform_assert_equal('etl_state',
  'SELECT * FROM epoch_conform_etl_state',
  'SELECT table_name, rows_extracted, rows_inserted, watermark_at, watermark_sequence, '
  'started_at, completed_at, notes FROM public.etl_state');
DROP VIEW epoch_conform_etl_state;

-- 3. Retire the old compression policies.
SELECT remove_compression_policy('public.accounts_meta');
SELECT remove_compression_policy('public.representatives_telemetry_index');
SELECT remove_compression_policy('public.posts');
SELECT remove_compression_policy('public.representatives_telemetry');
SELECT remove_compression_policy('public.representatives_uptime');

-- 4. Swap the hypertables. The old tables and their indexes take an
--    _epoch_old suffix; the siblings and their indexes take the names a
--    fresh apply of db/schema.archive.postgres.sql gives them.
ALTER INDEX public.accounts_meta_account_ts_uniq RENAME TO accounts_meta_account_ts_uniq_epoch_old;
ALTER INDEX public.accounts_meta_timestamp_idx RENAME TO accounts_meta_timestamp_idx_epoch_old;
ALTER INDEX public.representatives_telemetry_index_node_ts_uniq RENAME TO representatives_telemetry_index_node_ts_uniq_epoch_old;
ALTER INDEX public.representatives_telemetry_index_timestamp_idx RENAME TO representatives_telemetry_index_timestamp_idx_epoch_old;
ALTER INDEX public.posts_id_created_uniq RENAME TO posts_id_created_uniq_epoch_old;
ALTER INDEX public.posts_url_created_uniq RENAME TO posts_url_created_uniq_epoch_old;
ALTER INDEX public.posts_created_at_idx RENAME TO posts_created_at_idx_epoch_old;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq RENAME TO representatives_telemetry_account_node_ts_uniq_epoch_old;
ALTER INDEX public.representatives_telemetry_node_ts RENAME TO representatives_telemetry_node_ts_epoch_old;
ALTER INDEX public.representatives_telemetry_timestamp_idx RENAME TO representatives_telemetry_timestamp_idx_epoch_old;
ALTER INDEX public.representatives_uptime_account_ts_uniq RENAME TO representatives_uptime_account_ts_uniq_epoch_old;
ALTER INDEX public.representatives_uptime_timestamp_idx RENAME TO representatives_uptime_timestamp_idx_epoch_old;

ALTER TABLE public.accounts_meta RENAME TO accounts_meta_epoch_old;
ALTER TABLE public.representatives_telemetry_index RENAME TO representatives_telemetry_index_epoch_old;
ALTER TABLE public.posts RENAME TO posts_epoch_old;
ALTER TABLE public.representatives_telemetry RENAME TO representatives_telemetry_epoch_old;
ALTER TABLE public.representatives_uptime RENAME TO representatives_uptime_epoch_old;

ALTER TABLE public.accounts_meta_epoch_new RENAME TO accounts_meta;
ALTER TABLE public.representatives_telemetry_index_epoch_new RENAME TO representatives_telemetry_index;
ALTER TABLE public.posts_epoch_new RENAME TO posts;
ALTER TABLE public.representatives_telemetry_epoch_new RENAME TO representatives_telemetry;
ALTER TABLE public.representatives_uptime_epoch_new RENAME TO representatives_uptime;

ALTER INDEX public.accounts_meta_account_ts_uniq_new RENAME TO accounts_meta_account_ts_uniq;
ALTER INDEX public.accounts_meta_epoch_new_observed_at_idx RENAME TO accounts_meta_observed_at_idx;
ALTER INDEX public.representatives_telemetry_index_node_ts_uniq_new RENAME TO representatives_telemetry_index_node_ts_uniq;
ALTER INDEX public.representatives_telemetry_index_epoch_new_observed_at_idx RENAME TO representatives_telemetry_index_observed_at_idx;
ALTER INDEX public.posts_id_created_uniq_new RENAME TO posts_id_created_uniq;
ALTER INDEX public.posts_url_created_uniq_new RENAME TO posts_url_created_uniq;
ALTER INDEX public.posts_epoch_new_created_at_idx RENAME TO posts_created_at_idx;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq_new RENAME TO representatives_telemetry_account_node_ts_uniq;
ALTER INDEX public.representatives_telemetry_node_ts_new RENAME TO representatives_telemetry_node_ts;
ALTER INDEX public.representatives_telemetry_epoch_new_observed_at_idx RENAME TO representatives_telemetry_observed_at_idx;
ALTER INDEX public.representatives_uptime_account_ts_uniq_new RENAME TO representatives_uptime_account_ts_uniq;
ALTER INDEX public.representatives_uptime_epoch_new_observed_at_idx RENAME TO representatives_uptime_observed_at_idx;

-- 5. Policies on the new hypertables, as db/schema.archive.postgres.sql
--    declares them.
SELECT add_compression_policy('public.accounts_meta', INTERVAL '7 days');
SELECT add_compression_policy('public.representatives_telemetry_index', INTERVAL '7 days');
SELECT add_compression_policy('public.posts', INTERVAL '7 days');
SELECT add_compression_policy('public.representatives_telemetry', INTERVAL '7 days');
SELECT add_compression_policy('public.representatives_uptime', INTERVAL '7 days');

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.network_events, public.network_event_coverage, public.etl_state
TO nano_archive_writer;

COMMIT;

SELECT 'step 2 complete: deploy the new delta, then release the lock' AS done;
