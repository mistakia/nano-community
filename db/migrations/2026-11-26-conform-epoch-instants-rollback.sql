-- Rollback for 2026-11-26-conform-epoch-instants: restores the epoch-integer
-- tables and columns. Valid only before step 3 dropped the _epoch_old tables.
-- Same preconditions as step 2: every writer stopped, then the previous code
-- deployed before the writers start again.
--
--   PGOPTIONS='-c lock_timeout=30s' sudo -n --preserve-env=PGOPTIONS -u postgres \
--     psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-epoch-instants-rollback.sql
--
-- Rows written after the cutover are copied back into the old tables first,
-- so nothing recorded since is lost. Their instants lose sub-second
-- precision, as epoch integers carry whole seconds. The delegation rollup is
-- rebuilt as step 2 left it, over the restored table, with its integer
-- "timestamp" bucket.

\set ON_ERROR_STOP on

SELECT extract(epoch FROM state_value)::bigint AS cutover_epoch
FROM public.epoch_conform_state WHERE state_name = 'cutover_at' \gset

BEGIN;
SET LOCAL lock_timeout = '30s';

LOCK TABLE public.representatives_uptime, public.representatives_telemetry,
  public.accounts_meta, public.posts, public.network_events,
  public.network_event_coverage IN ACCESS EXCLUSIVE MODE;

-- 1. Rows written since the cutover go back to the old tables. The old
--    tables already hold everything copied before the cutover transaction,
--    so only rows at or after the cutover instant are new.
INSERT INTO public.representatives_uptime_epoch_old (account, online, "timestamp")
SELECT account, online, extract(epoch FROM observed_at)::integer
FROM public.representatives_uptime WHERE observed_at >= to_timestamp(:cutover_epoch)
ON CONFLICT DO NOTHING;

INSERT INTO public.representatives_telemetry_epoch_old (account, weight, block_count,
  block_behind, cemented_count, cemented_behind, account_count, unchecked_count,
  bandwidth_cap, peer_count, protocol_version, uptime, major_version, minor_version,
  patch_version, pre_release_version, maker, node_id, address, port,
  telemetry_timestamp, "timestamp")
SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind,
  account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime,
  major_version, minor_version, patch_version, pre_release_version, maker, node_id,
  address, port, extract(epoch FROM reported_at)::integer,
  extract(epoch FROM observed_at)::integer
FROM public.representatives_telemetry WHERE observed_at >= to_timestamp(:cutover_epoch)
ON CONFLICT DO NOTHING;

INSERT INTO public.accounts_meta_epoch_old (account, balance, block_count, weight, delegators, "timestamp")
SELECT account, balance, block_count, weight, delegators, extract(epoch FROM observed_at)::integer
FROM public.accounts_meta WHERE observed_at >= to_timestamp(:cutover_epoch)
ON CONFLICT DO NOTHING;

-- 2. Retire the new hypertables and their rollup.
DROP MATERIALIZED VIEW public.accounts_meta_rollup_day;
SELECT remove_compression_policy('public.representatives_uptime');
SELECT remove_retention_policy('public.representatives_uptime');
SELECT remove_compression_policy('public.representatives_telemetry');
SELECT remove_retention_policy('public.representatives_telemetry');
SELECT remove_compression_policy('public.accounts_meta');

ALTER INDEX public.representatives_uptime_account_ts_uniq RENAME TO representatives_uptime_account_ts_uniq_new;
ALTER INDEX public.representatives_uptime_online RENAME TO representatives_uptime_online_new;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq RENAME TO representatives_telemetry_account_node_ts_uniq_new;
ALTER INDEX public.accounts_meta_account_ts_uniq RENAME TO accounts_meta_account_ts_uniq_new;

ALTER TABLE public.representatives_uptime RENAME TO representatives_uptime_epoch_new;
ALTER TABLE public.representatives_telemetry RENAME TO representatives_telemetry_epoch_new;
ALTER TABLE public.accounts_meta RENAME TO accounts_meta_epoch_new;

ALTER TABLE public.representatives_uptime_epoch_old RENAME TO representatives_uptime;
ALTER TABLE public.representatives_telemetry_epoch_old RENAME TO representatives_telemetry;
ALTER TABLE public.accounts_meta_epoch_old RENAME TO accounts_meta;

ALTER INDEX public.representatives_uptime_account_ts_uniq_epoch_old RENAME TO representatives_uptime_account_ts_uniq;
ALTER INDEX public.representatives_uptime_online_epoch_old RENAME TO representatives_uptime_online;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq_epoch_old RENAME TO representatives_telemetry_account_node_ts_uniq;
ALTER INDEX public.accounts_meta_account_ts_uniq_epoch_old RENAME TO accounts_meta_account_ts_uniq;

-- The old hypertables kept their integer-now registration; the policies
-- were removed at cutover, so restore them as db/schema.postgres.sql did.
SELECT add_compression_policy('public.representatives_uptime', BIGINT '604800');
SELECT add_compression_policy('public.representatives_telemetry', BIGINT '604800');
SELECT add_compression_policy('public.accounts_meta', BIGINT '604800');
SELECT add_retention_policy('public.representatives_uptime', BIGINT '7257600');
SELECT add_retention_policy('public.representatives_telemetry', BIGINT '3628800');

-- 3. Plain tables back to epoch integers.
ALTER TABLE public.posts
  ALTER COLUMN created_at TYPE integer USING extract(epoch FROM created_at)::integer,
  ALTER COLUMN updated_at TYPE integer USING extract(epoch FROM updated_at)::integer;

ALTER TABLE public.network_events ALTER COLUMN recorded_at DROP DEFAULT;
ALTER TABLE public.network_events
  ALTER COLUMN observed_at TYPE integer USING extract(epoch FROM observed_at)::integer,
  ALTER COLUMN recorded_at TYPE integer USING extract(epoch FROM recorded_at)::integer;
ALTER TABLE public.network_events
  ALTER COLUMN recorded_at SET DEFAULT extract(epoch from now())::integer;

ALTER TABLE public.network_event_coverage ALTER COLUMN recorded_at DROP DEFAULT;
ALTER TABLE public.network_event_coverage
  ALTER COLUMN coverage_began_at TYPE integer USING extract(epoch FROM coverage_began_at)::integer,
  ALTER COLUMN coverage_ended_at TYPE integer USING extract(epoch FROM coverage_ended_at)::integer,
  ALTER COLUMN recorded_at TYPE integer USING extract(epoch FROM recorded_at)::integer;
ALTER TABLE public.network_event_coverage
  ALTER COLUMN recorded_at SET DEFAULT extract(epoch from now())::integer;

COMMIT;

-- 4. Rebuild the integer-bucket rollup over the restored accounts_meta.
CREATE MATERIALIZED VIEW public.accounts_meta_rollup_day
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  account,
  time_bucket(86400, "timestamp") AS "timestamp",
  last(weight, "timestamp") AS weight,
  last(delegators, "timestamp") FILTER (WHERE delegators IS NOT NULL) AS delegators
FROM public.accounts_meta
GROUP BY account, time_bucket(86400, "timestamp")
WITH NO DATA;

SELECT add_continuous_aggregate_policy('public.accounts_meta_rollup_day',
  start_offset => 259200,
  end_offset => 86400,
  schedule_interval => INTERVAL '1 hour');

CALL refresh_continuous_aggregate('public.accounts_meta_rollup_day', NULL,
  public.unix_now_seconds() - 86400);

-- The _epoch_new tables now hold the timestamptz copy; drop them once the
-- rollback is confirmed, along with public.epoch_conform_state.
SELECT 'rollback complete: deploy the previous code, then start the writers' AS done;
