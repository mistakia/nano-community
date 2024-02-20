import https from 'https'
import http from 'http'
import fs, { promises as fsPromise } from 'fs'
import url, { fileURLToPath } from 'url'
import path, { dirname } from 'path'

import WebSocket from 'ws'
import express from 'express'
import morgan from 'morgan'
import morganDebug from 'morgan-debug'
import extend from 'deep-extend'
import bodyParser from 'body-parser'
import jwt from 'jsonwebtoken'
import { expressjwt } from 'express-jwt'
import compression from 'compression'
import debug from 'debug'
import serveStatic from 'serve-static'
import cors from 'cors'
import favicon from 'express-favicon'
import robots from 'express-robots-txt'
import { slowDown } from 'express-slow-down'

import * as config from '#config'
import * as routes from '#api/routes/index.mjs'
import cache from '#api/cache.mjs'
import db from '#db'
import { setupCron } from '#api/cron.mjs'
// import sockets from './sockets'

setupCron()

const __dirname = dirname(fileURLToPath(import.meta.url))
const logger = debug('api')
const defaults = {}
const options = extend(defaults, config)
const IS_DEV = process.env.NODE_ENV === 'development'

const api = express()

api.locals.db = db
api.locals.logger = logger
api.locals.cache = cache

morgan.token(
  'remote-addr',
  (req, res) =>
    req.headers['cf-connecting-ip'] ||
    req.ip ||
    (req.connection && req.connection.remoteAddress)
)
api.use(morganDebug('api', 'combined'))

api.enable('etag')
api.disable('x-powered-by')
api.use(compression())
api.use(bodyParser.json())
api.use(
  cors({
    origin: true,
    credentials: true
  })
)

api.use(robots(path.join(__dirname, '..', 'resources', 'robots.txt')))
api.use(favicon(path.join(__dirname, '..', 'resources', 'favicon.ico')))
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, proxy-revalidate')
  next()
})

const resourcesPath = path.join(__dirname, '..', 'resources')
api.use('/resources', serveStatic(resourcesPath))

const localesPath = path.join(__dirname, '..', 'locales')
api.use('/locales', serveStatic(localesPath))

const dataPath = path.join(__dirname, '..', 'data')
api.use('/data', serveStatic(dataPath))

api.use('/api/*', expressjwt(config.jwt), (err, req, res, next) => {
  res.set('Expires', '0')
  res.set('Pragma', 'no-cache')
  res.set('Surrogate-Control', 'no-store')
  if (err.code === 'invalid_token') return next()
  return next(err)
})

// unprotected api routes
api.use('/api/node', routes.node)
api.use('/api/nanodb', routes.nanodb)
api.use('/api/nanodb-experimental', routes.nanodb_experimental)
api.use('/api/posts', routes.posts)
api.use('/api/network', routes.network)
api.use('/api/github', routes.github)
api.use('/api/auth', routes.auth)
api.use('/api/accounts', routes.accounts)
api.use('/api/blocks', routes.blocks)
api.use('/api/representatives', routes.representatives)
api.use('/api/weight', routes.weight)

const docsPath = path.join(__dirname, '..', 'docs')

const speedLimiter = slowDown({
  windowMs: 10 * 60 * 1000, // 10 minutes
  delayAfter: 50, // allow 50 requests per 10 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 50:
  maxDelayMs: 20000 // maximum delay of 20 seconds
})

api.use('/api/docs', speedLimiter, serveStatic(docsPath))
api.use('/api/docs/en', speedLimiter, serveStatic(docsPath))
api.get('/api/docs/:locale/*', speedLimiter, async (req, res) => {
  const { locale } = req.params
  const doc_id = req.params[0] // Capture the rest of the path as doc_id
  const localized_doc_path = path.join(docsPath, locale, `${doc_id}.md`)
  const default_doc_path = path.join(docsPath, 'en', `${doc_id}.md`)

  // check if paths are under the docs directory
  if (
    !localized_doc_path.startsWith(docsPath) ||
    !default_doc_path.startsWith(docsPath)
  ) {
    return res.status(403).send('Forbidden')
  }

  try {
    if (
      await fs.promises
        .access(localized_doc_path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      return res.sendFile(localized_doc_path)
    } else if (
      await fs.promises
        .access(default_doc_path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
    ) {
      return res.redirect(`/api/docs/en/${doc_id}`)
    } else {
      return res.status(404).send('Document not found')
    }
  } catch (error) {
    console.error(error)
    return res.status(500).send('Internal Server Error')
  }
})

api.use('/api/*', (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).send({ error: 'invalid token' })
  }
  next()
})

// protected api routes

if (IS_DEV) {
  api.get('*', (req, res) => {
    res.redirect(307, `http://localhost:8081${req.path}`)
  })
} else {
  const buildPath = path.join(__dirname, '..', 'build')
  api.use('/', async (req, res, next) => {
    const filepath = req.url.replace(/\/$/, '')
    const filename = `${filepath}/index.html`
    const fullpath = path.join(buildPath, filename)
    try {
      const filestat = await fsPromise.stat(fullpath)
      if (filestat.isFile()) {
        return res.sendFile(fullpath, { cacheControl: false })
      }
      next()
    } catch (error) {
      logger(error)
      next()
    }
  })
  api.use('/', serveStatic(buildPath))
  api.get('*', (req, res) => {
    const notFoundPath = path.join(__dirname, '../', 'build', '404.html')
    res.sendFile(notFoundPath, { cacheControl: false })
  })

  // redirect to ipfs page
  // res.redirect(307, `${config.url}${req.path}`)
}

const createServer = () => {
  if (!options.ssl) {
    return http.createServer(api)
  }

  const sslOptions = {
    key: fs.readFileSync(config.key),
    cert: fs.readFileSync(config.cert)
  }
  return https.createServer(sslOptions, api)
}

const server = createServer()
const wss = new WebSocket.Server({ noServer: true })

server.on('upgrade', async (request, socket, head) => {
  const parsed = new url.URL(request.url, config.url)
  try {
    const token = parsed.searchParams.get('token')
    const decoded = await jwt.verify(token, config.jwt.secret)
    request.user = decoded
  } catch (error) {
    logger(error)
    return socket.destroy()
  }

  wss.handleUpgrade(request, socket, head, function (ws) {
    ws.userId = request.user.userId
    wss.emit('connection', ws, request)
  })
})

// sockets(wss)

export default server
