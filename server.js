const debug = require('debug')
const logger = debug('server')

const server = require('./api')
const { port } = require('./config')

const IS_DEV = process.env.NODE_ENV === 'development'
const IS_PROD = process.env.NODE_ENV === 'production'

if (IS_DEV) {
  debug.enable('server,api*,knex:*')
} else if (IS_PROD) {
  debug.enable('server,api*')
}

const main = async () => {
  server.listen(port, () => logger(`API listening on port ${port}`))
}

try {
  main()
} catch (err) {
  // TODO move to stderr
  logger(err)
}
