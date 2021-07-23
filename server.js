const debug = require('debug')
const logger = debug('server')

const server = require('./api')
const { port } = require('./config')

debug.enable('server')

const main = async () => {
  server.listen(port, () => logger(`API listening on port ${port}`))
}

try {
  main()
} catch (err) {
  // TODO move to stderr
  logger(err)
}
