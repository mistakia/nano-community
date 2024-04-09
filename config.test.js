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
      multipleStatements: true,
      decimalNumbers: true,
      charset: 'utf8mb4'
    }
  },

  storage_mysql: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      user: 'root',
      database: 'nano_storage_test',
      multipleStatements: true,
      decimalNumbers: true,
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 20
    }
  },

  nanodbAPI: '',
  nanodbAPI_experimental: '',
  trustedAddresses: ['http://nano:7076'],
  rpcAddresses: ['http://nano:7076'],

  cloudflare: {
    zone_id: '',
    user_email: '',
    token: ''
  }
}
