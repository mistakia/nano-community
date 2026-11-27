-- Rollback for 2026-11-27-conform-archive-epoch-instants: restores the
-- epoch-integer archive tables. Valid only after step 2 and before step 3
-- dropped the _epoch_old tables. Hold the archive delta lock on base-storage
-- (/tmp/nano-community-archive.lock) while it runs, and deploy the previous
-- delta to the base-storage checkout before releasing it.
--
-- Apply on database-server as postgres:
--   ssh database 'sudo -n -u postgres psql -d nano_community_archive -v ON_ERROR_STOP=1 -f -' \
--     < db/migrations/2026-11-27-conform-archive-epoch-instants-rollback.sql
--
-- Rows the delta wrote after the cutover are copied back into the old tables
-- first, so nothing archived since is lost. Their instants lose sub-second
-- precision (extract(epoch)::integer, as the old delta projected them), and a
-- row the old table already holds at the same rounded values is not copied
-- twice. etl_state is rebuilt from the new one, each watermark floored to
-- whole seconds so the old delta re-reads rather than skips. The new tables
-- stay as <table>_epoch_new; drop them before rerunning step 1.

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '30s';

LOCK TABLE public.accounts_meta, public.representatives_telemetry_index,
  public.posts, public.representatives_telemetry, public.representatives_uptime,
  public.network_events, public.network_event_coverage, public.etl_state
  IN ACCESS EXCLUSIVE MODE;

SET LOCAL timescaledb.max_tuples_decompressed_per_dml_transaction TO 0;

-- 1. Rows past each copy bound go back, less those the old table already
--    holds. accounts_meta and representatives_telemetry_index have no
--    writer and no bound.
-- A post's score and updated_at can change on the VPS after it is archived,
-- so a post is matched on id and created_at alone.
INSERT INTO public.posts_epoch_old (id, pid, sid, title, url, content_url, author,
  authorid, text, html, summary, score, social_score, created_at, updated_at)
SELECT n.id, n.pid, n.sid, n.title, n.url, n.content_url, n.author, n.authorid, n.text,
  n.html, n.summary, n.score, n.social_score, extract(epoch FROM n.created_at)::integer,
  extract(epoch FROM n.updated_at)::integer
FROM public.posts n
WHERE n.created_at > to_timestamp(1795653305)
  AND NOT EXISTS (
    SELECT 1 FROM public.posts_epoch_old o
    WHERE o.id = n.id AND o.created_at = extract(epoch FROM n.created_at)::integer)
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
FROM public.representatives_telemetry WHERE observed_at > to_timestamp(1795654502)
EXCEPT ALL
SELECT account, weight, block_count, block_behind, cemented_count, cemented_behind,
  account_count, unchecked_count, bandwidth_cap, peer_count, protocol_version, uptime,
  major_version, minor_version, patch_version, pre_release_version, maker, node_id,
  address, port, telemetry_timestamp, "timestamp"
FROM public.representatives_telemetry_epoch_old WHERE "timestamp" > 1795654502
ON CONFLICT DO NOTHING;

INSERT INTO public.representatives_uptime_epoch_old (account, online, "timestamp")
SELECT account, online, extract(epoch FROM observed_at)::integer
FROM public.representatives_uptime WHERE observed_at > to_timestamp(1795654803)
EXCEPT ALL
SELECT account, online, "timestamp"
FROM public.representatives_uptime_epoch_old WHERE "timestamp" > 1795654803
ON CONFLICT DO NOTHING;

INSERT INTO public.network_events_epoch_old (network_event_id, network_event_type,
  network_event_phase, severity, representative_account, peer_address, node_id,
  evidence, observed_at, recorded_at, network_event_sequence, network_event_condition_id)
SELECT network_event_id, network_event_type, network_event_phase, severity,
  representative_account, peer_address, node_id, evidence,
  extract(epoch FROM observed_at)::integer, extract(epoch FROM recorded_at)::integer,
  network_event_sequence, network_event_condition_id
FROM public.network_events
WHERE network_event_id NOT IN (SELECT network_event_id FROM public.network_events_epoch_old);

INSERT INTO public.network_event_coverage_epoch_old (network_event_coverage_sequence,
  producer, coverage_began_at, coverage_ended_at, recorded_at)
SELECT network_event_coverage_sequence, producer,
  extract(epoch FROM coverage_began_at)::integer,
  extract(epoch FROM coverage_ended_at)::integer, extract(epoch FROM recorded_at)::integer
FROM public.network_event_coverage
WHERE network_event_coverage_sequence NOT IN (
  SELECT network_event_coverage_sequence FROM public.network_event_coverage_epoch_old);

DELETE FROM public.etl_state_epoch_old;
INSERT INTO public.etl_state_epoch_old (table_name, rows_extracted, rows_inserted,
  last_max_ts, started_at, completed_at, notes)
SELECT table_name, rows_extracted, rows_inserted,
  coalesce(floor(extract(epoch FROM watermark_at))::integer, watermark_sequence::integer),
  started_at, completed_at, notes
FROM public.etl_state;

-- 2. Retire the new policies.
SELECT remove_compression_policy('public.accounts_meta');
SELECT remove_compression_policy('public.representatives_telemetry_index');
SELECT remove_compression_policy('public.posts');
SELECT remove_compression_policy('public.representatives_telemetry');
SELECT remove_compression_policy('public.representatives_uptime');

-- 3. Swap back. The new tables and their indexes take an _epoch_new or _new
--    suffix, as step 1 created them.
ALTER INDEX public.accounts_meta_account_ts_uniq RENAME TO accounts_meta_account_ts_uniq_new;
ALTER INDEX public.accounts_meta_observed_at_idx RENAME TO accounts_meta_epoch_new_observed_at_idx;
ALTER INDEX public.representatives_telemetry_index_node_ts_uniq RENAME TO representatives_telemetry_index_node_ts_uniq_new;
ALTER INDEX public.representatives_telemetry_index_observed_at_idx RENAME TO representatives_telemetry_index_epoch_new_observed_at_idx;
ALTER INDEX public.posts_id_created_uniq RENAME TO posts_id_created_uniq_new;
ALTER INDEX public.posts_url_created_uniq RENAME TO posts_url_created_uniq_new;
ALTER INDEX public.posts_created_at_idx RENAME TO posts_epoch_new_created_at_idx;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq RENAME TO representatives_telemetry_account_node_ts_uniq_new;
ALTER INDEX public.representatives_telemetry_node_ts RENAME TO representatives_telemetry_node_ts_new;
ALTER INDEX public.representatives_telemetry_observed_at_idx RENAME TO representatives_telemetry_epoch_new_observed_at_idx;
ALTER INDEX public.representatives_uptime_account_ts_uniq RENAME TO representatives_uptime_account_ts_uniq_new;
ALTER INDEX public.representatives_uptime_observed_at_idx RENAME TO representatives_uptime_epoch_new_observed_at_idx;
ALTER INDEX public.network_events_pkey RENAME TO network_events_pkey_new;
ALTER INDEX public.network_events_observed_at_idx RENAME TO network_events_observed_at_idx_new;
ALTER INDEX public.network_events_recorded_at_idx RENAME TO network_events_recorded_at_idx_new;
ALTER INDEX public.network_events_sequence_idx RENAME TO network_events_sequence_idx_new;
ALTER INDEX public.network_event_coverage_pkey RENAME TO network_event_coverage_pkey_new;
ALTER INDEX public.etl_state_pkey RENAME TO etl_state_pkey_new;

ALTER TABLE public.accounts_meta RENAME TO accounts_meta_epoch_new;
ALTER TABLE public.representatives_telemetry_index RENAME TO representatives_telemetry_index_epoch_new;
ALTER TABLE public.posts RENAME TO posts_epoch_new;
ALTER TABLE public.representatives_telemetry RENAME TO representatives_telemetry_epoch_new;
ALTER TABLE public.representatives_uptime RENAME TO representatives_uptime_epoch_new;
ALTER TABLE public.network_events RENAME TO network_events_epoch_new;
ALTER TABLE public.network_event_coverage RENAME TO network_event_coverage_epoch_new;
ALTER TABLE public.etl_state RENAME TO etl_state_epoch_new;

ALTER TABLE public.accounts_meta_epoch_old RENAME TO accounts_meta;
ALTER TABLE public.representatives_telemetry_index_epoch_old RENAME TO representatives_telemetry_index;
ALTER TABLE public.posts_epoch_old RENAME TO posts;
ALTER TABLE public.representatives_telemetry_epoch_old RENAME TO representatives_telemetry;
ALTER TABLE public.representatives_uptime_epoch_old RENAME TO representatives_uptime;
ALTER TABLE public.network_events_epoch_old RENAME TO network_events;
ALTER TABLE public.network_event_coverage_epoch_old RENAME TO network_event_coverage;
ALTER TABLE public.etl_state_epoch_old RENAME TO etl_state;

ALTER INDEX public.accounts_meta_account_ts_uniq_epoch_old RENAME TO accounts_meta_account_ts_uniq;
ALTER INDEX public.accounts_meta_timestamp_idx_epoch_old RENAME TO accounts_meta_timestamp_idx;
ALTER INDEX public.representatives_telemetry_index_node_ts_uniq_epoch_old RENAME TO representatives_telemetry_index_node_ts_uniq;
ALTER INDEX public.representatives_telemetry_index_timestamp_idx_epoch_old RENAME TO representatives_telemetry_index_timestamp_idx;
ALTER INDEX public.posts_id_created_uniq_epoch_old RENAME TO posts_id_created_uniq;
ALTER INDEX public.posts_url_created_uniq_epoch_old RENAME TO posts_url_created_uniq;
ALTER INDEX public.posts_created_at_idx_epoch_old RENAME TO posts_created_at_idx;
ALTER INDEX public.representatives_telemetry_account_node_ts_uniq_epoch_old RENAME TO representatives_telemetry_account_node_ts_uniq;
ALTER INDEX public.representatives_telemetry_node_ts_epoch_old RENAME TO representatives_telemetry_node_ts;
ALTER INDEX public.representatives_telemetry_timestamp_idx_epoch_old RENAME TO representatives_telemetry_timestamp_idx;
ALTER INDEX public.representatives_uptime_account_ts_uniq_epoch_old RENAME TO representatives_uptime_account_ts_uniq;
ALTER INDEX public.representatives_uptime_timestamp_idx_epoch_old RENAME TO representatives_uptime_timestamp_idx;
ALTER INDEX public.network_events_pkey_epoch_old RENAME TO network_events_pkey;
ALTER INDEX public.network_events_observed_at_idx_epoch_old RENAME TO network_events_observed_at_idx;
ALTER INDEX public.network_events_recorded_at_idx_epoch_old RENAME TO network_events_recorded_at_idx;
ALTER INDEX public.network_events_sequence_idx_epoch_old RENAME TO network_events_sequence_idx;
ALTER INDEX public.network_event_coverage_pkey_epoch_old RENAME TO network_event_coverage_pkey;
ALTER INDEX public.etl_state_pkey_epoch_old RENAME TO etl_state_pkey;

-- 4. The old hypertables kept their integer-now registration; restore their
--    policies as the previous schema file declared them.
SELECT add_compression_policy('public.accounts_meta', BIGINT '604800');
SELECT add_compression_policy('public.representatives_telemetry_index', BIGINT '604800');
SELECT add_compression_policy('public.posts', BIGINT '604800');
SELECT add_compression_policy('public.representatives_telemetry', BIGINT '604800');
SELECT add_compression_policy('public.representatives_uptime', BIGINT '604800');

COMMIT;

SELECT 'rollback complete: deploy the previous delta, then release the lock' AS done;
