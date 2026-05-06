-- schema.archive.postgres.sql
--
-- Canonical schema for the nano-community archive on PostgreSQL 15 +
-- TimescaleDB (TSL). Target database: nano_community_archive on
-- database-server (10.27.0.103:5432). Sits side-by-side with the legacy
-- MySQL schema.sql; once the storage MySQL nano_development DB is
-- decommissioned, this file becomes the canonical archive schema.
--
-- Engine decision: see text/homelab/nano-community-database-architecture-decision.md
-- (locked 2026-05-06). Compression policy compress_after = 7 days.
--
-- This file is engine-agnostic SQL; apply with:
--   psql -h database -U postgres -d nano_community_archive -f schema.archive.postgres.sql
--
-- Precondition: TimescaleDB TSL build installed and CREATE EXTENSION
-- timescaledb already present in the target database.

-- 1. Drop the bench schema if present (Phase 3 smoke subset).
DROP SCHEMA IF EXISTS bench CASCADE;

-- 2. Ensure timescaledb extension is loaded (no-op if already created).
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 3. Application role for ETL writers and the future nano-community app.
--    Password is set out-of-band (psql \password nano_archive_writer)
--    and stored in config.production.js archive_postgres connection block
--    plus /home/user/.pgpass on storage.
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nano_archive_writer') THEN
    CREATE ROLE nano_archive_writer LOGIN;
  END IF;
END
$do$;

-- 4. Tables (DDL types match the bench schema-base.sql verbatim, which in
--    turn was derived from the storage MySQL nano_development column types).

CREATE TABLE IF NOT EXISTS public.representatives_uptime (
  account     char(65) NOT NULL,
  online      smallint NOT NULL,
  "timestamp" integer  NOT NULL
);

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
  telemetry_timestamp  integer NOT NULL,
  "timestamp"          integer NOT NULL
);

-- representatives_telemetry_index: dedup-key fix locked 2026-05-06.
-- MySQL had UNIQUE(account) which silently failed (99.9997% NULL accounts).
-- New unique key is (node_id, "timestamp"); account is backfilled from
-- representatives_telemetry history during the ETL.
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
  telemetry_timestamp  integer NOT NULL,
  "timestamp"          integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounts_meta (
  account      char(65) NOT NULL,
  balance      numeric(39,0),
  block_count  integer,
  weight       numeric(39,0),
  delegators   integer,
  "timestamp"  integer NOT NULL
);

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
  created_at    integer NOT NULL,
  updated_at    integer
);

-- 5. Hypertables. Chunk intervals from the bench setup-pg.mjs (Phase 3):
--    30 days for the high-cardinality time-series tables, 90 days for
--    accounts_meta (lower cardinality dim, ~800 distinct accounts).
SELECT create_hypertable(
  'public.representatives_uptime', '"timestamp"',
  chunk_time_interval => 30 * 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.representatives_telemetry', '"timestamp"',
  chunk_time_interval => 30 * 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.representatives_telemetry_index', '"timestamp"',
  chunk_time_interval => 30 * 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.accounts_meta', '"timestamp"',
  chunk_time_interval => 90 * 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.posts', 'created_at',
  chunk_time_interval => 30 * 86400,
  if_not_exists => TRUE
);

-- 6. Unique constraints (dedup keys). All include the time column to
--    satisfy the TimescaleDB hypertable rule. UNIQUE INDEXes (not
--    constraints) are used so they can include "timestamp" without
--    affecting the upstream Knex code's ON CONFLICT targets.
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_account_ts_uniq
  ON public.representatives_uptime (account, "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_account_node_ts_uniq
  ON public.representatives_telemetry (account, node_id, "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_index_node_ts_uniq
  ON public.representatives_telemetry_index (node_id, "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_account_ts_uniq
  ON public.accounts_meta (account, "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS posts_id_created_uniq
  ON public.posts (id, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS posts_url_created_uniq
  ON public.posts (url, created_at);

-- 7. Lookup indexes (mirroring bench setup-pg.mjs and the leftmost-prefix
--    paths used by the existing nano-community app).
CREATE INDEX IF NOT EXISTS representatives_telemetry_node_ts
  ON public.representatives_telemetry (node_id, "timestamp");

-- 8. Compression configuration. Per-table segment_by chosen for cardinality:
--    account dominates uptime/telemetry/accounts_meta; node_id dominates
--    representatives_telemetry_index after the dedup-key fix; posts has
--    no segment_by (id distribution is uniform across chunks).
ALTER TABLE public.representatives_uptime SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = '"timestamp" DESC',
  timescaledb.compress_segmentby = 'account'
);
ALTER TABLE public.representatives_telemetry SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = '"timestamp" DESC',
  timescaledb.compress_segmentby = 'account'
);
ALTER TABLE public.representatives_telemetry_index SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = '"timestamp" DESC',
  timescaledb.compress_segmentby = 'node_id'
);
ALTER TABLE public.accounts_meta SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = '"timestamp" DESC',
  timescaledb.compress_segmentby = 'account'
);
ALTER TABLE public.posts SET (
  timescaledb.compress = true,
  timescaledb.compress_orderby = 'created_at DESC'
);

-- 9. Compression policy: compress chunks older than 7 days. The policy is
--    background-driven; chunks become compressed asynchronously and reads
--    transparently span compressed and uncompressed chunks.
SELECT add_compression_policy('public.representatives_uptime', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry_index', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.accounts_meta', INTERVAL '7 days', if_not_exists => TRUE);
SELECT add_compression_policy('public.posts', INTERVAL '7 days', if_not_exists => TRUE);

-- 10. ETL state table. Used by archive-to-postgres.mjs to mark per-table
--     completion and support resume after interruption.
CREATE TABLE IF NOT EXISTS public.etl_state (
  table_name        text PRIMARY KEY,
  rows_extracted    bigint NOT NULL DEFAULT 0,
  rows_inserted     bigint NOT NULL DEFAULT 0,
  last_max_ts       integer,
  started_at        timestamptz,
  completed_at      timestamptz,
  notes             text
);

-- 11. Privileges. nano_archive_writer reads/writes the time-series tables
--     and etl_state; future nano_archive_reader is created at app-cutover.
GRANT USAGE ON SCHEMA public TO nano_archive_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nano_archive_writer;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nano_archive_writer;
