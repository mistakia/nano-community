# CLAUDE.md

Guidance for Claude Code working in this repository.

For graph context (related task dir, tags, sibling nano repos), see [ABOUT.md](ABOUT.md).

## Project Overview

[nano.community](https://nano.community) — community-driven documentation, representative monitoring, and stats aggregation site for the nano cryptocurrency. React 19 + Redux + Material-UI on the client; Express on the server. Webpack dev/prod builds; static export via react-snap.

## Build / Run

```bash
yarn install
yarn dev               # Concurrent webpack + Express
yarn dev:live          # Client only at localhost:8094 against the production API (no local DB needed)
yarn build             # Production bundle + react-snap static generation
yarn test              # Mocha (TZ=America/New_York)
yarn lint
```

`yarn test` needs PostgreSQL with TimescaleDB on 127.0.0.1, database `nano_test`, user `postgres` without a password. The port defaults to 5432 and `NANO_TEST_PG_PORT` overrides it. The test API server listens on 8085, and `NANO_TEST_API_PORT` overrides it where that port is taken. Drop and recreate `nano_test` before a run.

```bash
docker run -d --name nano-test-pg -e POSTGRES_DB=nano_test -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:5435:5432 timescale/timescaledb:latest-pg16
NANO_TEST_PG_PORT=5435 yarn test
```

## Deploy

1. Confirm CI (Test and CodeQL) is green on the head commit.
2. On host `nano-community` (the ssh alias for the origin server, since `nano.community` resolves to Cloudflare), fast-forward `/root/nano-community/source` to `origin/main`. It is the host's only checkout: pm2 serves it and every cron job in `server/server-crontab` runs from `source/scripts`, so a deploy updates both. If `yarn.lock` changed, run `yarn install` there in the same command. The pm2 file watch restarts the server on the fast-forward, and it crashes on any missing dependency until the install lands.
3. If `api/` or `server/` changed, run `pm2 restart server` there and confirm its uptime reset. The pm2 file watch does not reliably restart it. `pm2` is only on the login shell's PATH, so over ssh run it as `ssh nano-community "bash -lc 'pm2 restart server'"`.
4. On the MacBook, run `yarn build` (react-snap prerender) and then `yarn deploy`. The storage-server containers cannot build: react-snap's bundled Chromium needs X11 libraries they lack. It mirrors `build/` to the host and deletes files the build no longer produces, so a retired prerendered page cannot keep being served. Build from current `origin/main` in a clean worktree (`git worktree add --detach <dir> origin/main`, with `node_modules` symlinked), never from your own older commit or the shared checkout. The deploy replaces the whole client, so an older commit rolls back other sessions' shipped client commits, and the shared checkout can carry a sibling's uncommitted files.
5. If `scripts/` or `server/storage-crontab` changed, fast-forward `/home/user/nano-community` on base-storage to `origin/main` the same way, with `yarn install` if `yarn.lock` changed. That checkout runs the storage-side crons: the archive delta and the subreddit imports. Load a changed crontab with `yarn load:crontab:storage`, and a changed `server/server-crontab` with `yarn load:crontab`.
6. If `db/schema.postgres.sql` changed, apply the whole file on `nano-community` as `postgres` with a session lock timeout: `PGOPTIONS='-c lock_timeout=10s' sudo -n --preserve-env=PGOPTIONS -u postgres psql -d nano_production -v ON_ERROR_STOP=1 -f <file>`. The file re-runs ALTERs that take an exclusive lock on the hypertables, and without the timeout one long reader queues every site read behind it. Never apply during the weekly backup dump, Sunday 00:00 UTC for about 25 minutes: on 2026-11-15 an apply queued behind it stalled `representatives_uptime` for 5 minutes. Re-apply if the timeout fires.

## Release the CLI

`.github/workflows/publish-npm.yml` publishes `cli/` to npm as `nano-community-cli` by Trusted Publishing (OIDC). No npm token exists, and the package disallows tokens.

The CLI is installed on strangers' representative hosts, so it has no dependencies. It uses Node built-ins for prompts, arguments and requests, and signs with `cli/sign-message.mjs`, which carries the nano-signed-message format over a vendored `@noble/ed25519` (`cli/vendor/`, upgraded by replacing the file under its header). `test/cli.package.test.mjs` fails on any dependency or on an import outside the `files` list, and `test/cli.sign-message.test.mjs` holds the signer to the nano-signed-message test vectors.

1. Bump `version` in `cli/package.json` and commit to `main`. The workflow publishes only a version npm does not have yet.
2. The operator approves the `npm-release` deployment on GitHub.
3. Confirm with `curl -s https://registry.npmjs.org/nano-community-cli | jq -r '."dist-tags".latest'`.

## Architecture

```
api/                   # REST endpoints
server/                # Node backend (Express)
common/                # Shared client/server logic
db/                    # schema.postgres.sql: idempotent sections applied by hand with psql
docs/                  # Markdown content (introduction, getting-started, design)
static/                # Assets
cli/                   # Tooling
```

Auth: JWT. Integrations: Discord, Twitter. Storage: PostgreSQL 15 + TimescaleDB via knex.

## Task Board (nostr)

The community task board is signed nostr events on relays. nano.community is one client of it. The protocol, with signed worked examples, is `docs/design/task-board-protocol.md`.

- `common/task-board/` holds the protocol constants, event templates and the pure view reducer (`build-task-board-state.mjs`). Every client must derive the same board from it. The web of trust (`build-trust-graph.mjs`) and the Nano account binding helpers (`build-nano-account-binding.mjs`) live there too; the relay policy imports the same trust computation, so `common/task-board/` must stay free of package imports. Tests: `test/task-board.*.test.mjs`. They run without a database: `npx mocha test/task-board.*.test.mjs`.
- `src/core/task-board/` holds the relay subscription and publishing (SimplePool). `src/core/nostr-identity/` holds the signer: a NIP-07 extension, else a key kept in localStorage.
- `src/views/components/task-board/` holds the board, task, account and file-a-task views, shared by the portal pages (`/roadmap`, `/task/<id>`, `/roadmap/account`, `/roadmap/new`) and the standalone client (`#/`, `#/task/<id>`, `#/account`, `#/new`). Actions show only once the visitor has a key from the account page.
- **Standalone client:** `src/task-board-client.js` builds to one reproducible `build/task-board-client/index.html` (`yarn build:task-board-client`). It routes on the URL fragment and makes no `/api` calls. `scripts/publish-task-board-client.mjs` releases it to Blossom as a NIP-5A site.
- **Board override:** `?board=<owner npub>[:<d>]&relays=<urls>` overrides the board and relays, in the query string or the fragment.
- **Relay:** strfry at `wss://relay.nano.community`. Its write policy is `server/strfry/task-board-write-policy.mjs` with `libs-server/task-board-relay-policy.mjs`. Host provisioning lives in the bootstrap repo.
- **Node scripts** that use the nostr-tools pool must call `useWebSocketImplementation(WebSocket)` from `ws`. Node 22's built-in WebSocket overflows the stack inside nostr-tools when a relay connection fails.

## Account Labels

Every alias and tag shown for an account is resolved from label claims. `libs-server/account-labels/` holds the subsystem.

- **Claims:** unsigned claims live in `account_labels`, one row per account, source, type and value. Signed claims stay in `nano_community_messages` and are read by `load-signed-message-claims.mjs`.
- **Resolve:** `resolve-account-labels.mjs` is a pure reducer. The alias is the highest-trust unexpired claim, by `ACCOUNT_LABEL_SOURCE_TRUST` in `constants.mjs`. Tags must be in `ACCOUNT_TAG_VOCABULARY`.
- **Materialize:** `materialize_account_labels` is the only writer of `accounts.alias` and `accounts_tags`. Never write either directly; add a claim and materialize the account.
- **Sync:** `scripts/sync-account-labels.mjs` runs daily from `server/server-crontab`. It fetches nano.to and nanolooker, upserts their claims and removes claims a source no longer lists. A failed or empty fetch keeps that source's claims.
- **API:** `GET /api/accounts/:address` includes `tags`. `GET /api/account-labels?name=` finds accounts whose alias or any live alias claim starts with the name. `POST /api/account-labels/resolve` takes `{ addresses }` and returns each address's alias and tags.

## Network Events

`/network-events` is a dated feed of representative network events. The store is `network_events` in `db/schema.postgres.sql`.

- **Registry:** `common/network-event-types.mjs` defines each type: label, kind (condition or occurrence), default severity, `public` and the identity keys. It also holds the thresholds. It is shared with the client, so it takes no node-only imports. Add a type only in the change that produces it.
- **Phases:** conditions emit `began` and `ended`, and occurrences emit `occurred`. `network_event_id` is a sha256 over the type, phase and identity keys, so a replayed event dedupes. An `ended` row reuses its `began` keys.
- **Condition id:** `network_event_condition_id` is the `network_event_id` of a condition's `began` row, on both its rows, and null on occurrences. A condition is open while no `ended` row shares it. A condition ends only when its detector observes it clear, so a representative missing from telemetry keeps its conditions open as last known. A detector-state reset re-emits `first_observation` began rows with a new `began_at`, which opens a second episode beside the old one, so close the old episodes before a reset.
- **Delivery sequence:** `network_event_sequence` is a consumer cursor in commit order. A trigger assigns it under one advisory lock held to commit, for every writer, so a consumer reading by `after` loses nothing. It has gaps (an ON CONFLICT drop burns a value) and never runs out of order. Rows are immutable: an UPDATE raises, and DELETE is allowed.
- **Coverage:** `network_event_coverage` records, per producer, the `observed_at` ranges whose events are fully written. It shares the sequence generator. The telemetry detector writes one window per evaluated snapshot, from the snapshot before its window start (exclusive) to its window start, so a skipped window leaves a gap. The RPC probe writes none, because its type is operator-only.
- **Writer:** `libs-server/network-events/insert-network-events.mjs` validates against the registry. It writes detector state (`network_event_detector_state`), the watermark, the events and the coverage windows in one transaction, in that order, so the sequence lock is taken last. It sets a `lock_timeout` so a stuck writer fails instead of stalling the others. Never insert into `network_events` directly.
- **Producers** (cron in `server/server-crontab`):
  - `scripts/detect-telemetry-network-events.mjs` runs every 5 minutes, 2 minutes after the telemetry import. It reads `representatives_telemetry` after its `etl_state` watermark and emits peer-address, node, version and cemented-behind events. A field counts only once it is settled, meaning one value in every snapshot of the 60-minute window. The first run seeds state and marks present conditions `first_observation`.
  - `scripts/probe-representative-rpc.mjs` runs hourly. It calls `version` and `work_peers` on port 7076 of each rep's settled addresses and emits `representative_rpc_control_enabled`. Both scripts take `--dry-run`.
- **Reads:** `GET /api/network/events` pages by `after=<sequence>` (ascending) or `before=<sequence>` (descending), newest first with neither; a consumer's next cursor is its last row's `network_event_sequence`. `GET /api/network/conditions` returns `{ network_conditions, producer_coverage }`: the open public conditions, optionally for one `representative_account`, and each producer's latest `coverage_ended_at`. Both cache for 60 seconds.
- **Operator-only:** a type with `public: false` stays in the database. Every route selects only public types. Any public dump must exclude the operator-only rows.
- **Archive:** `scripts/archive-to-postgres.mjs --delta` copies `network_events` by `network_event_sequence` and `network_event_coverage` by `network_event_coverage_sequence`. The archive mirrors them without the triggers.
- **Alerts tab:** it shares `common/representative-alert-rules.mjs` with the detector, so "cemented behind" has one definition.
- **Tests:** `test/network-event*.test.mjs` and `test/archive-to-postgres.pg-escape.test.mjs`.

## Representative Power Readings

The homepage "Energy a day" figure, the representatives table's Power column and the hardware data view all come from inputs each representative's operator signs. The methodology page is `docs/network-energy-usage.md`.

- **Measured reading:** `set_representative_power_reading` with exactly `energy_watt_hours` (a positive integer: the signed-message format carries only safe integers), `measurement_method` (`wall_meter` or `baseboard_management_controller`), and `measurement_started_at`/`measurement_ended_at` in epoch seconds, at least 24 hours apart and ending by `issued_at`. CLI: `update-representative-power-reading`. Validation: `libs-server/parse-representative-power-reading.mjs`.
- **Hardware report:** `set_representative_hardware` with exactly `cpu_model`, `logical_cpus`, `memory_bytes`, `storage` (`[{kind: ssd|hdd, bytes}]`), `virtualization`, `cpu_utilization_basis_points`, `utilization_window_seconds` (at least 24 hours) and `node_cpu_utilization_basis_points` (or null). CLI: `report-representative-hardware`, which collects them on the host through `cli/collect-host-hardware.mjs`. Validation: `libs-server/parse-representative-hardware.mjs`.
- **Both:** validated in `api/routes/auth/message.mjs` before the insert, and signed for an account with `accounts.representative = true`, else a 400 and no row. The message in `nano_community_messages` is the record: no projection, nothing applies it. No age cutoff and no plausibility ceiling: an operator corrects an input by signing a newer one.
- **Read path:** `libs-server/load-representative-power-inputs.mjs` picks each account's latest reading (by `measurement_ended_at`, then `issued_at`, then digest) and latest hardware report (by `issued_at`, then digest), resolving the signer through `resolve-signer-account.mjs`. `loadRepresentatives` attaches them as `power_reading` and `hardware_report`, or null.
- **Estimate:** `common/representative-hardware-power.mjs` holds the Cloud Carbon Footprint per-vCPU coefficients (vendored, Apache-2.0) and the CPU-name-to-generation rules. A CPU it cannot place gives no estimate: never substitute an average, a provider default or a typical node.
- **Per-rep power:** `get_representative_power` in `common/representative-power.mjs` returns the reading, else the hardware estimate, else `accounts.watt_hour` labeled as a CPU TDP specification, else null. The `getNetworkWattHour` selector, the `watt_hour` table column and the data-view field all call it. `accounts.watt_hour` is hand-entered and nothing writes it. The `watt_hour` key and selector name are kept, but the values are watts.
- **Figure:** `getNetworkWattHour` sums over online principal representatives and returns the reporting, measured, estimated and principal representative counts and the oldest input's date.
- **Tests:** `test/representative-power-readings.test.mjs`, `test/representative-power.test.mjs`, `test/representative-hardware-power.test.mjs` and `test/cli.collect-host-hardware.test.mjs`.

## Configuration

`config.js` is environment-aware. In production it decrypts secrets from `config.production.json` at load time by shelling out to `sops` (age envelope encryption; recipient policy in `.sops.yaml`, private identity host-only at `~/.config/sops/age/keys.txt`) — fail-closed, with no plaintext fallback. Each production host has its own gitignored `config.production.json` holding only the stanzas it uses, sealed to that host's recipient alone. The VPS holds the app's. base-storage holds `production_postgres`, `vps_postgres`, `archive_postgres` and `reddit`, with database passwords in its `~/.pgpass`. `.sops.yaml` explains how to author each. Test and development load plaintext `config.${env}.js` unchanged. `config.sample.js` shows the structure (JWT secret, DB credentials, Cloudflare token, GitHub token). To add or edit a production secret, follow [[user:guideline/homelab/sops-age-authoring.md]].

## Conventions

- ESM throughout; `#libs-server/*` import aliases.
- Node 22 LTS target; SlowBuffer polyfill needed for Node 25.
- The site menu (`src/views/components/menu/`) renders once in the app shell; a page places its inline wordmark, search and sections with `PageNavigation`.
- A react-table page wraps `<Table>` in `.page-table__container` (`src/styles/table.styl`), the full-screen both-axes scroll box league uses. react-table attaches row loading and pinned-column sizing to that container, and an unbounded table widens the mobile layout viewport and pushes the fixed menu trigger off screen.
