-- schema.postgres.sql
--
-- Canonical full-surface schema for nano-community VPS production on
-- PostgreSQL 15 + TimescaleDB (TSL). Target database: nano_production on
-- the VPS (127.0.0.1:5432). Supersedes db/schema.mysql.sql at cutover;
-- the MySQL file is retained for 14-day rollback insurance, then deleted.
--
-- Engine decision: see text/homelab/nano-community-database-architecture-decision.md
-- (locked 2026-05-06). Compression policy compress_after = 7 days.
-- Retention windows carry over from the retired MySQL archive: uptime 12w,
-- telemetry 6w, telemetry_index 6w, accounts_meta no retention (compression
-- alone shrinks 23 GB to ~5 GB), posts plain table (NOT a hypertable; the
-- "exclude rows referenced by post_labels" rule cannot be expressed via
-- drop_chunks). accounts_meta feeds the continuous aggregate
-- accounts_meta_rollup_day (section 14), which needs one full refresh after
-- its first apply.
--
-- Apply with:
--   sudo -n -u postgres psql -d nano_production -f db/schema.postgres.sql
--
-- Precondition: TimescaleDB TSL build installed and CREATE EXTENSION
-- timescaledb already present in the target database.
--
-- Role passwords below are placeholders. Operator substitutes
-- CHANGEME_APP and CHANGEME_READER via sed (or equivalent) before apply.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Roles
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nano_production_app') THEN
    CREATE ROLE nano_production_app LOGIN PASSWORD 'CHANGEME_APP';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nano_production_reader') THEN
    CREATE ROLE nano_production_reader LOGIN PASSWORD 'CHANGEME_READER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nano_production_backup') THEN
    CREATE ROLE nano_production_backup LOGIN PASSWORD 'CHANGEME_BACKUP';
  END IF;
END
$do$;

-- 2. (retired) The integer-now function public.unix_now_seconds() served the
--    int4 hypertable time columns. The hypertables are partitioned on
--    timestamptz now, so none is needed. Instants are timestamptz named
--    <event>_at; see db/migrations/2026-11-26-conform-epoch-instants.sql.

-- 3. Tables

CREATE TABLE IF NOT EXISTS public.accounts (
  account       char(65) NOT NULL,
  alias         varchar(255),
  monitor_url   varchar(255),
  watt_hour     integer,
  representative boolean DEFAULT false,
  last_seen_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_uniq
  ON public.accounts (account);
CREATE INDEX IF NOT EXISTS accounts_alias_lower
  ON public.accounts (lower(alias) text_pattern_ops);

CREATE TABLE IF NOT EXISTS public.accounts_changelog (
  account         char(65) NOT NULL,
  "column"        varchar(65) NOT NULL,
  previous_value  varchar(1000) DEFAULT '',
  new_value       varchar(1000) DEFAULT '',
  changed_at      timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_changelog_change_uniq
  ON public.accounts_changelog (account, "column", previous_value, new_value, changed_at);

CREATE TABLE IF NOT EXISTS public.account_keys (
  account                char(65) NOT NULL,
  public_key             varchar(64) NOT NULL,
  link_signature         varchar(128) NOT NULL,
  link_message           text,
  accept_link_message    text,
  accept_link_signature  varchar(128),
  revoke_signature       varchar(128),
  revoke_message         text,
  created_at             timestamptz NOT NULL,
  revoked_at             timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS account_keys_public_key_uniq
  ON public.account_keys (public_key);
CREATE UNIQUE INDEX IF NOT EXISTS account_keys_account_public_key_uniq
  ON public.account_keys (account, public_key);

CREATE TABLE IF NOT EXISTS public.accounts_delegators (
  account         char(65) NOT NULL,
  representative  char(65) NOT NULL,
  balance         numeric(39,0),
  observed_at     timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_delegators_account_uniq
  ON public.accounts_delegators (account);
CREATE INDEX IF NOT EXISTS accounts_delegators_representative
  ON public.accounts_delegators (representative);

CREATE TABLE IF NOT EXISTS public.accounts_meta (
  account      char(65) NOT NULL,
  balance      numeric(39,0),
  block_count  integer,
  weight       numeric(39,0),
  delegators   integer,
  observed_at  timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounts_meta_index (
  account      char(65) NOT NULL,
  balance      numeric(39,0),
  block_count  integer,
  weight       numeric(39,0),
  delegators   integer,
  observed_at  timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_index_account_uniq
  ON public.accounts_meta_index (account);

-- Resolved account tags, written only by materialize_account_labels
CREATE TABLE IF NOT EXISTS public.accounts_tags (
  account  char(65) NOT NULL,
  tag      varchar(255) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_tags_account_tag_uniq
  ON public.accounts_tags (account, tag);

-- Unsigned label claims (aliases and tags) by source. Signed claims stay in
-- nano_community_messages. accounts.alias and accounts_tags are resolved from
-- both by libs-server/account-labels.
CREATE TABLE IF NOT EXISTS public.account_labels (
  account      char(65) NOT NULL,
  source       varchar(32) NOT NULL,
  label_type   varchar(16) NOT NULL,
  value        varchar(255) NOT NULL,
  observed_at  timestamptz NOT NULL,
  expires_at   timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS account_labels_uniq
  ON public.account_labels (account, source, label_type, value);
CREATE INDEX IF NOT EXISTS account_labels_source_observed_at
  ON public.account_labels (source, observed_at);
CREATE INDEX IF NOT EXISTS account_labels_alias_lower
  ON public.account_labels (lower(value) text_pattern_ops)
  WHERE label_type = 'alias';

CREATE TABLE IF NOT EXISTS public.github_discussions (
  id             varchar(100) NOT NULL PRIMARY KEY,
  author_id      varchar(100) NOT NULL,
  author_name    varchar(100) NOT NULL,
  author_avatar  varchar(255) NOT NULL,
  ref            varchar(255),
  title          varchar(255),
  url            varchar(255),
  repo           varchar(255) NOT NULL,
  body           text,
  upvotes        integer NOT NULL,
  category_name  varchar(100) NOT NULL,
  closed         boolean NOT NULL,
  state_reason   varchar(255),
  category_id    varchar(100) NOT NULL,
  created_at     timestamptz NOT NULL,
  updated_at     timestamptz,
  closed_at      timestamptz
);

CREATE TABLE IF NOT EXISTS public.github_discussion_labels (
  discussion_id  varchar(100) NOT NULL,
  label_id       varchar(100) NOT NULL,
  label_name     varchar(255) NOT NULL,
  label_color    varchar(255) NOT NULL,
  PRIMARY KEY (discussion_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.github_events (
  id            varchar(15) NOT NULL PRIMARY KEY,
  type          varchar(100) NOT NULL,
  actor_id      varchar(15) NOT NULL,
  actor_name    varchar(100) NOT NULL,
  actor_avatar  varchar(255) NOT NULL,
  action        varchar(255),
  ref           varchar(255),
  title         varchar(255),
  body          text,
  event_url     varchar(255),
  created_at    timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nano_community_messages (
  version         smallint NOT NULL,
  entry_id        varchar(64),
  chain_id        varchar(64),
  entry_clock     bigint,
  chain_clock     bigint,
  public_key      varchar(64) NOT NULL,
  operation       varchar(50) NOT NULL,
  content         text,
  tags            text,
  "references"    text,
  created_at      bigint NOT NULL,
  signature       varchar(128) NOT NULL,
  message         text,
  message_digest  char(64)
);
CREATE UNIQUE INDEX IF NOT EXISTS nano_community_messages_signature_uniq
  ON public.nano_community_messages (signature);
CREATE UNIQUE INDEX IF NOT EXISTS nano_community_messages_message_digest_uniq
  ON public.nano_community_messages (message_digest);
COMMENT ON COLUMN public.nano_community_messages.created_at IS
  'Deliberately epoch seconds: the issued_at the signer put in the signed message, stored as signed.';

-- Current owner note per block, derived from set_block_meta messages and
-- rebuilt by scripts/rebuild-blocks-meta.mjs. An empty note is a cleared note,
-- kept so a later-arriving older note cannot revive it. The hide columns are
-- operator moderation state and survive a rebuild.
CREATE TABLE IF NOT EXISTS public.blocks_meta (
  block_hash      char(64)     PRIMARY KEY,
  account         varchar(65)  NOT NULL,
  note            varchar(500) NOT NULL,
  message_digest  char(64)     NOT NULL REFERENCES public.nano_community_messages(message_digest),
  issued_at       bigint       NOT NULL,
  updated_at      timestamptz  NOT NULL,
  hidden_at       timestamptz,
  hidden_reason   text
);
CREATE INDEX IF NOT EXISTS blocks_meta_account ON public.blocks_meta (account);
COMMENT ON COLUMN public.blocks_meta.issued_at IS
  'Deliberately epoch seconds: the issued_at of the signed set_block_meta message, which orders notes and must match the signed value.';

CREATE TABLE IF NOT EXISTS public.posts (
  id            integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  pid           varchar(255) NOT NULL,
  sid           varchar(255) NOT NULL,
  title         varchar(255),
  url           varchar(255) NOT NULL,
  content_url   varchar(255) NOT NULL DEFAULT '',
  author        varchar(32) NOT NULL,
  authorid      varchar(32),
  text          text,
  html          text,
  summary       integer,
  score         numeric(7,1) NOT NULL DEFAULT 1.0,
  social_score  numeric(7,1) NOT NULL DEFAULT 1.0,
  created_at    timestamptz NOT NULL,
  updated_at    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_url_uniq
  ON public.posts (url);
CREATE INDEX IF NOT EXISTS posts_created_at
  ON public.posts (created_at);

CREATE TABLE IF NOT EXISTS public.post_labels (
  post_id     integer NOT NULL,
  label       varchar(65) NOT NULL,
  account_id  integer NOT NULL
);
CREATE INDEX IF NOT EXISTS post_labels_post_id
  ON public.post_labels (post_id);
CREATE INDEX IF NOT EXISTS post_labels_label
  ON public.post_labels (label);
CREATE UNIQUE INDEX IF NOT EXISTS post_labels_user_label_uniq
  ON public.post_labels (post_id, label, account_id);

CREATE TABLE IF NOT EXISTS public.representatives_meta_index (
  account                 char(65) NOT NULL,
  cpu_cores               integer,
  cpu_description         varchar(255),
  cpu_model               varchar(255),
  bandwidth_description   varchar(255),
  ram                     integer,
  ram_description         varchar(255),
  donation_address        char(65),
  description             varchar(1000),
  dedicated               boolean,
  type                    varchar(255),
  provider                varchar(255),
  created_at              timestamptz,
  mynano_ninja            varchar(255),
  ninja_ram_description   varchar(255),
  ninja_cpu_description   varchar(255),
  ninja_description       varchar(1000),
  ninja_type              varchar(255),
  ninja_created_at        timestamptz,
  ninja_provider          varchar(255),
  reddit                  varchar(255),
  twitter                 varchar(255),
  discord                 varchar(255),
  discord_user_id         varchar(32),
  github                  varchar(255),
  website                 varchar(255),
  email                   varchar(255),
  nano_node_monitor_url   varchar(255),
  recorded_at             timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_meta_index_account_uniq
  ON public.representatives_meta_index (account);

CREATE TABLE IF NOT EXISTS public.representatives_meta_index_changelog (
  account         char(65) NOT NULL,
  "column"        varchar(65) NOT NULL,
  previous_value  varchar(1000) DEFAULT '',
  new_value       varchar(1000) DEFAULT '',
  changed_at      timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_meta_index_changelog_change_uniq
  ON public.representatives_meta_index_changelog (account, "column", previous_value, new_value, changed_at);

CREATE TABLE IF NOT EXISTS public.representatives_telemetry (
  account              char(65),
  weight               numeric(39,0),
  block_count          integer NOT NULL,
  block_behind         integer NOT NULL,
  cemented_count       integer NOT NULL,
  cemented_behind      integer NOT NULL,
  account_count        integer NOT NULL,
  unchecked_count      integer NOT NULL,
  bandwidth_cap        integer NOT NULL,
  peer_count           integer NOT NULL,
  protocol_version     integer NOT NULL,
  uptime               integer NOT NULL,
  major_version        integer NOT NULL,
  minor_version        integer NOT NULL,
  patch_version        integer NOT NULL,
  pre_release_version  varchar(10) NOT NULL,
  maker                varchar(10) NOT NULL,
  node_id              char(65) NOT NULL,
  address              char(65) NOT NULL,
  port                 integer NOT NULL,
  reported_at          timestamptz NOT NULL,
  observed_at          timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS public.representatives_network (
  account       char(65) NOT NULL,
  address       varchar(65) NOT NULL,
  continent     varchar(65) NOT NULL,
  country       varchar(65) NOT NULL,
  "countryCode" char(2) NOT NULL,
  region        varchar(65) NOT NULL,
  "regionName"  varchar(65) NOT NULL,
  city          varchar(65) NOT NULL,
  zip           varchar(65) NOT NULL,
  lat           varchar(65) NOT NULL,
  lon           varchar(65) NOT NULL,
  timezone      varchar(65) NOT NULL,
  isp           varchar(65) NOT NULL,
  org           varchar(65) NOT NULL,
  "as"          varchar(65) NOT NULL,
  asname        varchar(65) NOT NULL,
  hosted        boolean NOT NULL,
  observed_at   timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_network_account_ts_uniq
  ON public.representatives_network (account, observed_at);

CREATE TABLE IF NOT EXISTS public.representatives_uptime (
  account     char(65) NOT NULL,
  online      smallint NOT NULL,
  observed_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS representatives_uptime_online
  ON public.representatives_uptime (online);

CREATE TABLE IF NOT EXISTS public.representatives_uptime_summary (
  account        char(65) NOT NULL,
  days           integer NOT NULL,
  online_count   integer NOT NULL,
  offline_count  integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_summary_account_days_uniq
  ON public.representatives_uptime_summary (account, days);

CREATE TABLE IF NOT EXISTS public.representatives_uptime_rollup_hour (
  account    char(65) NOT NULL,
  online     smallint NOT NULL,
  "interval" integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_rollup_hour_account_interval_uniq
  ON public.representatives_uptime_rollup_hour (account, "interval");

CREATE TABLE IF NOT EXISTS public.representatives_uptime_rollup_day (
  account            char(65) NOT NULL,
  online_count       integer NOT NULL,
  offline_count      integer NOT NULL,
  longest_downtime   integer NOT NULL,
  day_began_at       timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_rollup_day_account_ts_uniq
  ON public.representatives_uptime_rollup_day (account, day_began_at);

CREATE TABLE IF NOT EXISTS public.sources (
  id                varchar(255),
  title             varchar(255),
  logo_url          varchar(255),
  score_avg         numeric(7,1) NOT NULL DEFAULT 1.0,
  social_score_avg  numeric(7,1) NOT NULL DEFAULT 1.0,
  created_at        timestamptz,
  updated_at        timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS sources_id_uniq
  ON public.sources (id);

CREATE TABLE IF NOT EXISTS public.users (
  id                    integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  username              varchar(32) NOT NULL,
  public_key            varchar(64) NOT NULL,
  signature             varchar(128) NOT NULL,
  last_visited_at       timestamptz NOT NULL,
  registration_message  text
);
CREATE UNIQUE INDEX IF NOT EXISTS users_public_key_uniq
  ON public.users (public_key);

CREATE TABLE IF NOT EXISTS public.voting_weight (
  address                       varchar(65) NOT NULL,
  quorum_delta                  numeric(39,0) NOT NULL,
  online_weight_quorum_percent  integer NOT NULL,
  online_weight_minimum         numeric(39,0) NOT NULL,
  online_stake_total            numeric(39,0) NOT NULL,
  trended_stake_total           numeric(39,0) NOT NULL,
  peers_stake_total             numeric(39,0) NOT NULL,
  observed_at                   timestamptz NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS voting_weight_address_ts_uniq
  ON public.voting_weight (address, observed_at);

-- 4. Hypertables. chunk_time_interval = 1 day per plan (smaller chunks than
--    the archive's 30d/90d because VPS retention windows are much shorter:
--    uptime 12w, telemetry 6w).
SELECT create_hypertable(
  'public.representatives_uptime', 'observed_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.representatives_telemetry', 'observed_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.accounts_meta', 'observed_at',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 5. Hypertable unique constraints (must include the time column).
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_account_ts_uniq
  ON public.representatives_uptime (account, observed_at);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_account_node_ts_uniq
  ON public.representatives_telemetry (account, node_id, observed_at);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_account_ts_uniq
  ON public.accounts_meta (account, observed_at);

-- 6. Compression configuration.
ALTER TABLE public.representatives_uptime SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account'
);
ALTER TABLE public.representatives_telemetry SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account'
);
ALTER TABLE public.accounts_meta SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account'
);

-- 8. Compression policies: compress chunks older than 7 days.
SELECT add_compression_policy('public.representatives_uptime',          INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry',       INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.accounts_meta',                   INTERVAL '7 days', if_not_exists => TRUE);

-- 9. Retention policies: uptime 12 weeks, telemetry 6 weeks. accounts_meta
--    and posts: no retention.
SELECT add_retention_policy('public.representatives_uptime',          INTERVAL '12 weeks', if_not_exists => TRUE);
SELECT add_retention_policy('public.representatives_telemetry',       INTERVAL '6 weeks', if_not_exists => TRUE);

-- 10. ETL state table. Written by scripts/detect-telemetry-network-events.mjs,
--     which keeps its representatives_telemetry watermark in watermark_at under
--     table_name 'detect-telemetry-network-events'. Independent of
--     database-server's nano_community_archive.etl_state which the archive
--     delta cron uses.
CREATE TABLE IF NOT EXISTS public.etl_state (
  table_name      text PRIMARY KEY,
  rows_extracted  bigint NOT NULL DEFAULT 0,
  rows_inserted   bigint NOT NULL DEFAULT 0,
  watermark_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text
);

-- 11. Privileges. nano_production_app gets full DML on the app surface;
--     nano_production_reader gets SELECT on the 4 hot tables consumed by the
--     storage-side archive delta cron and freshness monitor;
--     nano_production_backup gets SELECT on every table for the storage-side
--     weekly pg_dump cron.
GRANT USAGE ON SCHEMA public TO nano_production_app, nano_production_reader, nano_production_backup;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nano_production_app;
GRANT SELECT, USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public TO nano_production_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nano_production_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, USAGE, UPDATE ON SEQUENCES TO nano_production_app;

GRANT SELECT ON
  public.representatives_uptime,
  public.representatives_telemetry,
  public.accounts_meta,
  public.posts
TO nano_production_reader;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO nano_production_backup;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO nano_production_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO nano_production_backup;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, USAGE ON SEQUENCES TO nano_production_backup;

-- 12. First-party site analytics. Written by POST /api/site-events; see
--     user:text/analytics/product-analytics.md. Raw events are retained 180
--     days by scripts/prune-site-events.mjs (daily cron, server/server-crontab).
CREATE TABLE IF NOT EXISTS public.site_events (
  site_event_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at                timestamptz NOT NULL,
  site_event_name            text NOT NULL,
  request_path               text NOT NULL,
  referrer_host              text,
  referral_tag               text,
  anonymous_client_hash      char(16) NOT NULL,
  is_authenticated           boolean NOT NULL DEFAULT false,
  is_bot_user_agent          boolean NOT NULL DEFAULT false,
  device_type                text NOT NULL,
  page_response_milliseconds integer,
  event_details              jsonb
);
CREATE INDEX IF NOT EXISTS site_events_occurred_at_idx
  ON public.site_events (occurred_at);
CREATE INDEX IF NOT EXISTS site_events_name_occurred_at_idx
  ON public.site_events (site_event_name, occurred_at);

-- One row per UTC day, current day only. The collector creates today's key and
-- deletes every older one in the same step, so past days cannot be recomputed.
CREATE TABLE IF NOT EXISTS public.site_client_hash_keys (
  hash_key_date date PRIMARY KEY,
  hash_key      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Reader read on site_events only; site_client_hash_keys stays unreadable by
-- reader roles so a day's hashes cannot be recomputed. Lives after the tables
-- so this file stays re-appliable in order. The app and backup roles get the
-- new tables through their ALTER DEFAULT PRIVILEGES above.
GRANT SELECT ON public.site_events TO nano_production_reader;

-- 13. Network events feed. One row per representative network event, written
--     by the detectors through libs-server/network-events/insert-network-events.mjs
--     and validated against the type registry in common/network-event-types.mjs.
--     network_event_id is a sha256 over the type, phase and identity keys, so a
--     replayed event dedupes on insert. Times are timestamptz: observed_at is
--     when the event happened, recorded_at when it was inserted and is the
--     archive delta watermark. Operator-only types stay here and are never
--     served by the API.
CREATE TABLE IF NOT EXISTS public.network_events (
  network_event_id       text PRIMARY KEY,
  network_event_type     text NOT NULL,
  network_event_phase    text NOT NULL
    CHECK (network_event_phase IN ('began', 'ended', 'occurred')),
  severity               text NOT NULL
    CHECK (severity IN ('info', 'warning', 'critical')),
  representative_account char(65),
  peer_address           varchar(65),
  node_id                char(65),
  evidence               jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at            timestamptz NOT NULL,
  recorded_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS network_events_observed_at_idx
  ON public.network_events (observed_at DESC);
CREATE INDEX IF NOT EXISTS network_events_representative_observed_at_idx
  ON public.network_events (representative_account, observed_at DESC);
CREATE INDEX IF NOT EXISTS network_events_recorded_at_idx
  ON public.network_events (recorded_at);

-- Working state of each detector: the prior settled value or open condition
-- per subject. Re-derivable from telemetry, so it is not archived.
CREATE TABLE IF NOT EXISTS public.network_event_detector_state (
  detector_name  text NOT NULL,
  subject_key    text NOT NULL,
  detector_state jsonb NOT NULL,
  updated_at     timestamptz NOT NULL,
  PRIMARY KEY (detector_name, subject_key)
);

-- Reader read on network_events for the archive delta cron; detector state
-- stays unreadable by reader roles.
GRANT SELECT ON public.network_events TO nano_production_reader;

-- 14. Daily delegation rollup. One row per representative per UTC day with the
--     last weight and delegator count sampled by scripts/import-accounts-meta.mjs,
--     served by GET /api/accounts/:address/delegation_history. delegators counts
--     delegating accounts holding at least 1 Nano (accounts_delegators); it is
--     the day's last recorded count, so a stale-snapshot sample does not blank
--     the day, and null before it was first recorded. Real-time, so today's bucket is read
--     live from accounts_meta. Created WITH NO DATA so applying this file stays
--     cheap; the refresh policy only covers the last 3 days, so a new database
--     with history needs one full refresh after apply:
--       CALL refresh_continuous_aggregate('public.accounts_meta_rollup_day', NULL, now() - INTERVAL '1 day');
--     Re-derivable from accounts_meta, so it is not archived. Readers get SELECT
--     through the section 11 default privileges.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.accounts_meta_rollup_day
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
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- 15. Network event delivery. network_event_sequence is a consumer cursor in
--     commit order: assign_network_event_sequence takes the transaction-scoped
--     advisory lock 7311042026 before nextval and holds it until commit, so no
--     row can commit behind a higher sequence. Rows dropped by ON CONFLICT
--     burn a value, so the sequence has gaps but never runs out of order.
--     network_event_coverage shares the generator and the lock, so coverage
--     and its events interleave on one axis. Rows are immutable;
--     refuse_network_event_update raises on any UPDATE, and DELETE stays
--     allowed for retention. Both triggers are ordinary triggers, so a restore
--     under session_replication_role = replica bypasses them and must then
--     advance the generator past the restored maximum.
--     network_event_condition_id is the network_event_id of a condition's
--     began row, set by the writer on began and ended rows and null on
--     occurrences. network_event_coverage holds the observed_at ranges each
--     producer has fully written.
-- Adds the columns and the coverage table, backfills rows stored before the
-- sequence existed in recorded order, then installs the triggers, all in one
-- transaction under a bounded lock wait. The table locks keep writers out
-- while the triggers are absent. A re-apply matches no rows.
BEGIN;
-- Fail rather than queue every reader behind a slow one; re-apply on failure.
SET LOCAL lock_timeout = '10s';
CREATE SEQUENCE IF NOT EXISTS public.network_event_sequence_generator;

ALTER TABLE public.network_events
  ADD COLUMN IF NOT EXISTS network_event_sequence bigint,
  ADD COLUMN IF NOT EXISTS network_event_condition_id text;

CREATE TABLE IF NOT EXISTS public.network_event_coverage (
  network_event_coverage_sequence bigint PRIMARY KEY,
  producer          text NOT NULL
    CHECK (producer IN ('telemetry_detector', 'network_observer')),
  coverage_began_at timestamptz NOT NULL,
  coverage_ended_at timestamptz NOT NULL,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (coverage_ended_at >= coverage_began_at)
);

LOCK TABLE public.network_events, public.network_event_coverage IN EXCLUSIVE MODE;
DROP TRIGGER IF EXISTS assign_network_event_sequence ON public.network_events;
DROP TRIGGER IF EXISTS refuse_network_event_update ON public.network_events;
DROP TRIGGER IF EXISTS assign_network_event_sequence ON public.network_event_coverage;
DROP TRIGGER IF EXISTS refuse_network_event_update ON public.network_event_coverage;

WITH unsequenced AS (
  SELECT network_event_id,
    row_number() OVER (
      ORDER BY recorded_at, observed_at, network_event_id
    ) + (
      SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END
      FROM public.network_event_sequence_generator
    ) AS network_event_sequence
  FROM public.network_events
  WHERE network_event_sequence IS NULL
)
UPDATE public.network_events e
SET network_event_sequence = unsequenced.network_event_sequence
FROM unsequenced
WHERE e.network_event_id = unsequenced.network_event_id;

UPDATE public.network_events
SET network_event_condition_id = network_event_id
WHERE network_event_phase = 'began' AND network_event_condition_id IS NULL;

SELECT setval('public.network_event_sequence_generator', stored.maximum)
FROM (SELECT max(network_event_sequence) AS maximum FROM public.network_events) stored,
  (
    SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END AS issued
    FROM public.network_event_sequence_generator
  ) generator
WHERE stored.maximum > generator.issued;

CREATE OR REPLACE FUNCTION public.assign_network_event_sequence()
  RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  PERFORM pg_advisory_xact_lock(7311042026);
  IF TG_TABLE_NAME = 'network_events' THEN
    NEW.network_event_sequence := nextval('public.network_event_sequence_generator');
  ELSE
    NEW.network_event_coverage_sequence := nextval('public.network_event_sequence_generator');
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.refuse_network_event_update()
  RETURNS trigger LANGUAGE plpgsql AS
$$
BEGIN
  RAISE EXCEPTION '% rows are immutable', TG_TABLE_NAME;
END
$$;

CREATE TRIGGER assign_network_event_sequence
  BEFORE INSERT ON public.network_events
  FOR EACH ROW EXECUTE FUNCTION public.assign_network_event_sequence();
CREATE TRIGGER refuse_network_event_update
  BEFORE UPDATE ON public.network_events
  FOR EACH ROW EXECUTE FUNCTION public.refuse_network_event_update();
CREATE TRIGGER assign_network_event_sequence
  BEFORE INSERT ON public.network_event_coverage
  FOR EACH ROW EXECUTE FUNCTION public.assign_network_event_sequence();
CREATE TRIGGER refuse_network_event_update
  BEFORE UPDATE ON public.network_event_coverage
  FOR EACH ROW EXECUTE FUNCTION public.refuse_network_event_update();

ALTER TABLE public.network_events ALTER COLUMN network_event_sequence SET NOT NULL;
COMMIT;

CREATE UNIQUE INDEX IF NOT EXISTS network_events_sequence_uniq
  ON public.network_events (network_event_sequence);
CREATE INDEX IF NOT EXISTS network_events_representative_sequence_idx
  ON public.network_events (representative_account, network_event_sequence);
CREATE INDEX IF NOT EXISTS network_events_condition_id_idx
  ON public.network_events (network_event_condition_id);
CREATE INDEX IF NOT EXISTS network_event_coverage_producer_ended_at_idx
  ON public.network_event_coverage (producer, coverage_ended_at DESC);

GRANT SELECT ON public.network_event_coverage TO nano_production_reader;
