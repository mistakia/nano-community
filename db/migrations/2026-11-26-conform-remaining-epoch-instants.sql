-- Conform the remaining epoch-integer instants to timestamptz.
--
-- Follows 2026-11-26-conform-epoch-instants (the hypertables, posts and the
-- network event tables). Every table here is a plain table, so each column is
-- rewritten in place inside one transaction; there is no online copy step and
-- no cleanup step. Any failure rolls the whole transaction back and leaves the
-- old columns serving.
--
-- Run with every writer of these tables stopped, then deploy the code that
-- reads the new columns before starting them again; the old code cannot run
-- against the new columns and the new code cannot run against the old:
--   - pm2 stop server (the message routes write account_keys, blocks_meta,
--     account labels and representatives_meta_index with its changelog)
--   - pm2 stop network-observer (reads voting_weight, accounts_meta_index)
--   - crons in server/server-crontab: import-telemetry (voting_weight,
--     representatives_network), import-accounts-meta (accounts_meta_index),
--     import-accounts-rep (accounts_delegators), import-uptime
--     (accounts.last_seen_at), calculate-uptime (reads accounts),
--     detect-telemetry-network-events and probe-representative-rpc
--     (etl_state, network_event_detector_state), rollup-uptime
--     (representatives_uptime_rollup_day), import-github-discussions,
--     import-github-events, sync-account-labels (account_labels,
--     accounts_changelog) and sync-representative-discord-identity
--     (representatives_meta_index and its changelog).
--
-- Apply on nano-community as postgres, with a lock timeout so a stuck reader
-- fails the migration instead of queueing behind it:
--   PGOPTIONS='-c lock_timeout=30s' sudo -n --preserve-env=PGOPTIONS -u postgres \
--     psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-remaining-epoch-instants.sql
-- Not during the weekly backup dump (Sunday 00:00 UTC, about 25 minutes).
--
-- Sizes on 2026-11-26: voting_weight 4.85 M rows and 1.2 GB, accounts 273 k
-- rows and 78 MB, accounts_delegators 138 k rows and 82 MB, account_labels
-- 234 k rows and 80 MB, representatives_network 52 k rows and 19 MB,
-- representatives_uptime_rollup_day 73 k rows and 18 MB, github_events 15 k
-- rows and 10 MB, users empty, the rest under 1 k
-- rows. Each table holds an ACCESS EXCLUSIVE lock from the LOCK below to the
-- commit. The voting_weight rewrite and its unique index rebuild dominate: on
-- the order of a minute. Free disk needed: about one more copy of each table,
-- 1.6 GB in all, released at commit.
--
-- Kept as epoch integers, by design, with a column comment saying why:
--   nano_community_messages.created_at and blocks_meta.issued_at hold the
--   issued_at a signer put inside a signed message.
--
-- Rollback: 2026-11-26-conform-remaining-epoch-instants-rollback.sql.

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

-- Instants that keep their name.
ALTER TABLE public.account_keys
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN revoked_at TYPE timestamptz USING to_timestamp(revoked_at);

ALTER TABLE public.account_labels
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at),
  ALTER COLUMN expires_at TYPE timestamptz USING to_timestamp(expires_at);

ALTER TABLE public.blocks_meta
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at),
  ALTER COLUMN hidden_at TYPE timestamptz USING to_timestamp(hidden_at);

ALTER TABLE public.github_discussions
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at),
  ALTER COLUMN closed_at TYPE timestamptz USING to_timestamp(closed_at);

ALTER TABLE public.github_events
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at);

ALTER TABLE public.network_event_detector_state
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at);

ALTER TABLE public.representatives_meta_index
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN ninja_created_at TYPE timestamptz USING to_timestamp(ninja_created_at);

ALTER TABLE public.sources
  ALTER COLUMN created_at TYPE timestamptz USING to_timestamp(created_at),
  ALTER COLUMN updated_at TYPE timestamptz USING to_timestamp(updated_at);

-- Instants renamed to <event>_at.
ALTER TABLE public.accounts_changelog RENAME COLUMN "timestamp" TO changed_at;
ALTER TABLE public.accounts_changelog
  ALTER COLUMN changed_at TYPE timestamptz USING to_timestamp(changed_at);

ALTER TABLE public.accounts_delegators RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.accounts_delegators
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);

ALTER TABLE public.accounts_meta_index RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.accounts_meta_index
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);

ALTER TABLE public.etl_state RENAME COLUMN last_max_ts TO watermark_at;
ALTER TABLE public.etl_state
  ALTER COLUMN watermark_at TYPE timestamptz USING to_timestamp(watermark_at);

ALTER TABLE public.representatives_meta_index RENAME COLUMN "timestamp" TO recorded_at;
ALTER TABLE public.representatives_meta_index
  ALTER COLUMN recorded_at TYPE timestamptz USING to_timestamp(recorded_at);

ALTER TABLE public.representatives_meta_index_changelog RENAME COLUMN "timestamp" TO changed_at;
ALTER TABLE public.representatives_meta_index_changelog
  ALTER COLUMN changed_at TYPE timestamptz USING to_timestamp(changed_at);

ALTER TABLE public.representatives_network RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.representatives_network
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);

ALTER TABLE public.representatives_uptime_rollup_day RENAME COLUMN "timestamp" TO day_began_at;
ALTER TABLE public.representatives_uptime_rollup_day
  ALTER COLUMN day_began_at TYPE timestamptz USING to_timestamp(day_began_at);

ALTER TABLE public.accounts RENAME COLUMN last_seen TO last_seen_at;
ALTER TABLE public.accounts
  ALTER COLUMN last_seen_at TYPE timestamptz USING to_timestamp(last_seen_at);

ALTER TABLE public.users RENAME COLUMN last_visit TO last_visited_at;
ALTER TABLE public.users
  ALTER COLUMN last_visited_at TYPE timestamptz USING to_timestamp(last_visited_at);

ALTER TABLE public.voting_weight RENAME COLUMN "timestamp" TO observed_at;
ALTER TABLE public.voting_weight
  ALTER COLUMN observed_at TYPE timestamptz USING to_timestamp(observed_at);

-- Epoch values kept on purpose.
COMMENT ON COLUMN public.nano_community_messages.created_at IS
  'Deliberately epoch seconds: the issued_at the signer put in the signed message, stored as signed.';
COMMENT ON COLUMN public.blocks_meta.issued_at IS
  'Deliberately epoch seconds: the issued_at of the signed set_block_meta message, which orders notes and must match the signed value.';

COMMIT;

SELECT 'conform complete: deploy the new code, then start the writers' AS done;
