module.exports = {
  discord_authorization: '', // user authorization header bearer token
  twitter_authorization: '', // twitter auth bearer token

  port: 8080, // api port

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

  mysql: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nano_development',
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  storage_mysql: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nano_development',
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 20
    }
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
