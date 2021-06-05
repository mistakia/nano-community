module.exports = {
  discordAuthorization: '', // user authorization header bearer token
  twitterAuthorization: '', // twitter auth bearer token

  port: 8080, // api port

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
      max: 10
    }
  },

  rpcAddress: 'https://proxy.powernode.cc/proxy',
  rpcAddresses: [
    'https://www.nanolooker.com/api/rpc',
    'https://rpc.wenano.net/api/node-api',
    'https://app.natrium.io/api',
    'https://nano-rpc.trustwalletapp.com/',
    'https://vault.nanocrawler.cc/api/node-api/',
    'https://node.shrynode.me/api',
    'https://rpc.nanoprofile.online',
    'https://voxpopuli.network/api',
    'https://mynano.ninja/api/node',
    'https://nault.nanos.cc/proxy',
    'https://proxy.powernode.cc/proxy',
    'https://rainstorm.city/api',
    'http://88.198.195.183:7076',
    'https://api.nanex.cc',
    'https://vault.nanocrawler.cc/api/node-api',
    'https://node.somenano.com/proxy'
  ]
}
