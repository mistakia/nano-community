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

`yarn test` needs PostgreSQL with TimescaleDB on 127.0.0.1, database `nano_test`, user `postgres` without a password. The port defaults to 5432 and `NANO_TEST_PG_PORT` overrides it. Drop and recreate `nano_test` before a run.

```bash
docker run -d --name nano-test-pg -e POSTGRES_DB=nano_test -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:5435:5432 timescale/timescaledb:latest-pg16
NANO_TEST_PG_PORT=5435 yarn test
```

## Deploy

1. Confirm CI (Test and CodeQL) is green on the head commit.
2. On host `nano.community`, fast-forward `/root/nano-community/source` to `origin/main`. If `yarn.lock` changed, run `yarn install` there in the same command. The pm2 file watch restarts the server on the fast-forward, and it crashes on any missing dependency until the install lands.
3. If `api/` or `server/` changed, run `pm2 restart server` there and confirm its uptime reset. The pm2 file watch does not reliably restart it.
4. Locally, run `yarn build` (react-snap prerender) and then `yarn deploy`. It mirrors `build/` to the host and deletes files the build no longer produces, so a retired prerendered page cannot keep being served.

## Architecture

```
api/                   # REST endpoints
server/                # Node backend (Express)
common/                # Shared client/server logic
db/                    # knex migrations (MySQL + PostgreSQL supported)
docs/                  # Markdown content (introduction, getting-started, design)
static/                # Assets
cli/                   # Tooling
```

Auth: JWT. Integrations: Discord, Twitter. Storage: MySQL or PostgreSQL via knex.

## Task Board (nostr)

The community task board is signed nostr events on relays. nano.community is one client of it. The protocol, with signed worked examples, is `docs/design/task-board-protocol.md`.

- `common/task-board/` holds the protocol constants, event templates and the pure view reducer (`build-task-board-state.mjs`). Every client must derive the same board from it. Tests: `test/task-board.*.test.mjs`. They run without a database: `npx mocha test/task-board.*.test.mjs`.
- `src/core/task-board/` holds the relay subscription and publishing (SimplePool). `src/core/nostr-identity/` holds the signer: a NIP-07 extension, else a key kept in localStorage.
- `src/views/components/task-board/` holds the board, task, account and file-a-task views, shared by the portal pages (`/roadmap`, `/task/<id>`, `/roadmap/account`, `/roadmap/new`) and the standalone client (`#/`, `#/task/<id>`, `#/account`, `#/new`). Actions show only once the visitor has a key from the account page.
- **Standalone client:** `src/task-board-client.js` builds to one reproducible `build/task-board-client/index.html` (`yarn build:task-board-client`). It routes on the URL fragment and makes no `/api` calls. `scripts/publish-task-board-client.mjs` releases it to Blossom as a NIP-5A site.
- **Board override:** `?board=<owner npub>[:<d>]&relays=<urls>` overrides the board and relays, in the query string or the fragment.
- **Relay:** strfry at `wss://relay.nano.community`. Its write policy is `server/strfry/task-board-write-policy.mjs` with `libs-server/task-board-relay-policy.mjs`. Host provisioning lives in the bootstrap repo.
- **Node scripts** that use the nostr-tools pool must call `useWebSocketImplementation(WebSocket)` from `ws`. Node 22's built-in WebSocket overflows the stack inside nostr-tools when a relay connection fails.

## Configuration

`config.js` is environment-aware. In production it decrypts secrets from `config.production.json` at load time by shelling out to `sops` (age envelope encryption; recipient policy in `.sops.yaml`, private identity host-only at `~/.config/sops/age/keys.txt`) — fail-closed, with no plaintext fallback. Test and development load plaintext `config.${env}.js` unchanged. `config.sample.js` shows the structure (JWT secret, DB credentials, Cloudflare token, GitHub token). To add or edit a production secret, follow [[user:guideline/homelab/sops-age-authoring.md]].

## Conventions

- ESM throughout; `#libs-server/*` import aliases.
- MyISAM-aware key-prefix lengths in migrations (see recent CI fix).
- Node 22 LTS target; SlowBuffer polyfill needed for Node 25.
