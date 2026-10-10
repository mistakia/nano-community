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
2. On host `nano.community`, fast-forward `/root/nano-community/source` to `origin/main`.
3. If `api/` or `server/` changed, run `pm2 restart server` there and confirm its uptime reset. The pm2 file watch does not reliably restart it.
4. Locally, run `yarn build` (react-snap prerender) and then `yarn deploy` (copies `build/` to the host).

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

## Configuration

`config.js` is environment-aware. In production it decrypts secrets from `config.production.json` at load time by shelling out to `sops` (age envelope encryption; recipient policy in `.sops.yaml`, private identity host-only at `~/.config/sops/age/keys.txt`) — fail-closed, with no plaintext fallback. Test and development load plaintext `config.${env}.js` unchanged. `config.sample.js` shows the structure (JWT secret, DB credentials, Cloudflare token, GitHub token). To add or edit a production secret, follow [[user:guideline/homelab/sops-age-authoring.md]].

## Conventions

- ESM throughout; `#libs-server/*` import aliases.
- MyISAM-aware key-prefix lengths in migrations (see recent CI fix).
- Node 22 LTS target; SlowBuffer polyfill needed for Node 25.
