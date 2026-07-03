# CLAUDE.md

Guidance for Claude Code working in this repository.

For graph context (related task dir, tags, sibling nano repos), see [ABOUT.md](ABOUT.md).

## Project Overview

[nano.community](https://nano.community) — community-driven documentation, representative monitoring, and stats aggregation site for the nano cryptocurrency. React 19 + Redux + Material-UI on the client; Express on the server. Webpack dev/prod builds; static export via react-snap.

## Build / Run

```bash
yarn install
yarn dev               # Concurrent webpack + Express
yarn build             # Production bundle + react-snap static generation
yarn test              # Mocha (TZ=America/New_York)
yarn lint
```

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
