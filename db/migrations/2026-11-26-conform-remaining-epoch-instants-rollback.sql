-- Rollback for 2026-11-26-conform-remaining-epoch-instants: restores the
-- epoch-integer columns and their old names. Same preconditions as the
-- forward script: every writer stopped, then the previous code deployed before
-- the writers start again. Instants written since the conform lose sub-second
-- precision, as epoch integers carry whole seconds.
--
--   PGOPTIONS='-c lock_timeout=30s' sudo -n --preserve-env=PGOPTIONS -u postgres \
--     psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-remaining-epoch-instants-rollback.sql

\set ON_ERROR_STOP on

BEGIN;
SET LOCAL lock_timeout = '30s';

LOCK TABLE public.accounts, public.users, public.account_keys,
  public.account_labels,
  public.accounts_changelog, public.accounts_delegators,
  public.accounts_meta_index, public.blocks_meta, public.etl_state,
  public.github_discussions, public.github_events,
  public.network_event_detector_state, public.representatives_meta_index,
  public.representatives_meta_index_changelog, public.representatives_network,
  public.representatives_uptime_rollup_day, public.sources,
  public.voting_weight
IN ACCESS EXCLUSIVE MODE;

ALTER TABLE public.account_keys
  ALTER COLUMN created_at TYPE integer USING floor(extract(epoch FROM created_at))::integer,
  ALTER COLUMN revoked_at TYPE integer USING floor(extract(epoch FROM revoked_at))::integer;

ALTER TABLE public.account_labels
  ALTER COLUMN observed_at TYPE integer USING floor(extract(epoch FROM observed_at))::integer,
  ALTER COLUMN expires_at TYPE bigint USING floor(extract(epoch FROM expires_at))::bigint;

ALTER TABLE public.blocks_meta
  ALTER COLUMN updated_at TYPE bigint USING floor(extract(epoch FROM updated_at))::bigint,
  ALTER COLUMN hidden_at TYPE bigint USING floor(extract(epoch FROM hidden_at))::bigint;

ALTER TABLE public.github_discussions
  ALTER COLUMN created_at TYPE integer USING floor(extract(epoch FROM created_at))::integer,
  ALTER COLUMN updated_at TYPE integer USING floor(extract(epoch FROM updated_at))::integer,
  ALTER COLUMN closed_at TYPE integer USING floor(extract(epoch FROM closed_at))::integer;

ALTER TABLE public.github_events
  ALTER COLUMN created_at TYPE integer USING floor(extract(epoch FROM created_at))::integer;

ALTER TABLE public.network_event_detector_state
  ALTER COLUMN updated_at TYPE integer USING floor(extract(epoch FROM updated_at))::integer;

ALTER TABLE public.representatives_meta_index
  ALTER COLUMN created_at TYPE integer USING floor(extract(epoch FROM created_at))::integer,
  ALTER COLUMN ninja_created_at TYPE integer USING floor(extract(epoch FROM ninja_created_at))::integer;

ALTER TABLE public.sources
  ALTER COLUMN created_at TYPE integer USING floor(extract(epoch FROM created_at))::integer,
  ALTER COLUMN updated_at TYPE integer USING floor(extract(epoch FROM updated_at))::integer;

ALTER TABLE public.accounts_changelog
  ALTER COLUMN changed_at TYPE integer USING floor(extract(epoch FROM changed_at))::integer;
ALTER TABLE public.accounts_changelog RENAME COLUMN changed_at TO "timestamp";

ALTER TABLE public.accounts_delegators
  ALTER COLUMN observed_at TYPE integer USING floor(extract(epoch FROM observed_at))::integer;
ALTER TABLE public.accounts_delegators RENAME COLUMN observed_at TO "timestamp";

ALTER TABLE public.accounts_meta_index
  ALTER COLUMN observed_at TYPE integer USING floor(extract(epoch FROM observed_at))::integer;
ALTER TABLE public.accounts_meta_index RENAME COLUMN observed_at TO "timestamp";

ALTER TABLE public.etl_state
  ALTER COLUMN watermark_at TYPE integer USING floor(extract(epoch FROM watermark_at))::integer;
ALTER TABLE public.etl_state RENAME COLUMN watermark_at TO last_max_ts;

ALTER TABLE public.representatives_meta_index
  ALTER COLUMN recorded_at TYPE integer USING floor(extract(epoch FROM recorded_at))::integer;
ALTER TABLE public.representatives_meta_index RENAME COLUMN recorded_at TO "timestamp";

ALTER TABLE public.representatives_meta_index_changelog
  ALTER COLUMN changed_at TYPE integer USING floor(extract(epoch FROM changed_at))::integer;
ALTER TABLE public.representatives_meta_index_changelog RENAME COLUMN changed_at TO "timestamp";

ALTER TABLE public.representatives_network
  ALTER COLUMN observed_at TYPE integer USING floor(extract(epoch FROM observed_at))::integer;
ALTER TABLE public.representatives_network RENAME COLUMN observed_at TO "timestamp";

ALTER TABLE public.representatives_uptime_rollup_day
  ALTER COLUMN day_began_at TYPE integer USING floor(extract(epoch FROM day_began_at))::integer;
ALTER TABLE public.representatives_uptime_rollup_day RENAME COLUMN day_began_at TO "timestamp";

ALTER TABLE public.accounts
  ALTER COLUMN last_seen_at TYPE integer USING floor(extract(epoch FROM last_seen_at))::integer;
ALTER TABLE public.accounts RENAME COLUMN last_seen_at TO last_seen;

ALTER TABLE public.users
  ALTER COLUMN last_visited_at TYPE integer USING floor(extract(epoch FROM last_visited_at))::integer;
ALTER TABLE public.users RENAME COLUMN last_visited_at TO last_visit;

ALTER TABLE public.voting_weight
  ALTER COLUMN observed_at TYPE integer USING floor(extract(epoch FROM observed_at))::integer;
ALTER TABLE public.voting_weight RENAME COLUMN observed_at TO "timestamp";

COMMENT ON COLUMN public.nano_community_messages.created_at IS NULL;
COMMENT ON COLUMN public.blocks_meta.issued_at IS NULL;

COMMIT;
