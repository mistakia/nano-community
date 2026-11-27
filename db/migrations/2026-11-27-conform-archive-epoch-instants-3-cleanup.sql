-- Conform the archive's epoch-integer instants to timestamptz — step 3 of 3:
-- cleanup.
--
-- Drops the retired epoch tables, the conform's bookkeeping and the
-- integer-now function. Irreversible: run it only after the new delta has
-- run nightly for at least a week and the rollback script is no longer
-- wanted.
--
-- First it checks that the new tables hold every old row, instants rounded
-- as the old delta rounded them: the rows past the copy bound were left for
-- the new delta to re-copy from the VPS, and this is where that is proven.
-- Any old row without a counterpart stops the script before anything drops.
--
--   ssh database 'sudo -n -u postgres psql -d nano_community_archive -v ON_ERROR_STOP=1 -f -' \
--     < db/migrations/2026-11-27-conform-archive-epoch-instants-3-cleanup.sql

\set ON_ERROR_STOP on

BEGIN;

-- 1. Every old row past a copy bound has a counterpart in the new table.
--    Rows at or before a bound were verified row for row by steps 1 and 2.
DO $do$
DECLARE
  missing bigint;
BEGIN
  -- A post's score and updated_at can change on the VPS after it is
  -- archived, so a post is matched on id and created_at alone.
  SELECT count(*) INTO missing FROM (
    SELECT id, created_at FROM public.posts_epoch_old WHERE created_at > 1795653305
    EXCEPT ALL
    SELECT id, extract(epoch FROM created_at)::integer
    FROM public.posts WHERE created_at > to_timestamp(1795653305)) d;
  IF missing <> 0 THEN
    RAISE EXCEPTION 'posts: % old rows have no counterpart', missing;
  END IF;

  SELECT count(*) INTO missing FROM (
    SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind,
      account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime,
      major_version, minor_version, patch_version, pre_release_version, maker, node_id,
      address, port, telemetry_timestamp, "timestamp"
    FROM public.representatives_telemetry_epoch_old WHERE "timestamp" > 1795654502
    EXCEPT ALL
    SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind,
      account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime,
      major_version, minor_version, patch_version, pre_release_version, maker, node_id,
      address, port, extract(epoch FROM reported_at)::integer,
      extract(epoch FROM observed_at)::integer
    FROM public.representatives_telemetry WHERE observed_at > to_timestamp(1795654502)) d;
  IF missing <> 0 THEN
    RAISE EXCEPTION 'representatives_telemetry: % old rows have no counterpart', missing;
  END IF;

  SELECT count(*) INTO missing FROM (
    SELECT account, online, "timestamp"
    FROM public.representatives_uptime_epoch_old WHERE "timestamp" > 1795654803
    EXCEPT ALL
    SELECT account, online, extract(epoch FROM observed_at)::integer
    FROM public.representatives_uptime WHERE observed_at > to_timestamp(1795654803)) d;
  IF missing <> 0 THEN
    RAISE EXCEPTION 'representatives_uptime: % old rows have no counterpart', missing;
  END IF;

  SELECT count(*) INTO missing FROM (
    SELECT network_event_id, network_event_type, network_event_phase, severity,
      representative_account, peer_address, node_id, evidence, observed_at, recorded_at,
      network_event_sequence, network_event_condition_id
    FROM public.network_events_epoch_old
    EXCEPT ALL
    SELECT network_event_id, network_event_type, network_event_phase, severity,
      representative_account, peer_address, node_id, evidence,
      extract(epoch FROM observed_at)::integer, extract(epoch FROM recorded_at)::integer,
      network_event_sequence, network_event_condition_id
    FROM public.network_events) d;
  IF missing <> 0 THEN
    RAISE EXCEPTION 'network_events: % old rows have no counterpart', missing;
  END IF;

  SELECT count(*) INTO missing FROM (
    SELECT network_event_coverage_sequence, producer, coverage_began_at,
      coverage_ended_at, recorded_at
    FROM public.network_event_coverage_epoch_old
    EXCEPT ALL
    SELECT network_event_coverage_sequence, producer,
      extract(epoch FROM coverage_began_at)::integer,
      extract(epoch FROM coverage_ended_at)::integer, extract(epoch FROM recorded_at)::integer
    FROM public.network_event_coverage) d;
  IF missing <> 0 THEN
    RAISE EXCEPTION 'network_event_coverage: % old rows have no counterpart', missing;
  END IF;
END
$do$;

-- 2. Drop.
DROP TABLE public.accounts_meta_epoch_old;
DROP TABLE public.representatives_telemetry_index_epoch_old;
DROP TABLE public.posts_epoch_old;
DROP TABLE public.representatives_telemetry_epoch_old;
DROP TABLE public.representatives_uptime_epoch_old;
DROP TABLE public.network_events_epoch_old;
DROP TABLE public.network_event_coverage_epoch_old;
DROP TABLE public.etl_state_epoch_old;
DROP FUNCTION public.epoch_conform_copy_day(text, bigint);
DROP FUNCTION public.epoch_conform_assert_equal(text, text, text);
DROP TABLE public.epoch_conform_tables;
DROP FUNCTION public.unix_now_seconds();

COMMIT;
