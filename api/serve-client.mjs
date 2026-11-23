// Serves the client build: content-addressed assets as immutable, everything
// else (prerendered HTML, sitemap, favicon) as revalidated and edge-cached for
// five minutes. scripts/finalize-client-build.mjs writes .br and .gz siblings
// at build time, so nothing is compressed per request.
import { promises as fs } from 'fs'
import path from 'path'
import send from 'send'

const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const DOCUMENT_CACHE_CONTROL = 'public, max-age=0, must-revalidate'
const DOCUMENT_CDN_CACHE_CONTROL = 'max-age=300'

// Server preference order; identity is the fallback.
const ENCODINGS = [
  { name: 'br', extension: '.br' },
  { name: 'gzip', extension: '.gz' }
]

const is_file = async (file_path) => {
  try {
    return (await fs.stat(file_path)).isFile()
  } catch {
    return false
  }
}

// Codings the client accepts with a non-zero quality, honoring `*`.
const accepted_encodings = (header = '') => {
  const qualities = new Map()
  for (const part of header.split(',')) {
    const [coding, ...params] = part.trim().toLowerCase().split(';')
    if (!coding) continue
    const q_param = params.find((param) => param.trim().startsWith('q='))
    const quality = q_param ? Number(q_param.trim().slice(2)) : 1
    qualities.set(coding, Number.isNaN(quality) ? 0 : quality)
  }
  return (name) => {
    const quality = qualities.has(name)
      ? qualities.get(name)
      : qualities.get('*')
    return quality > 0
  }
}

const respond_missing = (res) =>
  res
    .status(404)
    .set('Cache-Control', 'no-store')
    .type('text/plain')
    .send('Not found')

// Maps a decoded request path to the build file that answers it, with the
// status to send, or null for a miss.
const resolve_request = async ({ build_path, request_path }) => {
  const absolute = (relative) => path.join(build_path, relative)

  if (request_path.startsWith('/assets/')) {
    return (await is_file(absolute(request_path)))
      ? { relative: request_path }
      : null
  }

  // Extensionless paths are pages: the prerendered index.html if there is
  // one, else the app shell, which renders account, block and unknown routes.
  if (request_path.endsWith('/') || !path.posix.extname(request_path)) {
    const page = path.posix.join(request_path, 'index.html')
    if (await is_file(absolute(page))) return { relative: page }
    return { relative: '/404.html' }
  }

  return (await is_file(absolute(request_path)))
    ? { relative: request_path }
    : null
}

export default function serve_client({ build_path }) {
  const root = path.resolve(build_path)

  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()

    let request_path
    try {
      request_path = decodeURIComponent(req.path)
    } catch {
      return res
        .status(400)
        .set('Cache-Control', 'no-store')
        .send('Bad request')
    }
    const segments = request_path.split('/')
    if (request_path.includes('\0') || segments.includes('..')) {
      return res.status(403).set('Cache-Control', 'no-store').send('Forbidden')
    }

    const resolved = await resolve_request({ build_path: root, request_path })
    if (!resolved) return respond_missing(res)

    const base_file = path.join(root, resolved.relative)
    const accepts = accepted_encodings(req.headers['accept-encoding'])
    let file = base_file
    for (const encoding of ENCODINGS) {
      if (!accepts(encoding.name)) continue
      if (await is_file(base_file + encoding.extension)) {
        file = base_file + encoding.extension
        res.set('Content-Encoding', encoding.name)
        break
      }
    }

    res.set('Vary', 'Accept-Encoding')
    res.type(path.extname(base_file))
    if (resolved.relative.startsWith('/assets/')) {
      res.set('Cache-Control', ASSET_CACHE_CONTROL)
    } else {
      res.set('Cache-Control', DOCUMENT_CACHE_CONTROL)
      res.set('CDN-Cache-Control', DOCUMENT_CDN_CACHE_CONTROL)
    }

    // send decodes the path it is given, so hand it the encoded relative path
    send(req, encodeURI(path.relative(root, file)), {
      root,
      cacheControl: false,
      index: false
    })
      .on('error', (error) => {
        for (const header of ['Content-Encoding', 'Vary', 'CDN-Cache-Control'])
          res.removeHeader(header)
        if (error.status === 404) return respond_missing(res)
        next(error)
      })
      .pipe(res)
  }
}
