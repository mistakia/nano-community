export const discordAuthorization = '' // user authorization header bearer token
export const twitterAuthorization = '' // twitter auth bearer token

export const port = 8080 // api port

export const github_access_token = ''

// jwt token config
export const jwt = {
  secret: 'xxxxx',
  algorithms: ['HS256'],
  credentialsRequired: false
}

export const ssl = false // enable ssl, make sure key & cert exist
export const key = '' // ssl key
export const cert = '' // ssl cert
export const url = '' // url

export const mysql = {
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
}

export const nanodbAPI = ''
export const trustedAddresses = []
export const rpcAddresses = []
