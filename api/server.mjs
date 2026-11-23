import http from 'http'
import url, { fileURLToPath } from 'url'
import path, { dirname } from 'path'

import WebSocket from 'ws'
import express from 'express'
import morgan from 'morgan'
import morganDebug from 'morgan-debug'
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

import config from '#config'
import * as routes from '#api/routes/index.mjs'
import cache from '#api/cache.mjs'
import db from '#db'
import { setupCron } from '#api/cron.mjs'
import serve_client from '#api/serve-client.mjs'
// import sockets from './sockets'

setupCron()

const __dirname = dirname(fileURLToPath(import.meta.url))
const logger = debug('api')
const IS_DEV = process.env.NODE_ENV === 'development'
// node serves on loopback behind a Cloudflare Tunnel without trust proxy, so
// req.ip is the tunnel's loopback address; key each limiter on the visitor IP
// Cloudflare forwards instead
const visitor_key = (req) => req.headers['cf-connecting-ip'] || req.ip
const speedLimiter = slowDown({
  keyGenerator: visitor_key,
  // the auth suites send more than 50 requests in one run
  skip: () => process.env.NODE_ENV === 'test',
  windowMs: 10 * 60 * 1000, // 10 minutes
  delayAfter: 50, // allow 50 requests per 10 minutes, then...
  delayMs: (hits, req) => (hits - req.slowDown.limit) * 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000 // maximum delay of 20 seconds
})
// Separate instance for the site-events collector so its traffic never exhausts
// (or is exhausted by) the auth limiter's in-memory counter
const siteEventsLimiter = slowDown({
  keyGenerator: visitor_key,
  windowMs: 10 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits, req) => (hits - req.slowDown.limit) * 500,
  maxDelayMs: 20000
})

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
api.use(bodyParser.json())
// Only API and data responses compress per request and carry CORS. Client
// build responses are precompressed, and a reflected Access-Control-Allow-Origin
// must never reach a response Cloudflare caches.
api.use(
  ['/api', '/data'],
  compression(),
  cors({
    origin: true,
    credentials: true
  })
)

api.use(robots(path.join(__dirname, '..', 'static', 'robots.txt')))
api.use(favicon(path.join(__dirname, '..', 'static', 'favicon.ico')))
api.get('/llms.txt', (req, res) =>
  res
    .type('text/plain')
    .sendFile(path.join(__dirname, '..', 'static', 'llms.txt'))
)
api.use(['/api', '/data'], (req, res, next) => {
  res.set('Cache-Control', 'no-cache, must-revalidate, proxy-revalidate')
  next()
})

// Stable, externally linked URLs (social card, whitepapers, tools)
const static_path = path.join(__dirname, '..', 'static')
api.use('/static', serveStatic(static_path, { maxAge: '1d' }))

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
api.use('/api/auth', speedLimiter, routes.auth)
api.use('/api/accounts', routes.accounts)
api.use('/api/account-labels', routes.account_labels)
api.use('/api/blocks', routes.blocks)
api.use('/api/representatives', routes.representatives)
api.use('/api/weight', routes.weight)
api.use('/api/site-events', siteEventsLimiter, routes.site_events)

const docsPath = path.join(__dirname, '..', 'docs')

api.use('/api/docs', serveStatic(docsPath))
api.get('/api/docs/*', (req, res) => {
  res.status(404).send('Not found')
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
    res.redirect(307, `http://localhost:8094${req.path}`)
  })
} else {
  // An API or data request no route answered is a 404 here, never the
  // edge-cacheable app shell carrying the CORS headers set above.
  api.use(['/api', '/data'], (req, res) =>
    res.status(404).type('text/plain').send('Not found')
  )
  api.use(serve_client({ build_path: path.join(__dirname, '..', 'build') }))
}

const server = http.createServer(api)
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
