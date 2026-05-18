module.exports = {
  discordAuthorization: '',
  twitterAuthorization: '',

  port: 8085,

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

  production_postgres: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      database: 'nano_test'
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
