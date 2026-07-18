module.exports = {
  discord_authorization: '', // user authorization header bearer token
  twitter_authorization: '', // twitter auth bearer token

  port: 8085, // api port

  github_access_token: '',

  // jwt token config
  jwt: {
    secret: 'xxxxx',
    algorithms: ['HS256'],
    credentials_required: false
  },

  ssl: false, // enable ssl, make sure key & cert exist
  key: '', // ssl key
  cert: '', // ssl cert
  url: '', // url

  // VPS production database -- consumed by db/index.mjs (the app's single
  // Knex instance) and scripts/vps-to-postgres.mjs (one-shot bulk migrator).
  production_postgres: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      user: 'nano_production_app',
      password: '',
      database: 'nano_production'
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  // Storage-side: VPS PG via the autossh tunnel (nano-community-vps-pg-tunnel
  // forwards localhost:15432 -> nano.community:5432). Read-only role; consumed
  // by scripts/archive-to-postgres.mjs delta-mode after VPS cutover.
  vps_postgres: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 15432,
      user: 'nano_production_reader',
      password: '',
      database: 'nano_production'
    }
  },

  // Archive PG on database-server (see schema.archive.postgres.sql). Consumed
  // by scripts/archive-to-postgres.mjs writer and bin/verify-common.mjs.
  archive_postgres: {
    client: 'pg',
    connection: {
      host: 'database',
      port: 5432,
      user: 'nano_archive_writer',
      password: '',
      database: 'nano_community_archive'
    }
  },

  // Reddit app-only OAuth (client_credentials) for scripts/import-subreddit.mjs.
  // In production on the storage host these are decrypted lazily from the
  // host-local sops/age file config.reddit.sops.json; this stanza is the shape
  // reference and a dev override. user_agent must be unique + descriptive per
  // Reddit's format: platform:app-id:version (by /u/username).
  reddit: {
    client_id: '',
    client_secret: '',
    user_agent: 'linux:nano.community-subreddit-import:v1 (by /u/username)'
  },

  nanodb_api: '',
  nanodb_api_experimental: '',
  trusted_addresses: [],
  rpc_addresses: [],

  cloudflare: {
    zone_id: '',
    user_email: '',
    token: ''
  }
}
