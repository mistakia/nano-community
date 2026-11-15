/* global describe it */
import chai from 'chai'
import crypto from 'crypto'
import { readFileSync } from 'fs'
import * as reference from 'nano-signed-message'

import {
  blake2b,
  canonicalize_json,
  encode_nano_account,
  get_public_key,
  hash_signed_message,
  sign_message
} from '#root/cli/sign-message.mjs'

const expect = chai.expect
const hex = (bytes) => Buffer.from(bytes).toString('hex')

// The CLI carries its own signer so it installs no dependencies. It must
// produce exactly what nano-signed-message produces.
describe('CLI signer', () => {
  const { vectors } = JSON.parse(
    readFileSync(
      'node_modules/nano-signed-message/test-vectors/positive.json',
      'utf8'
    )
  )
  const direct_vectors = vectors.filter((v) => v.signing_mode === 'direct')

  it('matches every direct-mode nano-signed-message test vector', () => {
    expect(direct_vectors.length).to.be.above(0)
    for (const vector of direct_vectors) {
      expect(get_public_key(vector.private_key)).to.equal(vector.public_key)
      expect(
        encode_nano_account(Buffer.from(vector.public_key, 'hex'))
      ).to.equal(vector.account)
      expect(hex(hash_signed_message(vector.message))).to.equal(
        vector.message_digest
      )
      expect(
        sign_message({
          payload: vector.payload,
          private_key: vector.private_key
        })
      ).to.deep.equal({ message: vector.message, signature: vector.signature })
    }
  })

  it('signs random payloads exactly as nano-signed-message does', () => {
    for (let i = 0; i < 50; i++) {
      const private_key = crypto.randomBytes(32).toString('hex')
      const account = reference.encode_nano_account(
        reference.get_public_key(private_key)
      )
      // Long and multi-byte content spans several 128-byte blake2b blocks
      const payload = {
        version: 1,
        domain: 'nano.community',
        action: 'set_account_meta',
        account,
        issued_at: 1760000000 + i,
        nonce: crypto.randomBytes(16).toString('hex'),
        parameters: {
          content: { alias: `${'a'.repeat(i * 13)}é😀` },
          references: [],
          tags: []
        }
      }
      expect(sign_message({ payload, private_key })).to.deep.equal(
        reference.sign_message({ payload, private_key })
      )
    }
  })

  it('computes BLAKE2b as RFC 7693 and OpenSSL do', () => {
    // RFC 7693 Appendix A
    expect(
      hex(blake2b({ input: Buffer.from('abc'), digest_length: 64 }))
    ).to.equal(
      'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923'
    )
    for (const length of [0, 1, 127, 128, 129, 256, 1000]) {
      const data = crypto.randomBytes(length)
      expect(hex(blake2b({ input: data, digest_length: 64 }))).to.equal(
        crypto.createHash('blake2b512').update(data).digest('hex')
      )
    }
  })

  it('refuses a payload for an account the key does not sign for', () => {
    const [vector] = direct_vectors
    const other_key = crypto.randomBytes(32).toString('hex')
    expect(() =>
      sign_message({ payload: vector.payload, private_key: other_key })
    ).to.throw('does not match the private key')
  })

  it('refuses a private key that is not 64 hex characters', () => {
    for (const private_key of [
      'ab',
      `${'0'.repeat(63)}g`,
      '0'.repeat(65),
      `x${'0'.repeat(64)}`,
      ['0'.repeat(64)]
    ]) {
      expect(() => get_public_key(private_key)).to.throw('64 hex characters')
    }
  })

  it('refuses a digest length outside 1 to 64 bytes', () => {
    for (const digest_length of [0, 65, 1.5]) {
      expect(() => blake2b({ input: Buffer.alloc(1), digest_length })).to.throw(
        RangeError
      )
    }
  })

  it('canonicalizes only what the signed-message format allows', () => {
    expect(
      canonicalize_json({ b: [1, 'x'], a: { d: null, c: true } })
    ).to.equal('{"a":{"c":true,"d":null},"b":[1,"x"]}')
    expect(canonicalize_json(Object.create(null))).to.equal('{}')
    for (const value of [
      1.5,
      2 ** 53,
      '\ud800',
      { '\udc00': 1 },
      { a: undefined },
      new Date(0),
      new Map(),
      1n,
      () => 1,
      undefined
    ]) {
      expect(() => canonicalize_json(value)).to.throw(TypeError)
    }
  })
})
