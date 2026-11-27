-- schema.archive.postgres.sql
--
-- Canonical schema for the nano-community archive on PostgreSQL 15 +
-- TimescaleDB (TSL). Target database: nano_community_archive on
-- database-server (10.27.0.103:5432). Fed nightly by
-- scripts/archive-to-postgres.mjs --delta from the VPS database; the
-- tables mirror the VPS columns under the VPS names, instants as
-- timestamptz.
--
-- Engine decision: see text/homelab/nano-community-database-architecture-decision.md
-- (locked 2026-05-06). Compression policy compress_after = 7 days.
--
-- Idempotent; apply with:
--   sudo -n -u postgres psql -d nano_community_archive -v ON_ERROR_STOP=1 \
--     -f db/schema.archive.postgres.sql
--
-- Precondition: TimescaleDB TSL build installed.
--
-- The 2026-11-27 conform of the epoch-integer instants is
-- db/migrations/2026-11-27-conform-archive-epoch-instants-*.sql.

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Application role for the delta writer. Password is set out-of-band
-- (psql \password nano_archive_writer) and stored in the archive_postgres
-- stanza of config.production.json plus /home/user/.pgpass on storage.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nano_archive_writer') THEN
    CREATE ROLE nano_archive_writer LOGIN;
  END IF;
END
$do$;

-- Time-series hypertables. Chunks are 30 days, accounts_meta 90 days (about
-- 800 distinct accounts). Unique indexes include the time column, as
-- TimescaleDB requires; the delta inserts with ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS public.representatives_uptime (
  account     char(65) NOT NULL,
  online      smallint NOT NULL,
  observed_at timestamptz NOT NULL
);
SELECT create_hypertable('public.representatives_uptime', 'observed_at',
  chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_account_ts_uniq
  ON public.representatives_uptime (account, observed_at);

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
SELECT create_hypertable('public.representatives_telemetry', 'observed_at',
  chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_account_node_ts_uniq
  ON public.representatives_telemetry (account, node_id, observed_at);
CREATE INDEX IF NOT EXISTS representatives_telemetry_node_ts
  ON public.representatives_telemetry (node_id, observed_at);
COMMENT ON COLUMN public.representatives_telemetry.reported_at IS
  'When the node stamped its telemetry message.';
COMMENT ON COLUMN public.representatives_telemetry.observed_at IS
  'When nano.community collected the telemetry.';

-- History only: the VPS collapsed this table on 2026-05-19 and nothing
-- writes it. Unique on (node_id, observed_at); account is backfilled from
-- representatives_telemetry.
CREATE TABLE IF NOT EXISTS public.representatives_telemetry_index (
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
SELECT create_hypertable('public.representatives_telemetry_index', 'observed_at',
  chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_index_node_ts_uniq
  ON public.representatives_telemetry_index (node_id, observed_at);

-- History only: the 2026-05 bulk load from MySQL. The delta does not copy
-- accounts_meta.
CREATE TABLE IF NOT EXISTS public.accounts_meta (
  account      char(65) NOT NULL,
  balance      numeric(39,0),
  block_count  integer,
  weight       numeric(39,0),
  delegators   integer,
  observed_at  timestamptz NOT NULL
);
SELECT create_hypertable('public.accounts_meta', 'observed_at',
  chunk_time_interval => INTERVAL '90 days', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_account_ts_uniq
  ON public.accounts_meta (account, observed_at);

-- 4,111 posts carry a created_at within the first 843 seconds of 1970
-- (measured 2026-11-27), not a real post time; they are kept as stored.
CREATE TABLE IF NOT EXISTS public.posts (
  id            bigint NOT NULL,
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
  social_score  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL,
  updated_at    timestamptz
);
SELECT create_hypertable('public.posts', 'created_at',
  chunk_time_interval => INTERVAL '30 days', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS posts_id_created_uniq
  ON public.posts (id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS posts_url_created_uniq
  ON public.posts (url, created_at);

-- Compression: segment_by chosen for cardinality; posts has none (id
-- distribution is uniform across chunks). Chunks older than 7 days compress
-- in the background, and reads span compressed and uncompressed chunks.
ALTER TABLE public.representatives_uptime SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
ALTER TABLE public.representatives_telemetry SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
ALTER TABLE public.representatives_telemetry_index SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'node_id');
ALTER TABLE public.accounts_meta SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'observed_at DESC',
  timescaledb.compress_segmentby = 'account');
ALTER TABLE public.posts SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'created_at DESC');

SELECT add_compression_policy('public.representatives_uptime', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry_index', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.accounts_meta', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.posts', INTERVAL '7 days', if_not_exists => TRUE);

-- Network events, copied from the VPS with network_event_sequence as the
-- watermark. A plain table with no retention: events are low volume and the
-- history is the point. Operator-only event types are archived too; any
-- public dump must exclude them (see common/network-event-types.mjs). The
-- VPS triggers that assign sequences and refuse updates are not mirrored;
-- the archive stores the VPS values as plain columns.
CREATE TABLE IF NOT EXISTS public.network_events (
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
CREATE INDEX IF NOT EXISTS network_events_observed_at_idx
  ON public.network_events (observed_at DESC);
CREATE INDEX IF NOT EXISTS network_events_recorded_at_idx
  ON public.network_events (recorded_at);
CREATE INDEX IF NOT EXISTS network_events_sequence_idx
  ON public.network_events (network_event_sequence);

-- Producer coverage, copied with network_event_coverage_sequence as the
-- watermark.
CREATE TABLE IF NOT EXISTS public.network_event_coverage (
  network_event_coverage_sequence bigint PRIMARY KEY,
  producer          text NOT NULL,
  coverage_began_at timestamptz NOT NULL,
  coverage_ended_at timestamptz NOT NULL,
  recorded_at       timestamptz NOT NULL
);

-- Delta state, one row per table. A table's watermark is the largest value
-- of its watermark column the delta has copied: watermark_at for a table
-- read by an instant, watermark_sequence for one read by its delivery
-- sequence (see WATERMARK in scripts/archive-to-postgres.mjs).
CREATE TABLE IF NOT EXISTS public.etl_state (
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

-- Privileges. nano_archive_writer reads and writes every table.
GRANT USAGE ON SCHEMA public TO nano_archive_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nano_archive_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nano_archive_writer;
