/* global describe before after it */
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import zlib from 'zlib'
import chai from 'chai'
import chaiHTTP from 'chai-http'
import express from 'express'

import serve_client from '#api/serve-client.mjs'

chai.use(chaiHTTP)
const expect = chai.expect

const ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const DOCUMENT_CACHE_CONTROL = 'public, max-age=0, must-revalidate'
const ASSET_JS = 'console.log("main")\n'.repeat(100)
const HOME_HTML = '<!doctype html><title>home</title>'
const DOC_HTML = '<!doctype html><title>doc</title>'
const SHELL_HTML = '<!doctype html><title>shell</title>'

// Responses keep the raw bytes, so the encoding under test is visible.
const raw_body = (res, callback) => {
  const chunks = []
  res.on('data', (chunk) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

describe('serve_client', () => {
  let build_path
  let app

  const write = async (relative, content) => {
    const file = path.join(build_path, relative)
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, content)
  }

  const get = (url) => chai.request(app).get(url).buffer(true).parse(raw_body)

  before(async () => {
    build_path = await fs.mkdtemp(path.join(os.tmpdir(), 'serve-client-'))
    await write('index.html', HOME_HTML)
    await write('design/basics/index.html', DOC_HTML)
    await write('404.html', SHELL_HTML)
    await write('sitemap.xml', '<urlset/>')
    await write('assets/main.0123456789abcdef0123.js', ASSET_JS)
    await write(
      'assets/main.0123456789abcdef0123.js.br',
      zlib.brotliCompressSync(ASSET_JS)
    )
    await write(
      'assets/main.0123456789abcdef0123.js.gz',
      zlib.gzipSync(ASSET_JS)
    )
    await write(
      'design/basics/index.html.br',
      zlib.brotliCompressSync(DOC_HTML)
    )
    app = express()
    app.use(serve_client({ build_path }))
  })

  after(async () => {
    await fs.rm(build_path, { recursive: true, force: true })
  })

  describe('cache classes', () => {
    it('sends assets as immutable', async () => {
      const res = await get('/assets/main.0123456789abcdef0123.js')
      expect(res).to.have.status(200)
      expect(res).to.have.header('cache-control', ASSET_CACHE_CONTROL)
      expect(res).to.not.have.header('cdn-cache-control')
      expect(res).to.have.header('content-type', /application\/javascript/)
      expect(res).to.have.header('etag')
    })

    it('sends documents revalidated, with a five-minute edge TTL', async () => {
      const res = await get('/')
      expect(res).to.have.status(200)
      expect(res).to.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
      expect(res).to.have.header('cdn-cache-control', 'max-age=300')
      expect(res).to.have.header('content-type', /text\/html/)
      expect(res).to.have.header('etag')
      expect(res).to.have.header('last-modified')
      expect(res).to.not.have.header('set-cookie')
      expect(res.body.toString()).to.equal(HOME_HTML)
    })

    it('sends other build files in the document class', async () => {
      const res = await get('/sitemap.xml')
      expect(res).to.have.status(200)
      expect(res).to.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
      expect(res).to.have.header('content-type', /xml/)
    })
  })

  describe('encoding negotiation', () => {
    const asset = '/assets/main.0123456789abcdef0123.js'

    it('prefers brotli', async () => {
      const res = await get(asset).set('Accept-Encoding', 'gzip, deflate, br')
      expect(res).to.have.header('content-encoding', 'br')
      expect(res).to.have.header('vary', 'Accept-Encoding')
      expect(res).to.have.header('content-type', /application\/javascript/)
      expect(zlib.brotliDecompressSync(res.body).toString()).to.equal(ASSET_JS)
    })

    it('falls back to gzip', async () => {
      const res = await get(asset).set('Accept-Encoding', 'gzip')
      expect(res).to.have.header('content-encoding', 'gzip')
      // superagent gunzips the body before it reaches the parser
      expect(res.body.toString()).to.equal(ASSET_JS)
    })

    it('skips an encoding refused with q=0', async () => {
      const res = await get(asset).set('Accept-Encoding', 'br;q=0, gzip')
      expect(res).to.have.header('content-encoding', 'gzip')
    })

    it('sends identity when no encoding is accepted', async () => {
      const res = await get(asset).set('Accept-Encoding', 'identity')
      expect(res).to.not.have.header('content-encoding')
      expect(res).to.have.header('vary', 'Accept-Encoding')
      expect(res.body.toString()).to.equal(ASSET_JS)
    })

    it('sends identity when the encoded sibling is missing', async () => {
      const res = await get('/').set('Accept-Encoding', 'br, gzip')
      expect(res).to.not.have.header('content-encoding')
      expect(res.body.toString()).to.equal(HOME_HTML)
    })
  })

  it('answers a matching If-None-Match with 304', async () => {
    const first = await get('/design/basics').set('Accept-Encoding', 'br')
    const etag = first.headers.etag
    expect(etag).to.be.a('string')
    const res = await get('/design/basics')
      .set('Accept-Encoding', 'br')
      .set('If-None-Match', etag)
    expect(res).to.have.status(304)
    expect(res).to.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
  })

  describe('resolution', () => {
    it('returns 404 no-store for an asset miss, never the shell', async () => {
      const res = await get('/assets/missing.0123456789abcdef0123.js')
      expect(res).to.have.status(404)
      expect(res).to.have.header('cache-control', 'no-store')
      expect(res.body.toString()).to.not.equal(SHELL_HTML)
    })

    it('returns the shell with 200 for an extensionless miss', async () => {
      const res = await get('/nano_3' + '1'.repeat(59))
      expect(res).to.have.status(200)
      expect(res).to.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
      expect(res.body.toString()).to.equal(SHELL_HTML)
    })

    it('returns 404 no-store for an extensioned miss outside assets', async () => {
      const res = await get('/missing.png')
      expect(res).to.have.status(404)
      expect(res).to.have.header('cache-control', 'no-store')
    })

    it('ignores the query string', async () => {
      const res = await get('/design/basics?utm_source=x.js')
      expect(res).to.have.status(200)
      expect(res.body.toString()).to.equal(DOC_HTML)
    })

    it('resolves a trailing-slash path to its page', async () => {
      const res = await get('/design/basics/')
      expect(res).to.have.status(200)
      expect(res.body.toString()).to.equal(DOC_HTML)
    })

    it('refuses .. traversal', async () => {
      const res = await get('/assets/%2e%2e/%2e%2e/etc/passwd')
      expect(res).to.have.status(403)
    })

    it('drops the immutable class on a send error', async () => {
      const res = await get('/assets/main.0123456789abcdef0123.js')
        .set('Accept-Encoding', 'identity')
        .set('Range', 'bytes=999999-')
      expect(res).to.have.status(416)
      expect(res).to.have.header('cache-control', 'no-store')
    })

    it('answers HEAD without a body', async () => {
      const res = await chai.request(app).head('/design/basics')
      expect(res).to.have.status(200)
      expect(res).to.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
    })

    it('passes other methods on', async () => {
      const res = await chai.request(app).post('/design/basics')
      expect(res).to.have.status(404)
      expect(res).to.not.have.header('cache-control', DOCUMENT_CACHE_CONTROL)
    })
  })
})
