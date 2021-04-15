module.exports = {
  discordAuthorization: '', // user authorization header bearer token
  twitterAuthorization: '', // twitter auth bearer token

  mysql: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'nano_development'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
}
