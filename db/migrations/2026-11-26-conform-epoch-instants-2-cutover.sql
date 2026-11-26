-- Conform epoch-integer instants to timestamptz — step 2 of 3: cutover.
--
-- Run only after step 1 finished and with every writer stopped: pm2 stop
-- server, pm2 stop network-observer, and the crons that write these tables
-- paused (import-telemetry, import-uptime, import-accounts-meta,
-- detect-telemetry-network-events, probe-representative-rpc, the subreddit,
-- forum, discord imports). The code that reads and writes the new columns
-- deploys right after this script; the old code cannot run against the new
-- tables and the new code cannot run against the old.
--
-- Apply on nano-community as postgres, with a lock timeout so a stuck
-- reader fails the cutover instead of queueing the site behind it:
--   PGOPTIONS='-c lock_timeout=30s' sudo -n --preserve-env=PGOPTIONS -u postgres \
--     psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-epoch-instants-2-cutover.sql
--
-- One transaction: tail copy of the rows since step 1's cutoff, verification,
-- table swap, policy move, and the type change of posts, network_events and
-- network_event_coverage (plain tables, rewritten in place: posts is 41 k rows
-- and 33 MB, the two network tables 558 and 17 k rows). Any failure rolls the
-- whole transaction back and leaves the old tables serving. Expected time with
-- writers stopped: under a minute, during which the tables hold ACCESS
-- EXCLUSIVE locks. The continuous aggregate is dropped inside the
-- transaction and rebuilt after it commits; the rebuild's full refresh scans
-- accounts_meta and takes a few minutes, and delegation_history is slow
-- until it ends, so keep the server stopped until it prints done.
--
-- The old tables stay as <table>_epoch_old for the rollback script until
-- step 3 drops them.

\set ON_ERROR_STOP on

SELECT extract(epoch FROM state_value)::bigint AS cutoff_epoch
FROM public.epoch_conform_state WHERE state_name = 'copy_cutoff_at' \gset

BEGIN;
SET LOCAL lock_timeout = '30s';

LOCK TABLE public.representatives_uptime, public.representatives_telemetry,
  public.accounts_meta, public.posts, public.network_events,
  public.network_event_coverage IN ACCESS EXCLUSIVE MODE;

-- 1. Tail copy: everything from the step 1 cutoff on.
INSERT INTO public.representatives_uptime_epoch_new (account, online, observed_at)
SELECT account, online, to_timestamp("timestamp")
FROM public.representatives_uptime WHERE "timestamp" >= :cutoff_epoch;

INSERT INTO public.representatives_telemetry_epoch_new (account, weight, block_count,
  block_behind, cemented_count, cemented_behind, account_count, unchecked_count,
  bandwidth_cap, peer_count, protocol_version, uptime, major_version, minor_version,
  patch_version, pre_release_version, maker, node_id, address, port, reported_at, observed_at)
SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind,
  account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime,
  major_version, minor_version, patch_version, pre_release_version, maker, node_id,
  address, port, to_timestamp(telemetry_timestamp), to_timestamp("timestamp")
FROM public.representatives_telemetry WHERE "timestamp" >= :cutoff_epoch;

INSERT INTO public.accounts_meta_epoch_new (account, balance, block_count, weight, delegators, observed_at)
SELECT account, balance, block_count, weight, delegators, to_timestamp("timestamp")
FROM public.accounts_meta WHERE "timestamp" >= :cutoff_epoch;

-- 2. Verify the tail, and the whole of the two small tables.
DO $do$
DECLARE
  cutoff bigint := (
    SELECT extract(epoch FROM state_value)::bigint
    FROM public.epoch_conform_state WHERE state_name = 'copy_cutoff_at');
  old_count bigint;
  new_count bigint;
BEGIN
  SELECT count(*) INTO old_count FROM public.representatives_uptime WHERE "timestamp" >= cutoff;
  SELECT count(*) INTO new_count FROM public.representatives_uptime_epoch_new WHERE observed_at >= to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'representatives_uptime tail mismatch: old % new %', old_count, new_count;
  END IF;

  SELECT count(*) INTO old_count FROM public.representatives_telemetry WHERE "timestamp" >= cutoff;
  SELECT count(*) INTO new_count FROM public.representatives_telemetry_epoch_new WHERE observed_at >= to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'representatives_telemetry tail mismatch: old % new %', old_count, new_count;
  END IF;

  SELECT count(*) INTO old_count FROM public.accounts_meta WHERE "timestamp" >= cutoff;
  SELECT count(*) INTO new_count FROM public.accounts_meta_epoch_new WHERE observed_at >= to_timestamp(cutoff);
  IF old_count <> new_count THEN
    RAISE EXCEPTION 'accounts_meta tail mismatch: old % new %', old_count, new_count;
  END IF;
END
$do$;

-- 3. Retire the continuous aggregate and the old policies.
DROP MATERIALIZED VIEW public.accounts_meta_rollup_day;
SELECT remove_compression_policy('public.representatives_uptime');
SELECT remove_retention_policy('public.representatives_uptime');
SELECT remove_compression_policy('public.representatives_telemetry');
SELECT remove_retention_policy('public.representatives_telemetry');
SELECT remove_compression_policy('public.accounts_meta');

-- 4. Swap. The old tables and their indexes keep an _epoch_old suffix.
ALTER INDEX public.representatives_uptime_account_ts_uniq RENAME TO representatives_uptime_account_ts_uniq_epoch_old;
ALTER INDEX public.representatives_uptime_online RENAME TO representatives_uptime_online_epoch_old;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq RENAME TO representatives_telemetry_account_node_ts_uniq_epoch_old;
ALTER INDEX public.accounts_meta_account_ts_uniq RENAME TO accounts_meta_account_ts_uniq_epoch_old;

ALTER TABLE public.representatives_uptime RENAME TO representatives_uptime_epoch_old;
ALTER TABLE public.representatives_telemetry RENAME TO representatives_telemetry_epoch_old;
ALTER TABLE public.accounts_meta RENAME TO accounts_meta_epoch_old;

ALTER TABLE public.representatives_uptime_epoch_new RENAME TO representatives_uptime;
ALTER TABLE public.representatives_telemetry_epoch_new RENAME TO representatives_telemetry;
ALTER TABLE public.accounts_meta_epoch_new RENAME TO accounts_meta;

ALTER INDEX public.representatives_uptime_account_ts_uniq_new RENAME TO representatives_uptime_account_ts_uniq;
ALTER INDEX public.representatives_uptime_online_new RENAME TO representatives_uptime_online;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq_new RENAME TO representatives_telemetry_account_node_ts_uniq;
ALTER INDEX public.accounts_meta_account_ts_uniq_new RENAME TO accounts_meta_account_ts_uniq;

-- 5. Policies on the new hypertables, as db/schema.postgres.sql declares them.
SELECT add_compression_policy('public.representatives_uptime', INTERVAL '7 days');
SELECT add_compression_policy('public.representatives_telemetry', INTERVAL '7 days');
SELECT add_compression_policy('public.accounts_meta', INTERVAL '7 days');
SELECT add_retention_policy('public.representatives_uptime', INTERVAL '12 weeks');
SELECT add_retention_policy('public.representatives_telemetry', INTERVAL '6 weeks');

-- 6. Plain tables, rewritten in place. A rewrite fires no row triggers, so
--    refuse_network_event_update does not object.
ALTER TABLE public.posts
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at);

ALTER TABLE public.network_events ALTER COLUMN recorded_at DROP DEFAULT;
ALTER TABLE public.network_events
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at),
  ALTER COLUMN recorded_at TYPE timestamptz USING to_timestamp(recorded_at);
ALTER TABLE public.network_events ALTER COLUMN recorded_at SET DEFAULT now();

ALTER TABLE public.network_event_coverage ALTER COLUMN recorded_at DROP DEFAULT;
ALTER TABLE public.network_event_coverage
  ALTER COLUMN coverage_began_at TYPE timestamptz USING to_timestamp(coverage_began_at),
  ALTER COLUMN coverage_ended_at TYPE timestamptz USING to_timestamp(coverage_ended_at),
  ALTER COLUMN recorded_at TYPE timestamptz USING to_timestamp(recorded_at);
ALTER TABLE public.network_event_coverage ALTER COLUMN recorded_at SET DEFAULT now();

INSERT INTO public.epoch_conform_state (state_name, state_value)
VALUES ('cutover_at', now());

COMMIT;

-- 7. Rebuild the delegation rollup over the new hypertable and fill it.
--    Outside the transaction: a refresh cannot run inside one.
CREATE MATERIALIZED VIEW public.accounts_meta_rollup_day
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  account,
  time_bucket(INTERVAL '1 day', observed_at) AS day_began_at,
  last(weight, observed_at) AS weight,
  last(delegators, observed_at) FILTER (WHERE delegators IS NOT NULL) AS delegators
FROM public.accounts_meta
GROUP BY account, time_bucket(INTERVAL '1 day', observed_at)
WITH NO DATA;

SELECT add_continuous_aggregate_policy('public.accounts_meta_rollup_day',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 hour');

CALL refresh_continuous_aggregate('public.accounts_meta_rollup_day', NULL, now() - INTERVAL '1 day');

SELECT 'step 2 complete: deploy the new code, then start the writers' AS done;
