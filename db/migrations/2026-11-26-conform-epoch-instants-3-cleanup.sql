-- Conform epoch-integer instants to timestamptz — step 3 of 3: cleanup.
--
-- Drops the retired epoch tables, the copy bookkeeping and the integer-now
-- function. Irreversible: run it only after the new code has served for at
-- least a week and the rollback script is no longer wanted. The archive
-- delta cron must have run at least once against the new tables first.
--
--   PGOPTIONS='-c lock_timeout=10s' sudo -n --preserve-env=PGOPTIONS -u postgres \
--     psql -d nano_production -v ON_ERROR_STOP=1 \
--     -f db/migrations/2026-11-26-conform-epoch-instants-3-cleanup.sql

\set ON_ERROR_STOP on

DROP TABLE public.representatives_uptime_epoch_old;
DROP TABLE public.representatives_telemetry_epoch_old;
DROP TABLE public.accounts_meta_epoch_old;
DROP TABLE public.epoch_conform_state;
DROP FUNCTION public.unix_now_seconds();
