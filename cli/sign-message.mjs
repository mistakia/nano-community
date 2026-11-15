import crypto from 'crypto'

import * as ed25519 from './vendor/noble-ed25519.mjs'

// Signs a payload in the canonical Nano signed-message format
// (https://github.com/mistakia/nano-signed-message, direct mode): the
// prefixed RFC 8785 JSON of the payload, its blake2b-256 digest, and an
// ed25519-blake2b signature of the digest. Carried here so the published CLI
// has no dependencies. test/cli.sign-message.test.mjs holds it to the
// nano-signed-message test vectors.

// Nano's ed25519-blake2b is RFC 8032 Ed25519 with BLAKE2b-512 in place of
// SHA-512. Node's OpenSSL computes it, so the hash that derives the key and
// the signing nonce is not hand-written.
ed25519.hashes.sha512 = (bytes) =>
  new Uint8Array(crypto.createHash('blake2b512').update(bytes).digest())

// BLAKE2b with a digest of 1 to 64 bytes and no key (RFC 7693). OpenSSL's
// blake2b512 takes no digest length, and the length is part of the
// parameter block, so the 32-byte message digest and the 5-byte account
// checksum need their own.
const MASK_64 = (1n << 64n) - 1n
const BLAKE2B_IV = [
  0x6a09e667f3bcc908n,
  0xbb67ae8584caa73bn,
  0x3c6ef372fe94f82bn,
  0xa54ff53a5f1d36f1n,
  0x510e527fade682d1n,
  0x9b05688c2b3e6c1fn,
  0x1f83d9abfb41bd6bn,
  0x5be0cd19137e2179n
]
const BLAKE2B_SIGMA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
  [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
  [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
  [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
  [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
  [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
  [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
  [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
]

const rotr_64 = (x, n) => ((x >> n) | (x << (64n - n))) & MASK_64

function blake2b_compress({ h, block, bytes_so_far, is_last = false }) {
  const m = Array.from({ length: 16 }, (_, i) => block.readBigUInt64LE(i * 8))
  const v = [...h, ...BLAKE2B_IV]
  v[12] ^= BigInt(bytes_so_far) & MASK_64
  v[13] ^= BigInt(bytes_so_far) >> 64n
  if (is_last) v[14] ^= MASK_64

  const g = (a, b, c, d, x, y) => {
    v[a] = (v[a] + v[b] + x) & MASK_64
    v[d] = rotr_64(v[d] ^ v[a], 32n)
    v[c] = (v[c] + v[d]) & MASK_64
    v[b] = rotr_64(v[b] ^ v[c], 24n)
    v[a] = (v[a] + v[b] + y) & MASK_64
    v[d] = rotr_64(v[d] ^ v[a], 16n)
    v[c] = (v[c] + v[d]) & MASK_64
    v[b] = rotr_64(v[b] ^ v[c], 63n)
  }
  for (let round = 0; round < 12; round++) {
    const s = BLAKE2B_SIGMA[round % 10]
    g(0, 4, 8, 12, m[s[0]], m[s[1]])
    g(1, 5, 9, 13, m[s[2]], m[s[3]])
    g(2, 6, 10, 14, m[s[4]], m[s[5]])
    g(3, 7, 11, 15, m[s[6]], m[s[7]])
    g(0, 5, 10, 15, m[s[8]], m[s[9]])
    g(1, 6, 11, 12, m[s[10]], m[s[11]])
    g(2, 7, 8, 13, m[s[12]], m[s[13]])
    g(3, 4, 9, 14, m[s[14]], m[s[15]])
  }
  for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8]
}

export function blake2b({ input, digest_length }) {
  if (
    !Number.isInteger(digest_length) ||
    digest_length < 1 ||
    digest_length > 64
  ) {
    throw new RangeError('blake2b digest length must be 1 to 64 bytes')
  }
  const data = Buffer.from(input)
  const h = [...BLAKE2B_IV]
  h[0] ^= 0x01010000n ^ BigInt(digest_length)

  // Every block but the last compresses as not final; empty input is one
  // zero block
  const block_count = Math.max(1, Math.ceil(data.length / 128))
  for (let i = 0; i < block_count - 1; i++) {
    blake2b_compress({
      h,
      block: data.subarray(i * 128, (i + 1) * 128),
      bytes_so_far: (i + 1) * 128
    })
  }
  const last = Buffer.alloc(128)
  data.copy(last, 0, (block_count - 1) * 128)
  blake2b_compress({ h, block: last, bytes_so_far: data.length, is_last: true })

  const output = Buffer.alloc(64)
  h.forEach((word, i) => output.writeBigUInt64LE(word, i * 8))
  return new Uint8Array(output.subarray(0, digest_length))
}

// RFC 8785 JSON Canonicalization Scheme restricted to what the format allows:
// strings, safe integers, booleans, null, arrays and plain objects. Keys sort
// by UTF-16 code units, the default comparison of Array.prototype.sort.
const LONE_SURROGATE_RE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/

const serialize_string = (value) => {
  if (LONE_SURROGATE_RE.test(value)) {
    throw new TypeError('string contains a lone surrogate')
  }
  return JSON.stringify(value)
}

export function canonicalize_json(value) {
  if (value === null) return 'null'
  switch (typeof value) {
    case 'string':
      return serialize_string(value)
    case 'number':
      if (!Number.isSafeInteger(value)) {
        throw new TypeError(`number ${value} is not a safe integer`)
      }
      return String(value)
    case 'boolean':
      return value ? 'true' : 'false'
    case 'object':
      break
    default:
      throw new TypeError(`unsupported value type ${typeof value}`)
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize_json).join(',')}]`
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('unsupported object type')
  }
  const members = Object.keys(value)
    .sort()
    .map((key) => {
      if (value[key] === undefined) {
        throw new TypeError(`member ${key} is undefined`)
      }
      return `${serialize_string(key)}:${canonicalize_json(value[key])}`
    })
  return `{${members.join(',')}}`
}

const NANO_ALPHABET = '13456789abcdefghijkmnopqrstuwxyz'

const encode_nano_base32 = (bytes) => {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xfff
    bits += 8
    while (bits >= 5) {
      output += NANO_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return output
}

// A 32-byte public key as its nano_ address: 4 zero bits pad the key to 260
// bits, 52 characters, then 8 characters of the reversed blake2b-40 checksum
export function encode_nano_account(public_key) {
  const padded = encode_nano_base32(
    Buffer.concat([Buffer.alloc(3), Buffer.from(public_key)])
  ).slice(4)
  const checksum = blake2b({ input: public_key, digest_length: 5 }).reverse()
  return `nano_${padded}${encode_nano_base32(checksum)}`
}

const PRIVATE_KEY_RE = /^[0-9a-fA-F]{64}$/

const private_key_bytes = (private_key) => {
  if (typeof private_key !== 'string' || !PRIVATE_KEY_RE.test(private_key)) {
    throw new TypeError('the private key must be 64 hex characters')
  }
  return Uint8Array.from(Buffer.from(private_key, 'hex'))
}

// The hex public key of a hex private key
export function get_public_key(private_key) {
  return Buffer.from(
    ed25519.getPublicKey(private_key_bytes(private_key))
  ).toString('hex')
}

const SIGNED_MESSAGE_PREFIX = 'Nano Signed Message:\n'

// The message digest: blake2b-256 of the prefixed canonical message
export function hash_signed_message(message) {
  return blake2b({
    input: Buffer.from(SIGNED_MESSAGE_PREFIX + message, 'utf8'),
    digest_length: 32
  })
}

// Returns the wire unit, { message, signature }. The payload's account is
// the private key's, so a payload cannot name an account it does not sign for.
export function sign_message({ payload, private_key }) {
  const key = private_key_bytes(private_key)
  const account = encode_nano_account(ed25519.getPublicKey(key))
  if (payload.account !== account) {
    throw new Error('payload.account does not match the private key')
  }
  const message = canonicalize_json(payload)
  const signature = ed25519.sign(hash_signed_message(message), key)
  return { message, signature: Buffer.from(signature).toString('hex') }
}
