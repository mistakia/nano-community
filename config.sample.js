module.exports = {
  discordAuthorization: '', // user authorization header bearer token
  twitterAuthorization: '', // twitter auth bearer token

  port: 8080, // api port

  github_access_token: '',

  // jwt token config
  jwt: {
    secret: 'xxxxx',
    algorithms: ['HS256'],
    credentialsRequired: false
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

  nanodbAPI: '',
  trustedAddresses: [],
  rpcAddresses: []
}
