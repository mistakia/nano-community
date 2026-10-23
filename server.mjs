import debug from 'debug'

import server from '#api/server.mjs'
import config from '#config'

const { port } = config
const logger = debug('server')
const IS_PROD = process.env.NODE_ENV === 'production'

if (IS_PROD) {
  debug.enable('server,api*')
} else {
  debug.enable('server,api*,knex:*')
}

const main = async () => {
  // loopback only: the public reaches the app through the Cloudflare Tunnel
  server.listen(port, '127.0.0.1', () =>
    logger(`API listening on 127.0.0.1:${port}`)
  )
}

try {
  main()
} catch (err) {
  // TODO move to stderr
  logger(err)
}
