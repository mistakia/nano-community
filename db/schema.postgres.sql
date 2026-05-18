-- schema.postgres.sql
--
-- Canonical full-surface schema for nano-community VPS production on
-- PostgreSQL 15 + TimescaleDB (TSL). Target database: nano_production on
-- the VPS (127.0.0.1:5432). Supersedes db/schema.mysql.sql at cutover;
-- the MySQL file is retained for 14-day rollback insurance, then deleted.
--
-- Engine decision: see text/homelab/nano-community-database-architecture-decision.md
-- (locked 2026-05-06). Compression policy compress_after = 7 days.
-- Retention windows mirror scripts/archive-mysql.mjs:104-126: uptime 12w,
-- telemetry 6w, telemetry_index 6w, accounts_meta no retention (compression
-- alone shrinks 23 GB to ~5 GB), posts plain table (NOT a hypertable; the
-- "exclude rows referenced by post_labels" rule cannot be expressed via
-- drop_chunks).
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
END
$do$;

-- 2. Shared integer-now function for hypertable policies. Return type
--    INTEGER matches the int4 timestamp columns; STABLE because now()
--    varies per txn.
CREATE OR REPLACE FUNCTION public.unix_now_seconds()
  RETURNS INTEGER LANGUAGE SQL STABLE AS
$$ SELECT EXTRACT(EPOCH FROM now())::INTEGER $$;

-- 3. Tables

CREATE TABLE IF NOT EXISTS public.accounts (
  account       char(65) NOT NULL,
  alias         varchar(255),
  monitor_url   varchar(255),
  watt_hour     integer,
  representative boolean DEFAULT false,
  last_seen     integer
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_account_uniq
  ON public.accounts (account);

CREATE TABLE IF NOT EXISTS public.accounts_changelog (
  account         char(65) NOT NULL,
  "column"        varchar(65) NOT NULL,
  previous_value  varchar(1000) DEFAULT '',
  new_value       varchar(1000) DEFAULT '',
  "timestamp"     integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_changelog_change_uniq
  ON public.accounts_changelog (account, "column", previous_value, new_value, "timestamp");

CREATE TABLE IF NOT EXISTS public.account_keys (
  account           char(65) NOT NULL,
  public_key        varchar(64) NOT NULL,
  link_signature    varchar(128) NOT NULL,
  revoke_signature  varchar(128),
  created_at        integer NOT NULL,
  revoked_at        integer
);
CREATE UNIQUE INDEX IF NOT EXISTS account_keys_public_key_uniq
  ON public.account_keys (public_key);
CREATE UNIQUE INDEX IF NOT EXISTS account_keys_account_public_key_uniq
  ON public.account_keys (account, public_key);

CREATE TABLE IF NOT EXISTS public.accounts_delegators (
  account         char(65) NOT NULL,
  representative  char(65) NOT NULL,
  balance         numeric(39,0),
  "timestamp"     integer NOT NULL
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
  "timestamp"  integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.accounts_meta_index (
  account      char(65) NOT NULL,
  balance      numeric(39,0),
  block_count  integer,
  weight       numeric(39,0),
  delegators   integer,
  "timestamp"  integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_index_account_uniq
  ON public.accounts_meta_index (account);

CREATE TABLE IF NOT EXISTS public.accounts_tags (
  account  char(65) NOT NULL,
  tag      char(65) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_tags_account_tag_uniq
  ON public.accounts_tags (account, tag);

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
  created_at     integer NOT NULL,
  updated_at     integer,
  closed_at      integer
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
  created_at    integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.github_issues (
  id               varchar(15) NOT NULL PRIMARY KEY,
  state            varchar(10) NOT NULL,
  actor_id         varchar(15) NOT NULL,
  actor_name       varchar(100) NOT NULL,
  actor_avatar     varchar(255) NOT NULL,
  assignee_id      varchar(15),
  assignee_name    varchar(100),
  assignee_avatar  varchar(255),
  ref              varchar(255),
  title            varchar(255),
  url              varchar(255),
  repo             varchar(255) NOT NULL,
  body             text,
  created_at       integer NOT NULL,
  updated_at       integer
);

CREATE TABLE IF NOT EXISTS public.github_issue_labels (
  issue_id     varchar(15) NOT NULL,
  label_id     varchar(255) NOT NULL,
  label_name   varchar(255) NOT NULL,
  label_color  varchar(255) NOT NULL,
  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.nano_community_messages (
  version      smallint NOT NULL,
  entry_id     varchar(64),
  chain_id     varchar(64),
  entry_clock  bigint,
  chain_clock  bigint,
  public_key   varchar(64) NOT NULL,
  operation    varchar(50) NOT NULL,
  content      text,
  tags         text,
  "references" text,
  created_at   bigint NOT NULL,
  signature    varchar(128) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS nano_community_messages_signature_uniq
  ON public.nano_community_messages (signature);

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
  created_at    integer NOT NULL,
  updated_at    integer
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
  created_at              integer,
  mynano_ninja            varchar(255),
  ninja_ram_description   varchar(255),
  ninja_cpu_description   varchar(255),
  ninja_description       varchar(1000),
  ninja_type              varchar(255),
  ninja_created_at        integer,
  ninja_provider          varchar(255),
  reddit                  varchar(255),
  twitter                 varchar(255),
  discord                 varchar(255),
  github                  varchar(255),
  website                 varchar(255),
  email                   varchar(255),
  nano_node_monitor_url   varchar(255),
  "timestamp"             integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_meta_index_account_uniq
  ON public.representatives_meta_index (account);

CREATE TABLE IF NOT EXISTS public.representatives_meta_index_changelog (
  account         char(65) NOT NULL,
  "column"        varchar(65) NOT NULL,
  previous_value  varchar(1000) DEFAULT '',
  new_value       varchar(1000) DEFAULT '',
  "timestamp"     integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_meta_index_changelog_change_uniq
  ON public.representatives_meta_index_changelog (account, "column", previous_value, new_value, "timestamp");

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
  "timestamp"   integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_network_account_ts_uniq
  ON public.representatives_network (account, "timestamp");

CREATE TABLE IF NOT EXISTS public.representatives_network_index (
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
  "timestamp"   integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_network_index_account_uniq
  ON public.representatives_network_index (account);

CREATE TABLE IF NOT EXISTS public.representatives_uptime (
  account     char(65) NOT NULL,
  online      smallint NOT NULL,
  "timestamp" integer NOT NULL
);
CREATE INDEX IF NOT EXISTS representatives_uptime_online
  ON public.representatives_uptime (online);

CREATE TABLE IF NOT EXISTS public.representatives_uptime_index (
  account     char(65) NOT NULL,
  online      smallint NOT NULL,
  "timestamp" integer NOT NULL
);
-- Tightened to single-column UNIQUE(account) per plan: matches the
-- import-uptime callsite's .onConflict('account') intent (one row per
-- account, latest online/timestamp). The MySQL DDL had UNIQUE(account,
-- online) which permitted two rows per account. Bulk ETL must dedup
-- historical MySQL rows during the load (one-shot step in vps-to-postgres.mjs).
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_index_account_uniq
  ON public.representatives_uptime_index (account);
CREATE INDEX IF NOT EXISTS representatives_uptime_index_online
  ON public.representatives_uptime_index (online);

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
  "timestamp"        integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_rollup_day_account_ts_uniq
  ON public.representatives_uptime_rollup_day (account, "timestamp");

CREATE TABLE IF NOT EXISTS public.sources (
  id                varchar(255),
  title             varchar(255),
  logo_url          varchar(255),
  score_avg         numeric(7,1) NOT NULL DEFAULT 1.0,
  social_score_avg  numeric(7,1) NOT NULL DEFAULT 1.0,
  created_at        integer,
  updated_at        integer
);
CREATE UNIQUE INDEX IF NOT EXISTS sources_id_uniq
  ON public.sources (id);

CREATE TABLE IF NOT EXISTS public.users (
  id          integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  username    varchar(32) NOT NULL,
  public_key  varchar(64) NOT NULL,
  signature   varchar(128) NOT NULL,
  last_visit  integer NOT NULL
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
  "timestamp"                   integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS voting_weight_address_ts_uniq
  ON public.voting_weight (address, "timestamp");

-- 4. Hypertables. chunk_time_interval = 1 day per plan (smaller chunks than
--    the archive's 30d/90d because VPS retention windows are much shorter:
--    uptime 12w, telemetry 6w).
SELECT create_hypertable(
  'public.representatives_uptime', 'timestamp',
  chunk_time_interval => 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.representatives_telemetry', 'timestamp',
  chunk_time_interval => 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.representatives_telemetry_index', 'timestamp',
  chunk_time_interval => 86400,
  if_not_exists => TRUE
);
SELECT create_hypertable(
  'public.accounts_meta', 'timestamp',
  chunk_time_interval => 86400,
  if_not_exists => TRUE
);

-- 5. Hypertable unique constraints (must include the time column).
CREATE UNIQUE INDEX IF NOT EXISTS representatives_uptime_account_ts_uniq
  ON public.representatives_uptime (account, "timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_account_node_ts_uniq
  ON public.representatives_telemetry (account, node_id, "timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS representatives_telemetry_index_node_ts_uniq
  ON public.representatives_telemetry_index (node_id, "timestamp");
CREATE UNIQUE INDEX IF NOT EXISTS accounts_meta_account_ts_uniq
  ON public.accounts_meta (account, "timestamp");

-- 6. Integer-now registration. Required by add_compression_policy /
--    add_retention_policy on int4-time hypertables. Gap that broke
--    compression in the archive migration; declared up-front here.
SELECT set_integer_now_func('public.representatives_uptime',          'public.unix_now_seconds', replace_if_exists => TRUE);
SELECT set_integer_now_func('public.representatives_telemetry',       'public.unix_now_seconds', replace_if_exists => TRUE);
SELECT set_integer_now_func('public.representatives_telemetry_index', 'public.unix_now_seconds', replace_if_exists => TRUE);
SELECT set_integer_now_func('public.accounts_meta',                   'public.unix_now_seconds', replace_if_exists => TRUE);

-- 7. Compression configuration.
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

-- 8. Compression policies: compress chunks older than 7 days (604800 s).
SELECT add_compression_policy('public.representatives_uptime',          BIGINT '604800', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry',       BIGINT '604800', if_not_exists => TRUE);
SELECT add_compression_policy('public.representatives_telemetry_index', BIGINT '604800', if_not_exists => TRUE);
SELECT add_compression_policy('public.accounts_meta',                   BIGINT '604800', if_not_exists => TRUE);

-- 9. Retention policies (drop_after in seconds). Per scripts/archive-mysql.mjs:
--    uptime 12 weeks, telemetry 6 weeks, telemetry_index 6 weeks.
--    accounts_meta and posts: no retention.
SELECT add_retention_policy('public.representatives_uptime',          BIGINT '7257600', if_not_exists => TRUE); -- 12w
SELECT add_retention_policy('public.representatives_telemetry',       BIGINT '3628800', if_not_exists => TRUE); -- 6w
SELECT add_retention_policy('public.representatives_telemetry_index', BIGINT '3628800', if_not_exists => TRUE); -- 6w

-- 10. ETL state table. Populated by the one-shot scripts/vps-to-postgres.mjs
--     bulk migrator only. Independent of database-server's
--     nano_community_archive.etl_state which the archive delta cron uses.
CREATE TABLE IF NOT EXISTS public.etl_state (
  table_name      text PRIMARY KEY,
  rows_extracted  bigint NOT NULL DEFAULT 0,
  rows_inserted   bigint NOT NULL DEFAULT 0,
  last_max_ts     integer,
  started_at      timestamptz,
  completed_at    timestamptz,
  notes           text
);

-- 11. Privileges. nano_production_app gets full DML on the app surface;
--     nano_production_reader gets SELECT on the 5 hot read tables for the
--     storage-side archive delta cron arriving via autossh tunnel.
GRANT USAGE ON SCHEMA public TO nano_production_app, nano_production_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nano_production_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO nano_production_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nano_production_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO nano_production_app;

GRANT SELECT ON
  public.representatives_uptime,
  public.representatives_telemetry,
  public.representatives_telemetry_index,
  public.accounts_meta,
  public.posts
TO nano_production_reader;
