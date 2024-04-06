module.exports = {
  discordAuthorization: '',
  twitterAuthorization: '',

  port: 8080,

  github_access_token: '',

  jwt: {
    secret: 'xxxxx',
    algorithms: ['HS256'],
    credentialsRequired: false
  },

  ssl: false,
  key: '',
  cert: '',
  url: '',

  mysql: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      user: 'root',
      database: 'nano_test',
      multipleStatements: true
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  storage_mysql: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      user: 'root',
      database: 'nano_storage_test',
      multipleStatements: true
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  nanodbAPI: '',
  nanodbAPI_experimental: '',
  trustedAddresses: [],
  rpcAddresses: [],

  cloudflare: {
    zone_id: '',
    user_email: '',
    token: ''
  }
}
